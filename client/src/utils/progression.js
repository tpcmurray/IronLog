export function compareProgression(currentSets, previousSets) {
  if (!previousSets || previousSets.length === 0) {
    return { status: 'first_time' };
  }

  let hasHigherWeight = false;
  let hasLowerWeight = false;
  let allWeightsSame = true;

  // First pass: detect weight changes
  for (const current of currentSets) {
    const previous = previousSets.find((s) => s.set_number === current.set_number);
    if (!previous) continue;

    const curWeight = parseFloat(current.weight_lbs);
    const prevWeight = parseFloat(previous.weight_lbs);

    if (curWeight > prevWeight) {
      hasHigherWeight = true;
      allWeightsSame = false;
    } else if (curWeight < prevWeight) {
      hasLowerWeight = true;
      allWeightsSame = false;
    }
  }

  // Weight changes take priority
  if (hasHigherWeight) return { status: 'progressed', reason: 'higher_weight' };
  if (hasLowerWeight) return { status: 'regressed' };

  // If all weights same, compare total volume (only for matched sets)
  if (allWeightsSame) {
    let currentTotalReps = 0;
    let previousTotalReps = 0;

    for (const current of currentSets) {
      const previous = previousSets.find((s) => s.set_number === current.set_number);
      if (previous) {
        currentTotalReps += current.reps;
        previousTotalReps += previous.reps;
      }
    }

    if (currentTotalReps > previousTotalReps) {
      return {
        status: 'progressed',
        reason: 'higher_volume',
        rep_difference: currentTotalReps - previousTotalReps
      };
    }
    if (currentTotalReps < previousTotalReps) {
      return { status: 'regressed' };
    }
  }

  return { status: 'same' };
}
