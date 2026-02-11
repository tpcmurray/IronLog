const pool = require('../db/pool');
const { createError } = require('../middleware/errorHandler');

const VALID_RPE = [7, 7.5, 8, 8.5, 9, 9.5, 10];

function validateSetFields(body) {
  const errors = [];
  if (body.rpe !== undefined) {
    const rpe = parseFloat(body.rpe);
    if (!VALID_RPE.includes(rpe)) {
      errors.push('rpe must be 7-10 in 0.5 steps');
    }
  }
  if (body.reps !== undefined && (typeof body.reps !== 'number' || body.reps < 0)) {
    errors.push('reps must be >= 0');
  }
  if (body.weight_lbs !== undefined && (typeof body.weight_lbs !== 'number' || body.weight_lbs < 0)) {
    errors.push('weight_lbs must be >= 0');
  }
  if (body.set_number !== undefined && (typeof body.set_number !== 'number' || body.set_number < 1)) {
    errors.push('set_number must be >= 1');
  }
  return errors;
}

async function logSet(req, res, next) {
  try {
    const { workoutId, sessionExerciseId } = req.params;
    const { set_number, weight_lbs, reps, rpe, rest_duration_seconds, prescribed_rest_seconds } = req.body;

    // Validate fields
    const errors = validateSetFields(req.body);
    if (errors.length > 0) {
      throw createError(400, errors.join('; '), 'VALIDATION_ERROR');
    }

    // Verify session exercise belongs to this workout
    const { rows: seRows } = await pool.query(
      `SELECT id FROM session_exercises
       WHERE id = $1 AND workout_session_id = $2`,
      [sessionExerciseId, workoutId]
    );
    if (seRows.length === 0) {
      throw createError(404, 'Session exercise not found', 'NOT_FOUND');
    }

    // Compute rest_was_extended (10s tolerance)
    const restWasExtended = (rest_duration_seconds != null && prescribed_rest_seconds != null)
      ? rest_duration_seconds > prescribed_rest_seconds + 10
      : false;

    const { rows } = await pool.query(
      `INSERT INTO set_logs
         (session_exercise_id, set_number, weight_lbs, reps, rpe,
          rest_duration_seconds, prescribed_rest_seconds, rest_was_extended)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, set_number, weight_lbs, reps, rpe,
                 rest_duration_seconds, prescribed_rest_seconds, rest_was_extended, created_at`,
      [sessionExerciseId, set_number, weight_lbs, reps, rpe,
       rest_duration_seconds || null, prescribed_rest_seconds || null, restWasExtended]
    );

    const row = rows[0];
    res.status(201).json({
      data: {
        id: row.id,
        set_number: row.set_number,
        weight_lbs: parseFloat(row.weight_lbs),
        reps: row.reps,
        rpe: parseFloat(row.rpe),
        rest_duration_seconds: row.rest_duration_seconds,
        prescribed_rest_seconds: row.prescribed_rest_seconds,
        rest_was_extended: row.rest_was_extended,
        created_at: row.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function editSet(req, res, next) {
  try {
    const { id } = req.params;

    // Validate any provided fields
    const errors = validateSetFields(req.body);
    if (errors.length > 0) {
      throw createError(400, errors.join('; '), 'VALIDATION_ERROR');
    }

    // Verify set exists
    const { rows: existing } = await pool.query(
      'SELECT id FROM set_logs WHERE id = $1', [id]
    );
    if (existing.length === 0) {
      throw createError(404, 'Set not found', 'NOT_FOUND');
    }

    // Build dynamic update
    const allowed = ['set_number', 'weight_lbs', 'reps', 'rpe', 'rest_duration_seconds', 'prescribed_rest_seconds'];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(req.body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw createError(400, 'No fields to update', 'VALIDATION_ERROR');
    }

    // Recompute rest_was_extended if either rest field changed
    if (req.body.rest_duration_seconds !== undefined || req.body.prescribed_rest_seconds !== undefined) {
      // Need to fetch current values for fields not being updated
      const { rows: current } = await pool.query(
        'SELECT rest_duration_seconds, prescribed_rest_seconds FROM set_logs WHERE id = $1', [id]
      );
      const restDuration = req.body.rest_duration_seconds ?? current[0].rest_duration_seconds;
      const prescribed = req.body.prescribed_rest_seconds ?? current[0].prescribed_rest_seconds;
      const restWasExtended = (restDuration != null && prescribed != null)
        ? restDuration > prescribed + 10
        : false;
      updates.push(`rest_was_extended = $${paramIndex}`);
      values.push(restWasExtended);
      paramIndex++;
    }

    values.push(id);
    await pool.query(
      `UPDATE set_logs SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    const { rows } = await pool.query(
      `SELECT id, set_number, weight_lbs, reps, rpe,
              rest_duration_seconds, prescribed_rest_seconds, rest_was_extended, created_at
       FROM set_logs WHERE id = $1`,
      [id]
    );

    const row = rows[0];
    res.json({
      data: {
        id: row.id,
        set_number: row.set_number,
        weight_lbs: parseFloat(row.weight_lbs),
        reps: row.reps,
        rpe: parseFloat(row.rpe),
        rest_duration_seconds: row.rest_duration_seconds,
        prescribed_rest_seconds: row.prescribed_rest_seconds,
        rest_was_extended: row.rest_was_extended,
        created_at: row.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function deleteSet(req, res, next) {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query(
      'DELETE FROM set_logs WHERE id = $1', [id]
    );
    if (rowCount === 0) {
      throw createError(404, 'Set not found', 'NOT_FOUND');
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { logSet, editSet, deleteSet, validateSetFields };
