const { requireFields, validateUuid, validatePositiveNumber } = require('../../middleware/validate');
const { validateSetFields } = require('../../controllers/setController');

// Helper to invoke middleware and capture result
function runMiddleware(mw, req) {
  return new Promise((resolve) => {
    const res = {};
    mw(req, res, (err) => {
      resolve({ err, res });
    });
  });
}

describe('requireFields', () => {
  it('calls next() with no error when all fields present', async () => {
    const mw = requireFields('name', 'age');
    const { err } = await runMiddleware(mw, { body: { name: 'John', age: 30 } });
    expect(err).toBeUndefined();
  });

  it('calls next(error) when fields are missing', async () => {
    const mw = requireFields('name', 'age');
    const { err } = await runMiddleware(mw, { body: { name: 'John' } });
    expect(err).toBeDefined();
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toContain('age');
  });

  it('treats null values as missing', async () => {
    const mw = requireFields('name');
    const { err } = await runMiddleware(mw, { body: { name: null } });
    expect(err).toBeDefined();
    expect(err.status).toBe(400);
  });

  it('treats undefined values as missing', async () => {
    const mw = requireFields('name');
    const { err } = await runMiddleware(mw, { body: {} });
    expect(err).toBeDefined();
    expect(err.status).toBe(400);
  });
});

describe('validateUuid', () => {
  it('calls next() with no error for valid UUID', async () => {
    const mw = validateUuid('id');
    const { err } = await runMiddleware(mw, { params: { id: 'a0000001-0000-0000-0000-000000000001' } });
    expect(err).toBeUndefined();
  });

  it('calls next(error) for invalid UUID', async () => {
    const mw = validateUuid('id');
    const { err } = await runMiddleware(mw, { params: { id: 'not-a-uuid' } });
    expect(err).toBeDefined();
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('validates multiple params', async () => {
    const mw = validateUuid('a', 'b');
    const { err } = await runMiddleware(mw, {
      params: { a: 'a0000001-0000-0000-0000-000000000001', b: 'bad' },
    });
    expect(err).toBeDefined();
    expect(err.message).toContain('b');
  });

  it('calls next(error) for missing param', async () => {
    const mw = validateUuid('id');
    const { err } = await runMiddleware(mw, { params: {} });
    expect(err).toBeDefined();
    expect(err.status).toBe(400);
  });
});

describe('validatePositiveNumber', () => {
  it('calls next() with no error for valid positive number', async () => {
    const mw = validatePositiveNumber('weight');
    const { err } = await runMiddleware(mw, { body: { weight: 100 } });
    expect(err).toBeUndefined();
  });

  it('calls next() with no error when field is absent', async () => {
    const mw = validatePositiveNumber('weight');
    const { err } = await runMiddleware(mw, { body: {} });
    expect(err).toBeUndefined();
  });

  it('calls next(error) for zero', async () => {
    const mw = validatePositiveNumber('weight');
    const { err } = await runMiddleware(mw, { body: { weight: 0 } });
    expect(err).toBeDefined();
    expect(err.status).toBe(400);
  });

  it('calls next(error) for negative number', async () => {
    const mw = validatePositiveNumber('weight');
    const { err } = await runMiddleware(mw, { body: { weight: -5 } });
    expect(err).toBeDefined();
    expect(err.status).toBe(400);
  });

  it('calls next(error) for non-numeric string', async () => {
    const mw = validatePositiveNumber('weight');
    const { err } = await runMiddleware(mw, { body: { weight: 'abc' } });
    expect(err).toBeDefined();
    expect(err.status).toBe(400);
  });
});

describe('validateSetFields', () => {
  it('returns empty array for valid set data', () => {
    const errors = validateSetFields({ set_number: 1, weight_lbs: 100, reps: 8, rpe: 8 });
    expect(errors).toEqual([]);
  });

  it('rejects RPE outside valid range', () => {
    const errors = validateSetFields({ rpe: 6.5 });
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('rpe');
  });

  it('accepts all valid RPE values', () => {
    for (const rpe of [7, 7.5, 8, 8.5, 9, 9.5, 10]) {
      const errors = validateSetFields({ rpe });
      expect(errors).toEqual([]);
    }
  });

  it('rejects negative reps', () => {
    const errors = validateSetFields({ reps: -1 });
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('reps');
  });

  it('accepts zero reps', () => {
    const errors = validateSetFields({ reps: 0 });
    expect(errors).toEqual([]);
  });

  it('rejects zero weight_lbs', () => {
    const errors = validateSetFields({ weight_lbs: 0 });
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('weight_lbs');
  });

  it('rejects set_number less than 1', () => {
    const errors = validateSetFields({ set_number: 0 });
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('set_number');
  });

  it('returns multiple errors for multiple bad fields', () => {
    const errors = validateSetFields({ rpe: 5, reps: -1, weight_lbs: 0, set_number: 0 });
    expect(errors.length).toBe(4);
  });

  it('returns empty array when no fields provided', () => {
    const errors = validateSetFields({});
    expect(errors).toEqual([]);
  });
});
