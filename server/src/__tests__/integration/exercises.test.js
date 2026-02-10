const request = require('supertest');

jest.mock('../../db/pool');
const pool = require('../../db/pool');

const app = require('../helpers/app');

const UUID1 = 'a0000001-0000-0000-0000-000000000001';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/exercises', () => {
  it('returns list of exercises', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: UUID1, name: 'Bench Press', muscle_group: 'chest', default_rest_seconds: 120, notes: null },
      ],
    });

    const res = await request(app).get('/api/exercises');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Bench Press');
  });
});

describe('POST /api/exercises', () => {
  it('creates an exercise', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: UUID1, name: 'Squat', muscle_group: 'quads', default_rest_seconds: 120, notes: null }],
    });

    const res = await request(app)
      .post('/api/exercises')
      .send({ name: 'Squat', muscle_group: 'quads' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Squat');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .send({ muscle_group: 'quads' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when muscle_group is missing', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .send({ name: 'Squat' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /api/exercises/:id', () => {
  it('updates an exercise', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: UUID1, name: 'Heavy Squat', muscle_group: 'quads', default_rest_seconds: 150, notes: null }],
    });

    const res = await request(app)
      .put(`/api/exercises/${UUID1}`)
      .send({ name: 'Heavy Squat', default_rest_seconds: 150 });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Heavy Squat');
  });

  it('returns 404 when exercise not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/exercises/${UUID1}`)
      .send({ name: 'Nope' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await request(app)
      .put('/api/exercises/not-a-uuid')
      .send({ name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when no fields to update', async () => {
    const res = await request(app)
      .put(`/api/exercises/${UUID1}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/exercises/:id/last-session', () => {
  it('returns last session data', async () => {
    // Verify exercise exists
    pool.query.mockResolvedValueOnce({ rows: [{ id: UUID1 }] });
    // fetchLastSession: find session_exercise
    pool.query.mockResolvedValueOnce({
      rows: [{ session_exercise_id: 'se-1', date: '2026-01-25T15:00:00Z', workout_session_id: 'ws-1' }],
    });
    // fetchLastSession: get sets
    pool.query.mockResolvedValueOnce({
      rows: [{ set_number: 1, weight_lbs: '95.0', reps: 8, rpe: '7.5', rest_duration_seconds: 120, rest_was_extended: false }],
    });

    const res = await request(app).get(`/api/exercises/${UUID1}/last-session`);
    expect(res.status).toBe(200);
    expect(res.body.data.sets).toHaveLength(1);
    expect(res.body.data.sets[0].weight_lbs).toBe(95);
  });

  it('returns null when no prior session', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: UUID1 }] });
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`/api/exercises/${UUID1}/last-session`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('returns 404 for non-existent exercise', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`/api/exercises/${UUID1}/last-session`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/exercises/:id/history', () => {
  it('returns paginated exercise history', async () => {
    // Verify exercise
    pool.query.mockResolvedValueOnce({
      rows: [{ id: UUID1, name: 'Bench Press', muscle_group: 'chest' }],
    });
    // Total count
    pool.query.mockResolvedValueOnce({ rows: [{ total: 1 }] });
    // Sessions
    pool.query.mockResolvedValueOnce({
      rows: [{ session_exercise_id: 'se-1', date: '2026-01-25T15:00:00Z', status: 'completed' }],
    });
    // Sets for session
    pool.query.mockResolvedValueOnce({
      rows: [{ set_number: 1, weight_lbs: '95.0', reps: 8, rpe: '7.5', rest_duration_seconds: 120, rest_was_extended: false }],
    });
    // Previous session for progression (none)
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`/api/exercises/${UUID1}/history?limit=5&offset=0`);
    expect(res.status).toBe(200);
    expect(res.body.data.exercise.name).toBe('Bench Press');
    expect(res.body.data.sessions).toHaveLength(1);
    expect(res.body.data.sessions[0].progression_status).toBe('first_time');
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.limit).toBe(5);
    expect(res.body.data.offset).toBe(0);
  });
});
