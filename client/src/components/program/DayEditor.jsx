import ExerciseSlot from './ExerciseSlot';

export default function DayEditor({
  day,
  expanded,
  onToggle,
  onAddExercise,
  onRemoveExercise,
  onMoveExercise,
  onEditSlot,
  onToggleRestDay,
}) {
  const exerciseCount = day.exercises?.length || 0;
  const supersetCount = day.exercises?.filter((e) => e.superset_with_next).length || 0;

  let subtitle = day.is_rest_day
    ? 'Rest Day'
    : `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}`;
  if (supersetCount > 0) {
    subtitle += ` (${supersetCount} superset)`;
  }

  return (
    <div
      className={`bg-[#1a1a30] border border-border rounded-xl mb-2 ${day.is_rest_day ? 'opacity-50' : ''}`}
    >
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-text-primary text-base font-semibold">{day.label}</span>
          <span className="text-text-muted text-xs">{subtitle}</span>
        </div>
        <span className={expanded ? 'text-accent' : 'text-text-muted'}>
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-3 py-3">
          {/* Rest day toggle */}
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={day.is_rest_day}
              onChange={onToggleRestDay}
              className="accent-accent"
            />
            <span className="text-text-secondary text-xs">Rest day</span>
          </label>

          {!day.is_rest_day && (
            <>
              {/* Exercise list */}
              {day.exercises?.map((ex, i) => (
                <ExerciseSlot
                  key={ex.id || `new-${i}`}
                  exercise={ex}
                  exIdx={i}
                  isFirst={i === 0}
                  isLast={i === day.exercises.length - 1}
                  onMove={onMoveExercise}
                  onEdit={onEditSlot}
                  onRemove={onRemoveExercise}
                />
              ))}

              {/* Add exercise button */}
              <button
                onClick={onAddExercise}
                className="text-accent text-[13px] font-medium bg-transparent border-none cursor-pointer p-2"
              >
                + Add Exercise
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
