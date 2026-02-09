const pool = require('../db/pool');
const { createError } = require('../middleware/errorHandler');

// ── Helpers ──────────────────────────────────────────────────

/**
 * Fetch the most recent completed/partial session data for an exercise.
 * Returns { date, sets: [...] } or null.
 */
async function fetchLastSession(client, exerciseId, excludeSessionId) {
  const excludeClause = excludeSessionId
    ? 'AND se.workout_session_id != $2'
    : '';
  const params = excludeSessionId
    ? [exerciseId, excludeSessionId]
    : [exerciseId];

  const { rows } = await client.query(
    `SELECT se.id AS session_exercise_id, se.completed_at AS date, ws.id AS workout_session_id
     FROM session_exercises se
     JOIN workout_sessions ws ON ws.id = se.workout_session_id
     WHERE se.exercise_id = $1
       AND se.status IN ('completed', 'partial')
       ${excludeClause}
     ORDER BY se.completed_at DESC NULLS LAST
     LIMIT 1`,
    params
  );

  if (rows.length === 0) return null;

  const { session_exercise_id, date, workout_session_id } = rows[0];
  const { rows: sets } = await client.query(
    `SELECT set_number, weight_lbs, reps, rpe, rest_duration_seconds, rest_was_extended
     FROM set_logs
     WHERE session_exercise_id = $1
     ORDER BY set_number`,
    [session_exercise_id]
  );

  return {
    date,
    workout_session_id,
    sets: sets.map((s) => ({
      set_number: s.set_number,
      weight_lbs: parseFloat(s.weight_lbs),
      reps: s.reps,
      rpe: parseFloat(s.rpe),
      rest_duration_seconds: s.rest_duration_seconds,
      rest_was_extended: s.rest_was_extended,
    })),
  };
}

/**
 * Build the full nested workout response with last_session data.
 */
async function buildWorkoutResponse(client, workoutId) {
  const { rows: sessions } = await client.query(
    `SELECT id, program_day_id, started_at, completed_at, notes
     FROM workout_sessions WHERE id = $1`,
    [workoutId]
  );
  if (sessions.length === 0) return null;
  const session = sessions[0];

  const { rows: exercises } = await client.query(
    `SELECT se.id, se.exercise_id, se.program_exercise_id, se.sort_order, se.status,
            se.skip_reason, se.started_at, se.completed_at,
            e.name AS exercise_name, e.muscle_group,
            pe.target_sets,
            COALESCE(pe.rest_seconds, e.default_rest_seconds) AS rest_seconds,
            pe.superset_with_next
     FROM session_exercises se
     JOIN exercises e ON e.id = se.exercise_id
     JOIN program_exercises pe ON pe.id = se.program_exercise_id
     WHERE se.workout_session_id = $1
     ORDER BY se.sort_order`,
    [workoutId]
  );

  // Fetch sets for all session exercises in one query
  const seIds = exercises.map((ex) => ex.id);
  const { rows: allSets } = seIds.length > 0
    ? await client.query(
        `SELECT session_exercise_id, id, set_number, weight_lbs, reps, rpe,
                rest_duration_seconds, prescribed_rest_seconds, rest_was_extended, created_at
         FROM set_logs
         WHERE session_exercise_id = ANY($1)
         ORDER BY session_exercise_id, set_number`,
        [seIds]
      )
    : { rows: [] };

  const setsByExercise = {};
  for (const s of allSets) {
    if (!setsByExercise[s.session_exercise_id]) setsByExercise[s.session_exercise_id] = [];
    setsByExercise[s.session_exercise_id].push({
      id: s.id,
      set_number: s.set_number,
      weight_lbs: parseFloat(s.weight_lbs),
      reps: s.reps,
      rpe: parseFloat(s.rpe),
      rest_duration_seconds: s.rest_duration_seconds,
      prescribed_rest_seconds: s.prescribed_rest_seconds,
      rest_was_extended: s.rest_was_extended,
      created_at: s.created_at,
    });
  }

  // Fetch last_session for each exercise
  const exerciseData = [];
  for (const ex of exercises) {
    const lastSession = await fetchLastSession(client, ex.exercise_id, workoutId);
    exerciseData.push({
      id: ex.id,
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      muscle_group: ex.muscle_group,
      sort_order: ex.sort_order,
      target_sets: ex.target_sets,
      rest_seconds: ex.rest_seconds,
      superset_with_next: ex.superset_with_next,
      status: ex.status,
      skip_reason: ex.skip_reason,
      sets: setsByExercise[ex.id] || [],
      last_session: lastSession,
    });
  }

  return {
    id: session.id,
    program_day_id: session.program_day_id,
    started_at: session.started_at,
    completed_at: session.completed_at,
    notes: session.notes,
    exercises: exerciseData,
  };
}

/**
 * Compare two sessions for progression.
 */
function compareProgression(currentSets, previousSets) {
  if (!previousSets || previousSets.length === 0) {
    return { status: 'first_time' };
  }

  let hasHigherWeight = false;
  let hasHigherReps = false;
  let hasLowerPerformance = false;

  for (const current of currentSets) {
    const previous = previousSets.find((s) => s.set_number === current.set_number);
    if (!previous) continue;

    const curWeight = parseFloat(current.weight_lbs);
    const prevWeight = parseFloat(previous.weight_lbs);

    if (curWeight > prevWeight) {
      hasHigherWeight = true;
    } else if (curWeight === prevWeight) {
      if (current.reps > previous.reps) {
        hasHigherReps = true;
      } else if (current.reps < previous.reps) {
        hasLowerPerformance = true;
      }
    } else {
      hasLowerPerformance = true;
    }
  }

  if (hasHigherWeight) return { status: 'progressed', reason: 'higher_weight' };
  if (hasHigherReps) return { status: 'progressed', reason: 'higher_reps' };
  if (!hasLowerPerformance) return { status: 'same' };
  return { status: 'regressed' };
}

// ── Route handlers ───────────────────────────────────────────

async function startWorkout(req, res, next) {
  const client = await pool.connect();
  try {
    const { program_day_id } = req.body;

    await client.query('BEGIN');

    // Check for existing in-progress session
    const { rows: existing } = await client.query(
      'SELECT id FROM workout_sessions WHERE completed_at IS NULL LIMIT 1'
    );
    if (existing.length > 0) {
      throw createError(409, 'A workout session is already in progress', 'CONFLICT');
    }

    // Verify program day exists
    const { rows: dayRows } = await client.query(
      'SELECT id, is_rest_day FROM program_days WHERE id = $1',
      [program_day_id]
    );
    if (dayRows.length === 0) {
      throw createError(404, 'Program day not found', 'NOT_FOUND');
    }
    if (dayRows[0].is_rest_day) {
      throw createError(400, 'Cannot start workout on a rest day', 'VALIDATION_ERROR');
    }

    // Create workout session
    const { rows: sessionRows } = await client.query(
      `INSERT INTO workout_sessions (program_day_id)
       VALUES ($1) RETURNING id`,
      [program_day_id]
    );
    const workoutId = sessionRows[0].id;

    // Create session_exercises from program_exercises
    const { rows: programExercises } = await client.query(
      `SELECT pe.id, pe.exercise_id, pe.sort_order
       FROM program_exercises pe
       WHERE pe.program_day_id = $1
       ORDER BY pe.sort_order`,
      [program_day_id]
    );

    for (const pe of programExercises) {
      await client.query(
        `INSERT INTO session_exercises (workout_session_id, program_exercise_id, exercise_id, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [workoutId, pe.id, pe.exercise_id, pe.sort_order]
      );
    }

    await client.query('COMMIT');

    const data = await buildWorkoutResponse(client, workoutId);
    res.status(201).json({ data });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

async function getCurrentWorkout(_req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM workout_sessions WHERE completed_at IS NULL ORDER BY started_at DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.json({ data: null });
    }

    const data = await buildWorkoutResponse(pool, rows[0].id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function completeWorkout(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Verify workout exists and is in progress
    const { rows: sessions } = await client.query(
      'SELECT id, completed_at FROM workout_sessions WHERE id = $1',
      [id]
    );
    if (sessions.length === 0) {
      throw createError(404, 'Workout session not found', 'NOT_FOUND');
    }
    if (sessions[0].completed_at) {
      throw createError(409, 'Workout session is already completed', 'CONFLICT');
    }

    // Mark remaining pending exercises as skipped
    await client.query(
      `UPDATE session_exercises SET status = 'skipped', completed_at = NOW()
       WHERE workout_session_id = $1 AND status = 'pending'`,
      [id]
    );

    // Complete the workout
    await client.query(
      'UPDATE workout_sessions SET completed_at = NOW() WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    // Build response with progression data
    const { rows: workout } = await client.query(
      'SELECT id, started_at, completed_at FROM workout_sessions WHERE id = $1',
      [id]
    );
    const durationMs = new Date(workout[0].completed_at) - new Date(workout[0].started_at);
    const durationMinutes = Math.round(durationMs / 60000);

    // Get exercises with their sets
    const { rows: exercises } = await client.query(
      `SELECT se.id, se.exercise_id, se.status, se.skip_reason,
              e.name AS exercise_name, e.muscle_group
       FROM session_exercises se
       JOIN exercises e ON e.id = se.exercise_id
       WHERE se.workout_session_id = $1
       ORDER BY se.sort_order`,
      [id]
    );

    // Compute progression for each completed/partial exercise
    const details = [];
    let progressed = 0;
    let same = 0;
    let regressed = 0;
    let skipped = 0;

    for (const ex of exercises) {
      if (ex.status === 'skipped') {
        skipped++;
        details.push({
          exercise_name: ex.exercise_name,
          muscle_group: ex.muscle_group,
          status: 'skipped',
          skip_reason: ex.skip_reason,
        });
        continue;
      }

      // Get current session sets
      const { rows: currentSets } = await client.query(
        'SELECT set_number, weight_lbs, reps FROM set_logs WHERE session_exercise_id = $1 ORDER BY set_number',
        [ex.id]
      );

      // Get last session for comparison
      const lastSession = await fetchLastSession(client, ex.exercise_id, id);
      const progression = compareProgression(currentSets, lastSession?.sets || []);

      if (progression.status === 'progressed' || progression.status === 'first_time') progressed++;
      else if (progression.status === 'same') same++;
      else regressed++;

      details.push({
        exercise_name: ex.exercise_name,
        muscle_group: ex.muscle_group,
        status: progression.status,
        reason: progression.reason,
      });
    }

    // Re-build the full workout data
    const data = await buildWorkoutResponse(pool, id);

    res.json({
      data: {
        ...data,
        duration_minutes: durationMinutes,
        progression: {
          total_exercises: exercises.length,
          progressed,
          same,
          regressed,
          skipped,
          details,
        },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

async function startExercise(req, res, next) {
  try {
    const { workoutId, sessionExerciseId } = req.params;

    // Verify session exercise belongs to this workout and is pending
    const { rows } = await pool.query(
      `SELECT id, status FROM session_exercises
       WHERE id = $1 AND workout_session_id = $2`,
      [sessionExerciseId, workoutId]
    );
    if (rows.length === 0) {
      throw createError(404, 'Session exercise not found', 'NOT_FOUND');
    }
    if (rows[0].status !== 'pending') {
      throw createError(409, `Exercise is already ${rows[0].status}`, 'CONFLICT');
    }

    await pool.query(
      `UPDATE session_exercises SET started_at = NOW(), status = 'in_progress'
       WHERE id = $1`,
      [sessionExerciseId]
    );

    const { rows: updated } = await pool.query(
      `SELECT id, status, started_at FROM session_exercises WHERE id = $1`,
      [sessionExerciseId]
    );

    res.json({ data: updated[0] });
  } catch (err) {
    next(err);
  }
}

async function skipExercise(req, res, next) {
  try {
    const { workoutId, sessionExerciseId } = req.params;
    const { reason } = req.body || {};

    // Verify session exercise belongs to this workout
    const { rows } = await pool.query(
      `SELECT id, status FROM session_exercises
       WHERE id = $1 AND workout_session_id = $2`,
      [sessionExerciseId, workoutId]
    );
    if (rows.length === 0) {
      throw createError(404, 'Session exercise not found', 'NOT_FOUND');
    }
    if (rows[0].status === 'completed' || rows[0].status === 'partial') {
      throw createError(409, 'Cannot skip a completed exercise', 'CONFLICT');
    }

    await pool.query(
      `UPDATE session_exercises
       SET status = 'skipped', skip_reason = $1, completed_at = NOW()
       WHERE id = $2`,
      [reason || null, sessionExerciseId]
    );

    const { rows: updated } = await pool.query(
      `SELECT id, status, skip_reason, completed_at FROM session_exercises WHERE id = $1`,
      [sessionExerciseId]
    );

    res.json({ data: updated[0] });
  } catch (err) {
    next(err);
  }
}

async function completeExercise(req, res, next) {
  try {
    const { workoutId, sessionExerciseId } = req.params;

    // Verify session exercise belongs to this workout
    const { rows } = await pool.query(
      `SELECT se.id, se.status, pe.target_sets
       FROM session_exercises se
       JOIN program_exercises pe ON pe.id = se.program_exercise_id
       WHERE se.id = $1 AND se.workout_session_id = $2`,
      [sessionExerciseId, workoutId]
    );
    if (rows.length === 0) {
      throw createError(404, 'Session exercise not found', 'NOT_FOUND');
    }
    if (rows[0].status === 'completed' || rows[0].status === 'partial' || rows[0].status === 'skipped') {
      throw createError(409, `Exercise is already ${rows[0].status}`, 'CONFLICT');
    }

    // Count logged sets to determine completed vs partial
    const { rows: setCount } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM set_logs WHERE session_exercise_id = $1',
      [sessionExerciseId]
    );
    const loggedSets = setCount[0].count;
    const targetSets = rows[0].target_sets;
    const status = loggedSets >= targetSets ? 'completed' : 'partial';

    await pool.query(
      `UPDATE session_exercises SET status = $1, completed_at = NOW()
       WHERE id = $2`,
      [status, sessionExerciseId]
    );

    const { rows: updated } = await pool.query(
      `SELECT id, status, completed_at FROM session_exercises WHERE id = $1`,
      [sessionExerciseId]
    );

    res.json({ data: updated[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startWorkout, getCurrentWorkout, completeWorkout,
  startExercise, skipExercise, completeExercise,
};
