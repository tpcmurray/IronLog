const pool = require('../db/pool');
const { createError } = require('../middleware/errorHandler');
const { fetchLastSession, compareProgression, pickCurrentWeight } = require('./workoutController');

// Epley estimated one-rep max.
function estimated1RM(weight, reps) {
  return weight * (1 + reps / 30);
}

/**
 * Derived metrics for a single session's sets.
 * Accepts sets with weight_lbs as number or numeric string.
 */
function computeSessionMetrics(sets) {
  let totalReps = 0;
  let volume = 0;
  let topWeight = 0;
  let best1rm = 0;

  for (const s of sets) {
    const w = parseFloat(s.weight_lbs);
    const r = s.reps;
    totalReps += r;
    volume += w * r;
    if (w > topWeight) topWeight = w;
    const e = estimated1RM(w, r);
    if (e > best1rm) best1rm = e;
  }

  return {
    total_reps: totalReps,
    volume: Math.round(volume),
    top_weight: topWeight,
    est_1rm: Math.round(best1rm),
  };
}

/** Sum of reps for sets logged at exactly the given weight. */
function repsAtWeight(sets, weight) {
  return sets
    .filter((s) => parseFloat(s.weight_lbs) === weight)
    .reduce((sum, s) => sum + s.reps, 0);
}

async function listExercises(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, muscle_group, default_rest_seconds, notes FROM exercises ORDER BY name'
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function createExercise(req, res, next) {
  try {
    const { name, muscle_group, default_rest_seconds = 120, notes = null } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO exercises (name, muscle_group, default_rest_seconds, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, muscle_group, default_rest_seconds, notes`,
      [name, muscle_group, default_rest_seconds, notes]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function updateExercise(req, res, next) {
  try {
    const { id } = req.params;
    const { name, muscle_group, default_rest_seconds, notes } = req.body;

    // Build dynamic update
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (muscle_group !== undefined) { fields.push(`muscle_group = $${idx++}`); values.push(muscle_group); }
    if (default_rest_seconds !== undefined) { fields.push(`default_rest_seconds = $${idx++}`); values.push(default_rest_seconds); }
    if (notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(notes); }

    if (fields.length === 0) {
      throw createError(400, 'No fields to update', 'VALIDATION_ERROR');
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE exercises SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, muscle_group, default_rest_seconds, notes`,
      values
    );

    if (rows.length === 0) {
      throw createError(404, 'Exercise not found', 'NOT_FOUND');
    }

    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function getLastSession(req, res, next) {
  try {
    const { id } = req.params;

    // Verify exercise exists
    const { rows: exRows } = await pool.query(
      'SELECT id FROM exercises WHERE id = $1', [id]
    );
    if (exRows.length === 0) {
      throw createError(404, 'Exercise not found', 'NOT_FOUND');
    }

    const data = await fetchLastSession(pool, id, null);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function getExerciseHistory(req, res, next) {
  try {
    const { id } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    // Verify exercise exists and get info
    const { rows: exRows } = await pool.query(
      'SELECT id, name, muscle_group, default_rest_seconds FROM exercises WHERE id = $1', [id]
    );
    if (exRows.length === 0) {
      throw createError(404, 'Exercise not found', 'NOT_FOUND');
    }
    const exercise = exRows[0];

    // Get total count
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM session_exercises
       WHERE exercise_id = $1 AND status IN ('completed', 'partial')`,
      [id]
    );
    const total = countRows[0].total;

    // Get paginated sessions
    const { rows: sessions } = await pool.query(
      `SELECT se.id AS session_exercise_id, se.completed_at AS date, se.status
       FROM session_exercises se
       WHERE se.exercise_id = $1 AND se.status IN ('completed', 'partial')
       ORDER BY se.completed_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    // For each session, get its sets and compute progression
    const sessionData = [];
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const { rows: sets } = await pool.query(
        `SELECT set_number, weight_lbs, reps, rpe, rest_duration_seconds, rest_was_extended
         FROM set_logs WHERE session_exercise_id = $1 ORDER BY set_number`,
        [s.session_exercise_id]
      );

      const parsedSets = sets.map((st) => ({
        set_number: st.set_number,
        weight_lbs: parseFloat(st.weight_lbs),
        reps: st.reps,
        rpe: parseFloat(st.rpe),
        rest_duration_seconds: st.rest_duration_seconds,
        rest_was_extended: st.rest_was_extended,
      }));

      // Find the previous session (the one after this in chronological order)
      // to compute progression_status
      const { rows: prevRows } = await pool.query(
        `SELECT se.id AS session_exercise_id
         FROM session_exercises se
         WHERE se.exercise_id = $1
           AND se.status IN ('completed', 'partial')
           AND se.completed_at < $2
         ORDER BY se.completed_at DESC NULLS LAST
         LIMIT 1`,
        [id, s.date]
      );

      let progressionStatus = 'first_time';
      let repsDelta = null;
      let volumeDelta = null;
      const metrics = computeSessionMetrics(parsedSets);
      if (prevRows.length > 0) {
        const { rows: prevSets } = await pool.query(
          `SELECT set_number, weight_lbs, reps FROM set_logs
           WHERE session_exercise_id = $1 ORDER BY set_number`,
          [prevRows[0].session_exercise_id]
        );
        const progression = compareProgression(parsedSets, prevSets);
        progressionStatus = progression.status;
        const prevMetrics = computeSessionMetrics(prevSets);
        repsDelta = metrics.total_reps - prevMetrics.total_reps;
        volumeDelta = metrics.volume - prevMetrics.volume;
      }

      const mainWeight = pickCurrentWeight(parsedSets);

      sessionData.push({
        session_exercise_id: s.session_exercise_id,
        date: s.date,
        progression_status: progressionStatus,
        sets: parsedSets,
        metrics,
        main_weight: mainWeight,
        reps_at_main_weight: mainWeight != null ? repsAtWeight(parsedSets, mainWeight) : 0,
        reps_delta: repsDelta,
        volume_delta: volumeDelta,
      });
    }

    res.json({
      data: {
        exercise,
        sessions: sessionData,
        total,
        limit,
        offset,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Whole-history stats for an exercise (not paginated): a per-session series
 * for the chart, best total-reps-per-weight records, and a recent trend.
 */
async function getExerciseHistoryStats(req, res, next) {
  try {
    const { id } = req.params;

    const { rows: exRows } = await pool.query(
      'SELECT id FROM exercises WHERE id = $1', [id]
    );
    if (exRows.length === 0) {
      throw createError(404, 'Exercise not found', 'NOT_FOUND');
    }

    // All completed/partial sessions, oldest first.
    const { rows: sessions } = await pool.query(
      `SELECT se.id AS session_exercise_id, se.completed_at AS date
       FROM session_exercises se
       WHERE se.exercise_id = $1 AND se.status IN ('completed', 'partial')
       ORDER BY se.completed_at ASC NULLS LAST`,
      [id]
    );

    const seIds = sessions.map((s) => s.session_exercise_id);
    const { rows: allSets } = seIds.length > 0
      ? await pool.query(
          `SELECT session_exercise_id, weight_lbs, reps
           FROM set_logs WHERE session_exercise_id = ANY($1) ORDER BY set_number`,
          [seIds]
        )
      : { rows: [] };

    const setsBySe = {};
    for (const s of allSets) {
      if (!setsBySe[s.session_exercise_id]) setsBySe[s.session_exercise_id] = [];
      setsBySe[s.session_exercise_id].push(s);
    }

    const series = [];
    const records = {}; // weight -> { weight, best_total_reps, date, session_exercise_id }

    for (const s of sessions) {
      const sets = setsBySe[s.session_exercise_id] || [];
      if (sets.length === 0) continue;

      series.push({ date: s.date, ...computeSessionMetrics(sets) });

      const w = pickCurrentWeight(sets);
      if (w != null) {
        const reps = repsAtWeight(sets, w);
        const rec = records[w];
        if (!rec || reps > rec.best_total_reps) {
          records[w] = {
            weight: w,
            best_total_reps: reps,
            date: s.date,
            session_exercise_id: s.session_exercise_id,
          };
        }
      }
    }

    // Recent volume trend over the last up-to-4 sessions.
    let trend = null;
    if (series.length >= 2) {
      const window = Math.min(4, series.length);
      const recent = series.slice(-window);
      const first = recent[0].volume;
      const last = recent[recent.length - 1].volume;
      const changePct = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
      trend = { metric: 'volume', window, change_pct: changePct };
    }

    // Records sorted heaviest weight first.
    const currentPrs = Object.values(records).sort((a, b) => b.weight - a.weight);

    res.json({
      data: {
        series,
        records,
        current_prs: currentPrs,
        trend,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listExercises, createExercise, updateExercise, getLastSession,
  getExerciseHistory, getExerciseHistoryStats,
  computeSessionMetrics, estimated1RM,
};
