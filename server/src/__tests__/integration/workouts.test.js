const request = require('supertest');

jest.mock('../../db/pool');
const pool = require('../../db/pool');

const app = require('../helpers/app');

const WID = 'a0000001-0000-0000-0000-000000000001';
const DAY_ID = 'a0000002-0000-0000-0000-000000000001';
const SEID = 'a0000003-0000-0000-0000-000000000001';

beforeEach(() => {
  jest.clearAllMocks();
});

// Helper to create a mock client with chained query results
function createMockClient(queryResults) {
  let callIndex = 0;
  const client = {
    query: jest.fn((...args) => {
      const result = queryResults[callIndex] || { rows: [] };
      callIndex++;
      return Promise.resolve(result);
    }),
    release: jest.fn(),
  };
  return client;
}

describe('POST /api/workouts', () => {
  it('starts a workout session', async () => {
    const mockClient = createMockClient([
      {}, // BEGIN
      { rows: [] }, // Check no existing session
      { rows: [{ id: DAY_ID, is_rest_day: false }] }, // Verify day
      { rows: [{ id: WID }] }, // INSERT workout_sessions
      { rows: [{ id: 'pe-1', exercise_id: 'ex-1', sort_order: 1 }] }, // SELECT program_exercises
      {}, // INSERT session_exercise
      {}, // COMMIT
      // buildWorkoutResponse:
      { rows: [{ id: WID, program_day_id: DAY_ID, started_at: '2026-01-25T14:00:00Z', completed_at: null, notes: null }] },
      { rows: [] }, // exercises
    ]);

    pool.connect.mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/workouts')
      .send({ program_day_id: DAY_ID });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(WID);
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('returns 409 when a session is already in progress', async () => {
    const mockClient = createMockClient([
      {}, // BEGIN
      { rows: [{ id: 'existing' }] }, // Found existing session
    ]);

    pool.connect.mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/workouts')
      .send({ program_day_id: DAY_ID });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 404 for non-existent program day', async () => {
    const mockClient = createMockClient([
      {}, // BEGIN
      { rows: [] }, // No existing session
      { rows: [] }, // Day not found
    ]);

    pool.connect.mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/workouts')
      .send({ program_day_id: DAY_ID });

    expect(res.status).toBe(404);
  });

  it('returns 400 for rest day', async () => {
    const mockClient = createMockClient([
      {}, // BEGIN
      { rows: [] }, // No existing session
      { rows: [{ id: DAY_ID, is_rest_day: true }] }, // Rest day
    ]);

    pool.connect.mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/workouts')
      .send({ program_day_id: DAY_ID });

    expect(res.status).toBe(400);
  });

  it('returns 400 when program_day_id is missing', async () => {
    const res = await request(app)
      .post('/api/workouts')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/workouts/current', () => {
  it('returns the current in-progress workout', async () => {
    // Find current session
    pool.query.mockResolvedValueOnce({ rows: [{ id: WID }] });
    // buildWorkoutResponse: session
    pool.query.mockResolvedValueOnce({
      rows: [{ id: WID, program_day_id: DAY_ID, started_at: '2026-01-25T14:00:00Z', completed_at: null, notes: null }],
    });
    // buildWorkoutResponse: exercises
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/workouts/current');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(WID);
  });

  it('returns null data when no session in progress', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/workouts/current');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

describe('PUT /api/workouts/:id/complete', () => {
  it('completes a workout with progression data', async () => {
    const mockClient = createMockClient([
      {}, // BEGIN
      { rows: [{ id: WID, completed_at: null }] }, // Verify session
      {}, // Mark pending as skipped
      {}, // Set completed_at
      {}, // COMMIT
      // workout started_at/completed_at
      { rows: [{ id: WID, started_at: '2026-01-25T14:00:00Z', completed_at: '2026-01-25T15:00:00Z' }] },
      // exercises
      { rows: [] },
    ]);

    pool.connect.mockResolvedValue(mockClient);

    // buildWorkoutResponse (called with pool, not client)
    pool.query.mockResolvedValueOnce({
      rows: [{ id: WID, program_day_id: DAY_ID, started_at: '2026-01-25T14:00:00Z', completed_at: '2026-01-25T15:00:00Z', notes: null }],
    });
    pool.query.mockResolvedValueOnce({ rows: [] }); // exercises

    const res = await request(app).put(`/api/workouts/${WID}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.data.duration_minutes).toBe(60);
    expect(res.body.data.progression).toBeDefined();
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('returns 404 when workout not found', async () => {
    const mockClient = createMockClient([
      {}, // BEGIN
      { rows: [] }, // Not found
    ]);

    pool.connect.mockResolvedValue(mockClient);

    const res = await request(app).put(`/api/workouts/${WID}/complete`);
    expect(res.status).toBe(404);
  });

  it('returns 409 when workout already completed', async () => {
    const mockClient = createMockClient([
      {}, // BEGIN
      { rows: [{ id: WID, completed_at: '2026-01-25T15:00:00Z' }] },
    ]);

    pool.connect.mockResolvedValue(mockClient);

    const res = await request(app).put(`/api/workouts/${WID}/complete`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('GET /api/workouts/history', () => {
  it('returns workouts for a given week', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // No workouts in range

    const res = await request(app).get('/api/workouts/history?date=2026-01-25');

    expect(res.status).toBe(200);
    expect(res.body.data.week_start).toBe('2026-01-25');
    expect(res.body.data.week_end).toBe('2026-01-31');
    expect(res.body.data.workouts).toEqual([]);
  });

  it('returns 400 for invalid week format', async () => {
    const res = await request(app).get('/api/workouts/history?week=bad');
    expect(res.status).toBe(400);
  });

  it('defaults to current week when no params', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/workouts/history');
    expect(res.status).toBe(200);
    expect(res.body.data.week_start).toBeDefined();
  });
});

describe('PUT /api/workouts/:workoutId/exercises/:sessionExerciseId/start', () => {
  it('starts an exercise', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: SEID, status: 'pending' }] });
    pool.query.mockResolvedValueOnce({});
    pool.query.mockResolvedValueOnce({
      rows: [{ id: SEID, status: 'in_progress', started_at: '2026-01-25T14:10:00Z' }],
    });

    const res = await request(app).put(`/api/workouts/${WID}/exercises/${SEID}/start`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('returns 409 when exercise is not pending', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: SEID, status: 'completed' }] });

    const res = await request(app).put(`/api/workouts/${WID}/exercises/${SEID}/start`);
    expect(res.status).toBe(409);
  });

  it('returns 404 when exercise not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put(`/api/workouts/${WID}/exercises/${SEID}/start`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/workouts/:workoutId/exercises/:sessionExerciseId/skip', () => {
  it('skips an exercise with reason', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: SEID, status: 'pending' }] });
    pool.query.mockResolvedValueOnce({});
    pool.query.mockResolvedValueOnce({
      rows: [{ id: SEID, status: 'skipped', skip_reason: 'shoulder pain', completed_at: '2026-01-25T14:10:00Z' }],
    });

    const res = await request(app)
      .put(`/api/workouts/${WID}/exercises/${SEID}/skip`)
      .send({ reason: 'shoulder pain' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('skipped');
    expect(res.body.data.skip_reason).toBe('shoulder pain');
  });

  it('returns 409 when exercise is already completed', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: SEID, status: 'completed' }] });

    const res = await request(app).put(`/api/workouts/${WID}/exercises/${SEID}/skip`);
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/workouts/:workoutId/exercises/:sessionExerciseId/complete', () => {
  it('completes an exercise as completed when sets >= target', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: SEID, status: 'in_progress', target_sets: 4 }],
    });
    pool.query.mockResolvedValueOnce({ rows: [{ count: 4 }] }); // set count
    pool.query.mockResolvedValueOnce({});
    pool.query.mockResolvedValueOnce({
      rows: [{ id: SEID, status: 'completed', completed_at: '2026-01-25T14:30:00Z' }],
    });

    const res = await request(app).put(`/api/workouts/${WID}/exercises/${SEID}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('completes as partial when sets < target', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: SEID, status: 'in_progress', target_sets: 4 }],
    });
    pool.query.mockResolvedValueOnce({ rows: [{ count: 2 }] });
    pool.query.mockResolvedValueOnce({});
    pool.query.mockResolvedValueOnce({
      rows: [{ id: SEID, status: 'partial', completed_at: '2026-01-25T14:30:00Z' }],
    });

    const res = await request(app).put(`/api/workouts/${WID}/exercises/${SEID}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('partial');
  });

  it('returns 409 when exercise is already completed', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: SEID, status: 'completed', target_sets: 4 }],
    });

    const res = await request(app).put(`/api/workouts/${WID}/exercises/${SEID}/complete`);
    expect(res.status).toBe(409);
  });
});
