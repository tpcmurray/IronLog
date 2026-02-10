const pool = require('../db/pool');
const { createError } = require('../middleware/errorHandler');
const { fetchLastSession, compareProgression } = require('./workoutController');

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
      if (prevRows.length > 0) {
        const { rows: prevSets } = await pool.query(
          `SELECT set_number, weight_lbs, reps FROM set_logs
           WHERE session_exercise_id = $1 ORDER BY set_number`,
          [prevRows[0].session_exercise_id]
        );
        const progression = compareProgression(parsedSets, prevSets);
        progressionStatus = progression.status;
      }

      sessionData.push({
        date: s.date,
        progression_status: progressionStatus,
        sets: parsedSets,
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

module.exports = { listExercises, createExercise, updateExercise, getLastSession, getExerciseHistory };
