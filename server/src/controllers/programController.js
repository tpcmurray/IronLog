const pool = require('../db/pool');
const { createError } = require('../middleware/errorHandler');

async function getActiveProgram(_req, res, next) {
  try {
    // Get the active program
    const { rows: programs } = await pool.query(
      'SELECT id, name FROM programs WHERE is_active = true LIMIT 1'
    );
    if (programs.length === 0) {
      throw createError(404, 'No active program found', 'NOT_FOUND');
    }
    const program = programs[0];

    // Get days with exercises, resolving rest_seconds fallback
    const { rows: days } = await pool.query(
      `SELECT pd.id, pd.day_of_week, pd.label, pd.is_rest_day
       FROM program_days pd
       WHERE pd.program_id = $1
       ORDER BY pd.day_of_week`,
      [program.id]
    );

    const { rows: exercises } = await pool.query(
      `SELECT
         pe.id,
         pe.program_day_id,
         pe.exercise_id,
         e.name AS exercise_name,
         e.muscle_group,
         pe.sort_order,
         pe.target_sets,
         COALESCE(pe.rest_seconds, e.default_rest_seconds) AS rest_seconds,
         pe.superset_with_next
       FROM program_exercises pe
       JOIN exercises e ON e.id = pe.exercise_id
       WHERE pe.program_day_id = ANY($1)
       ORDER BY pe.program_day_id, pe.sort_order`,
      [days.map((d) => d.id)]
    );

    // Nest exercises under their days
    const exercisesByDay = {};
    for (const ex of exercises) {
      if (!exercisesByDay[ex.program_day_id]) {
        exercisesByDay[ex.program_day_id] = [];
      }
      exercisesByDay[ex.program_day_id].push({
        id: ex.id,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        muscle_group: ex.muscle_group,
        sort_order: ex.sort_order,
        target_sets: ex.target_sets,
        rest_seconds: ex.rest_seconds,
        superset_with_next: ex.superset_with_next,
      });
    }

    res.json({
      data: {
        id: program.id,
        name: program.name,
        days: days.map((d) => ({
          id: d.id,
          day_of_week: d.day_of_week,
          label: d.label,
          is_rest_day: d.is_rest_day,
          exercises: exercisesByDay[d.id] || [],
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateProgram(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, days } = req.body;

    await client.query('BEGIN');

    // Verify program exists
    const { rows: programs } = await client.query(
      'SELECT id FROM programs WHERE id = $1',
      [id]
    );
    if (programs.length === 0) {
      throw createError(404, 'Program not found', 'NOT_FOUND');
    }

    // Update program name if provided
    if (name) {
      await client.query('UPDATE programs SET name = $1 WHERE id = $2', [name, id]);
    }

    if (days) {
      // Delete existing days (cascades to program_exercises)
      await client.query('DELETE FROM program_days WHERE program_id = $1', [id]);

      // Insert new days and exercises
      for (const day of days) {
        const { rows: dayRows } = await client.query(
          `INSERT INTO program_days (program_id, day_of_week, label, is_rest_day)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [id, day.day_of_week, day.label, day.is_rest_day || false]
        );
        const dayId = dayRows[0].id;

        if (day.exercises) {
          for (const ex of day.exercises) {
            await client.query(
              `INSERT INTO program_exercises (program_day_id, exercise_id, sort_order, target_sets, rest_seconds, superset_with_next)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [dayId, ex.exercise_id, ex.sort_order, ex.target_sets || 4, ex.rest_seconds || null, ex.superset_with_next || false]
            );
          }
        }
      }
    }

    await client.query('COMMIT');

    // Return updated program via the same GET logic
    // Re-fetch to return consistent response
    const { rows: updatedProgram } = await pool.query(
      'SELECT id, name FROM programs WHERE id = $1', [id]
    );
    const { rows: updatedDays } = await pool.query(
      `SELECT id, day_of_week, label, is_rest_day
       FROM program_days WHERE program_id = $1 ORDER BY day_of_week`,
      [id]
    );
    const { rows: updatedExercises } = await pool.query(
      `SELECT pe.id, pe.program_day_id, pe.exercise_id, e.name AS exercise_name,
              e.muscle_group, pe.sort_order, pe.target_sets,
              COALESCE(pe.rest_seconds, e.default_rest_seconds) AS rest_seconds,
              pe.superset_with_next
       FROM program_exercises pe
       JOIN exercises e ON e.id = pe.exercise_id
       WHERE pe.program_day_id = ANY($1)
       ORDER BY pe.program_day_id, pe.sort_order`,
      [updatedDays.map((d) => d.id)]
    );

    const exercisesByDay = {};
    for (const ex of updatedExercises) {
      if (!exercisesByDay[ex.program_day_id]) exercisesByDay[ex.program_day_id] = [];
      exercisesByDay[ex.program_day_id].push({
        id: ex.id,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        muscle_group: ex.muscle_group,
        sort_order: ex.sort_order,
        target_sets: ex.target_sets,
        rest_seconds: ex.rest_seconds,
        superset_with_next: ex.superset_with_next,
      });
    }

    res.json({
      data: {
        id: updatedProgram[0].id,
        name: updatedProgram[0].name,
        days: updatedDays.map((d) => ({
          id: d.id,
          day_of_week: d.day_of_week,
          label: d.label,
          is_rest_day: d.is_rest_day,
          exercises: exercisesByDay[d.id] || [],
        })),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { getActiveProgram, updateProgram };
