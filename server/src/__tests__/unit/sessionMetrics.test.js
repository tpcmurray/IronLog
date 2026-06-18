const { computeSessionMetrics, estimated1RM } = require('../../controllers/exerciseController');

describe('estimated1RM (Epley)', () => {
  it('returns the weight at 0 reps', () => {
    expect(estimated1RM(100, 0)).toBe(100);
  });

  it('scales with reps', () => {
    expect(Math.round(estimated1RM(100, 10))).toBe(133); // 100 * (1 + 10/30)
  });
});

describe('computeSessionMetrics', () => {
  it('returns zeros for no sets', () => {
    expect(computeSessionMetrics([])).toEqual({
      total_reps: 0, volume: 0, top_weight: 0, est_1rm: 0,
    });
  });

  it('sums reps and volume across sets', () => {
    const m = computeSessionMetrics([
      { weight_lbs: 100, reps: 10 },
      { weight_lbs: 100, reps: 8 },
    ]);
    expect(m.total_reps).toBe(18);
    expect(m.volume).toBe(1800);
    expect(m.top_weight).toBe(100);
  });

  it('uses the heaviest weight and best estimated 1RM across sets', () => {
    const m = computeSessionMetrics([
      { weight_lbs: 80, reps: 12 }, // 1RM ~112
      { weight_lbs: 100, reps: 5 }, // 1RM ~117 (highest)
    ]);
    expect(m.top_weight).toBe(100);
    expect(m.est_1rm).toBe(Math.round(estimated1RM(100, 5)));
  });

  it('parses numeric string weights', () => {
    const m = computeSessionMetrics([{ weight_lbs: '77.0', reps: 6 }]);
    expect(m.volume).toBe(462);
    expect(m.top_weight).toBe(77);
  });
});
