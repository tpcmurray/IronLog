const { compareProgression } = require('../../controllers/workoutController');

describe('compareProgression', () => {
  it('returns first_time when previousSets is null', () => {
    const result = compareProgression([{ set_number: 1, weight_lbs: 100, reps: 8 }], null);
    expect(result).toEqual({ status: 'first_time' });
  });

  it('returns first_time when previousSets is empty', () => {
    const result = compareProgression([{ set_number: 1, weight_lbs: 100, reps: 8 }], []);
    expect(result).toEqual({ status: 'first_time' });
  });

  it('returns progressed with higher_weight when weight increased', () => {
    const current = [{ set_number: 1, weight_lbs: 110, reps: 8 }];
    const previous = [{ set_number: 1, weight_lbs: 100, reps: 8 }];
    expect(compareProgression(current, previous)).toEqual({
      status: 'progressed',
      reason: 'higher_weight',
    });
  });

  it('returns progressed with higher_volume when total reps increased at same weight', () => {
    const current = [{ set_number: 1, weight_lbs: 100, reps: 10 }];
    const previous = [{ set_number: 1, weight_lbs: 100, reps: 8 }];
    expect(compareProgression(current, previous)).toEqual({
      status: 'progressed',
      reason: 'higher_volume',
      rep_difference: 2,
    });
  });

  it('returns same when weight and reps are equal', () => {
    const current = [
      { set_number: 1, weight_lbs: 100, reps: 8 },
      { set_number: 2, weight_lbs: 100, reps: 8 },
    ];
    const previous = [
      { set_number: 1, weight_lbs: 100, reps: 8 },
      { set_number: 2, weight_lbs: 100, reps: 8 },
    ];
    expect(compareProgression(current, previous)).toEqual({ status: 'same' });
  });

  it('returns regressed when weight decreased', () => {
    const current = [{ set_number: 1, weight_lbs: 90, reps: 8 }];
    const previous = [{ set_number: 1, weight_lbs: 100, reps: 8 }];
    expect(compareProgression(current, previous)).toEqual({ status: 'regressed' });
  });

  it('returns regressed when reps decreased at same weight', () => {
    const current = [{ set_number: 1, weight_lbs: 100, reps: 6 }];
    const previous = [{ set_number: 1, weight_lbs: 100, reps: 8 }];
    expect(compareProgression(current, previous)).toEqual({ status: 'regressed' });
  });

  it('prioritizes higher_weight over higher_reps', () => {
    const current = [
      { set_number: 1, weight_lbs: 110, reps: 8 },
      { set_number: 2, weight_lbs: 100, reps: 10 },
    ];
    const previous = [
      { set_number: 1, weight_lbs: 100, reps: 8 },
      { set_number: 2, weight_lbs: 100, reps: 8 },
    ];
    expect(compareProgression(current, previous)).toEqual({
      status: 'progressed',
      reason: 'higher_weight',
    });
  });

  it('ignores unmatched sets when computing volume', () => {
    const current = [
      { set_number: 1, weight_lbs: 100, reps: 8 },
      { set_number: 5, weight_lbs: 100, reps: 20 },
    ];
    const previous = [{ set_number: 1, weight_lbs: 100, reps: 8 }];
    // Only set 1 matches, weight same, reps same → status: same
    expect(compareProgression(current, previous)).toEqual({ status: 'same' });
  });

  it('handles mixed progression and regression — higher weight wins', () => {
    const current = [
      { set_number: 1, weight_lbs: 110, reps: 6 },
      { set_number: 2, weight_lbs: 90, reps: 8 },
    ];
    const previous = [
      { set_number: 1, weight_lbs: 100, reps: 8 },
      { set_number: 2, weight_lbs: 100, reps: 8 },
    ];
    expect(compareProgression(current, previous)).toEqual({
      status: 'progressed',
      reason: 'higher_weight',
    });
  });

  it('returns progressed with total volume increase across multiple sets', () => {
    const current = [
      { set_number: 1, weight_lbs: 100, reps: 10 },
      { set_number: 2, weight_lbs: 100, reps: 9 },
      { set_number: 3, weight_lbs: 100, reps: 8 },
      { set_number: 4, weight_lbs: 100, reps: 8 },
    ];
    const previous = [
      { set_number: 1, weight_lbs: 100, reps: 8 },
      { set_number: 2, weight_lbs: 100, reps: 8 },
      { set_number: 3, weight_lbs: 100, reps: 8 },
      { set_number: 4, weight_lbs: 100, reps: 8 },
    ];
    expect(compareProgression(current, previous)).toEqual({
      status: 'progressed',
      reason: 'higher_volume',
      rep_difference: 3,
    });
  });

  it('returns regressed when total volume decreased at same weight', () => {
    const current = [
      { set_number: 1, weight_lbs: 100, reps: 8 },
      { set_number: 2, weight_lbs: 100, reps: 7 },
      { set_number: 3, weight_lbs: 100, reps: 6 },
    ];
    const previous = [
      { set_number: 1, weight_lbs: 100, reps: 8 },
      { set_number: 2, weight_lbs: 100, reps: 8 },
      { set_number: 3, weight_lbs: 100, reps: 8 },
    ];
    expect(compareProgression(current, previous)).toEqual({ status: 'regressed' });
  });
});
