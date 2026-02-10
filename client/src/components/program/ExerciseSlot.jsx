import { formatTime } from '../../utils/formatters';

export default function ExerciseSlot({ exercise, exIdx, isFirst, isLast, onMove, onEdit, onRemove }) {
  const restLabel = exercise.rest_seconds ? formatTime(exercise.rest_seconds) : '—';

  return (
    <div className="flex items-center justify-between mb-3 p-2 bg-[#12122a] rounded-lg">
      <div className="flex items-center gap-2 min-w-0">
        {/* Move up/down */}
        <div className="flex flex-col">
          <button
            onClick={() => onMove(exIdx, -1)}
            disabled={isFirst}
            className={`text-xs bg-transparent border-none min-w-[44px] min-h-[22px] leading-none ${isFirst ? 'text-text-muted/30 cursor-default' : 'text-text-muted cursor-pointer'}`}
          >
            ▲
          </button>
          <button
            onClick={() => onMove(exIdx, 1)}
            disabled={isLast}
            className={`text-xs bg-transparent border-none min-w-[44px] min-h-[22px] leading-none ${isLast ? 'text-text-muted/30 cursor-default' : 'text-text-muted cursor-pointer'}`}
          >
            ▼
          </button>
        </div>

        <div className="min-w-0">
          <div className="text-text-primary text-[13px] font-medium truncate">
            {exercise.exercise_name}
          </div>
          <div className="text-text-muted text-[11px]">
            {exercise.target_sets} sets &middot; {restLabel} rest
            {exercise.superset_with_next && (
              <span className="text-[#a78bfa] ml-1">⚡ superset</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        <button
          onClick={() => onEdit(exIdx)}
          className="text-accent text-xs bg-transparent border-none cursor-pointer min-w-[44px] min-h-[44px]"
        >
          Edit
        </button>
        <button
          onClick={() => onRemove(exIdx)}
          className="text-[#f87171] text-xs bg-transparent border-none cursor-pointer min-w-[44px] min-h-[44px]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
