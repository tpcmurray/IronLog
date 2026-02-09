const pool = require('../db/pool');
const { createError } = require('../middleware/errorHandler');

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

module.exports = { listExercises, createExercise, updateExercise };
