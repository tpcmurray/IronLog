export function compareProgression(currentSets, previousSets) {
  if (!previousSets || previousSets.length === 0) {
    return { status: 'first_time' };
  }

  let hasHigherWeight = false;
  let hasHigherReps = false;
  let hasLowerPerformance = false;

  for (const current of currentSets) {
    const previous = previousSets.find((s) => s.set_number === current.set_number);
    if (!previous) continue;

    const curWeight = parseFloat(current.weight_lbs);
    const prevWeight = parseFloat(previous.weight_lbs);

    if (curWeight > prevWeight) {
      hasHigherWeight = true;
    } else if (curWeight === prevWeight) {
      if (current.reps > previous.reps) {
        hasHigherReps = true;
      } else if (current.reps < previous.reps) {
        hasLowerPerformance = true;
      }
    } else {
      hasLowerPerformance = true;
    }
  }

  if (hasHigherWeight) return { status: 'progressed', reason: 'higher_weight' };
  if (hasHigherReps) return { status: 'progressed', reason: 'higher_reps' };
  if (!hasLowerPerformance) return { status: 'same' };
  return { status: 'regressed' };
}
