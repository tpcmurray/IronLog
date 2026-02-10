const request = require('supertest');

jest.mock('../../db/pool');
const pool = require('../../db/pool');

const app = require('../helpers/app');

const WID = 'a0000001-0000-0000-0000-000000000001';
const SEID = 'a0000002-0000-0000-0000-000000000001';
const SET_ID = 'a0000003-0000-0000-0000-000000000001';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/workouts/:workoutId/exercises/:sessionExerciseId/sets', () => {
  it('logs a set and computes rest_was_extended', async () => {
    // Verify session exercise
    pool.query.mockResolvedValueOnce({ rows: [{ id: SEID }] });
    // INSERT returning
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: SET_ID, set_number: 1, weight_lbs: '95.0', reps: 8, rpe: '7.5',
        rest_duration_seconds: 125, prescribed_rest_seconds: 120,
        rest_was_extended: true, created_at: '2026-01-25T14:35:22Z',
      }],
    });

    const res = await request(app)
      .post(`/api/workouts/${WID}/exercises/${SEID}/sets`)
      .send({
        set_number: 1, weight_lbs: 95, reps: 8, rpe: 7.5,
        rest_duration_seconds: 125, prescribed_rest_seconds: 120,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.rest_was_extended).toBe(true);
    expect(res.body.data.weight_lbs).toBe(95);
  });

  it('sets rest_was_extended to false when rest <= prescribed', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: SEID }] });
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: SET_ID, set_number: 1, weight_lbs: '95.0', reps: 8, rpe: '8.0',
        rest_duration_seconds: 110, prescribed_rest_seconds: 120,
        rest_was_extended: false, created_at: '2026-01-25T14:35:22Z',
      }],
    });

    const res = await request(app)
      .post(`/api/workouts/${WID}/exercises/${SEID}/sets`)
      .send({
        set_number: 1, weight_lbs: 95, reps: 8, rpe: 8,
        rest_duration_seconds: 110, prescribed_rest_seconds: 120,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.rest_was_extended).toBe(false);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post(`/api/workouts/${WID}/exercises/${SEID}/sets`)
      .send({ set_number: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for bad RPE', async () => {
    const res = await request(app)
      .post(`/api/workouts/${WID}/exercises/${SEID}/sets`)
      .send({ set_number: 1, weight_lbs: 95, reps: 8, rpe: 6 });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('rpe');
  });

  it('returns 404 when session exercise not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post(`/api/workouts/${WID}/exercises/${SEID}/sets`)
      .send({ set_number: 1, weight_lbs: 95, reps: 8, rpe: 8 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for invalid UUID in path', async () => {
    const res = await request(app)
      .post(`/api/workouts/bad-uuid/exercises/${SEID}/sets`)
      .send({ set_number: 1, weight_lbs: 95, reps: 8, rpe: 8 });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/sets/:id', () => {
  it('edits a set', async () => {
    // Verify exists
    pool.query.mockResolvedValueOnce({ rows: [{ id: SET_ID }] });
    // UPDATE
    pool.query.mockResolvedValueOnce({});
    // Re-fetch
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: SET_ID, set_number: 1, weight_lbs: '100.0', reps: 10, rpe: '8.0',
        rest_duration_seconds: 120, prescribed_rest_seconds: 120,
        rest_was_extended: false, created_at: '2026-01-25T14:35:22Z',
      }],
    });

    const res = await request(app)
      .put(`/api/sets/${SET_ID}`)
      .send({ reps: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.reps).toBe(10);
  });

  it('returns 404 for non-existent set', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/sets/${SET_ID}`)
      .send({ reps: 10 });

    expect(res.status).toBe(404);
  });

  it('returns 400 when no fields to update', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: SET_ID }] });

    const res = await request(app)
      .put(`/api/sets/${SET_ID}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('recomputes rest_was_extended when rest fields change', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: SET_ID }] });
    // Fetch current rest values
    pool.query.mockResolvedValueOnce({
      rows: [{ rest_duration_seconds: 120, prescribed_rest_seconds: 120 }],
    });
    // UPDATE
    pool.query.mockResolvedValueOnce({});
    // Re-fetch
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: SET_ID, set_number: 1, weight_lbs: '95.0', reps: 8, rpe: '8.0',
        rest_duration_seconds: 150, prescribed_rest_seconds: 120,
        rest_was_extended: true, created_at: '2026-01-25T14:35:22Z',
      }],
    });

    const res = await request(app)
      .put(`/api/sets/${SET_ID}`)
      .send({ rest_duration_seconds: 150 });

    expect(res.status).toBe(200);
    expect(res.body.data.rest_was_extended).toBe(true);
  });
});

describe('DELETE /api/sets/:id', () => {
  it('deletes a set', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).delete(`/api/sets/${SET_ID}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 when set not found', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app).delete(`/api/sets/${SET_ID}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await request(app).delete('/api/sets/not-a-uuid');
    expect(res.status).toBe(400);
  });
});
