const { pickCurrentWeight } = require('../../controllers/workoutController');

describe('pickCurrentWeight', () => {
  it('returns null for empty or missing sets', () => {
    expect(pickCurrentWeight([])).toBeNull();
    expect(pickCurrentWeight(null)).toBeNull();
    expect(pickCurrentWeight(undefined)).toBeNull();
  });

  it('returns the weight when all sets use the same weight', () => {
    const sets = [
      { weight_lbs: '77.0', reps: 6 },
      { weight_lbs: '77.0', reps: 7 },
    ];
    expect(pickCurrentWeight(sets)).toBe(77);
  });

  it('returns the most-used weight with mixed weights', () => {
    const sets = [
      { weight_lbs: '75.0', reps: 10 },
      { weight_lbs: '80.0', reps: 8 },
      { weight_lbs: '80.0', reps: 7 },
    ];
    expect(pickCurrentWeight(sets)).toBe(80);
  });

  it('breaks ties using the latest set', () => {
    const sets = [
      { weight_lbs: '75.0', reps: 10 },
      { weight_lbs: '80.0', reps: 8 },
    ];
    expect(pickCurrentWeight(sets)).toBe(80);

    const reversed = [
      { weight_lbs: '80.0', reps: 8 },
      { weight_lbs: '75.0', reps: 10 },
    ];
    expect(pickCurrentWeight(reversed)).toBe(75);
  });

  it('handles numeric weight values', () => {
    expect(pickCurrentWeight([{ weight_lbs: 42.5, reps: 5 }])).toBe(42.5);
  });
});
