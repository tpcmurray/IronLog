const request = require('supertest');

jest.mock('../../db/pool');
const pool = require('../../db/pool');

const app = require('../helpers/app');

const UUID1 = 'a0000001-0000-0000-0000-000000000001';
const DAY_ID = 'a0000002-0000-0000-0000-000000000001';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/program/active', () => {
  it('returns the active program with nested days and exercises', async () => {
    // Active program query
    pool.query.mockResolvedValueOnce({
      rows: [{ id: UUID1, name: 'PPL Program' }],
    });
    // Days query
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: DAY_ID, day_of_week: 0, label: 'Push Day', is_rest_day: false },
      ],
    });
    // Exercises query
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'pe-1', program_day_id: DAY_ID, exercise_id: 'ex-1',
          exercise_name: 'Bench Press', muscle_group: 'chest',
          sort_order: 1, target_sets: 4, rest_seconds: 120, superset_with_next: false,
        },
      ],
    });

    const res = await request(app).get('/api/program/active');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('PPL Program');
    expect(res.body.data.days).toHaveLength(1);
    expect(res.body.data.days[0].exercises).toHaveLength(1);
    expect(res.body.data.days[0].exercises[0].exercise_name).toBe('Bench Press');
  });

  it('returns 404 when no active program', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/program/active');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PUT /api/program/:id', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    pool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockReset();
    mockClient.release.mockReset();
  });

  it('updates program with new days and exercises', async () => {
    // BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // Verify program exists
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: UUID1 }] });
    // Update name
    mockClient.query.mockResolvedValueOnce({});
    // Delete old days
    mockClient.query.mockResolvedValueOnce({});
    // Insert new day
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: DAY_ID }] });
    // Insert exercise
    mockClient.query.mockResolvedValueOnce({});
    // COMMIT
    mockClient.query.mockResolvedValueOnce({});

    // Re-fetch: program
    pool.query.mockResolvedValueOnce({ rows: [{ id: UUID1, name: 'New Name' }] });
    // Re-fetch: days
    pool.query.mockResolvedValueOnce({
      rows: [{ id: DAY_ID, day_of_week: 0, label: 'Push', is_rest_day: false }],
    });
    // Re-fetch: exercises
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'pe-1', program_day_id: DAY_ID, exercise_id: 'ex-1',
        exercise_name: 'Bench Press', muscle_group: 'chest',
        sort_order: 1, target_sets: 4, rest_seconds: 120, superset_with_next: false,
      }],
    });

    const res = await request(app)
      .put(`/api/program/${UUID1}`)
      .send({
        name: 'New Name',
        days: [
          {
            day_of_week: 0,
            label: 'Push',
            exercises: [{ exercise_id: 'ex-1', sort_order: 1, target_sets: 4 }],
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('New Name');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('returns 404 when program not found', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK (caught)

    const res = await request(app)
      .put(`/api/program/${UUID1}`)
      .send({ days: [] });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 when days field is missing', async () => {
    const res = await request(app)
      .put(`/api/program/${UUID1}`)
      .send({ name: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
