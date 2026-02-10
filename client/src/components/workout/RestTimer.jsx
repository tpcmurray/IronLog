import { formatTime } from '../../utils/formatters';

export default function RestTimer({ mode, remaining, elapsed, prescribed, nextSetNumber, targetSets, onDismiss }) {
  if (mode === 'idle') return null;

  const isOverage = mode === 'overage';
  const totalRest = prescribed + elapsed;

  return (
    <div
      className={`rounded-2xl p-6 text-center my-6 ${
        isOverage
          ? 'bg-gradient-to-br from-[#451a03] to-[#1c0a00] border border-[#92400e]'
          : 'bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#334155]'
      }`}
    >
      {/* Header label */}
      {isOverage ? (
        <div className="text-[#92400e] text-[11px] tracking-[0.15em] uppercase mb-2">
          &#9888; Over prescribed rest ({formatTime(prescribed)})
        </div>
      ) : (
        <div className="text-text-muted text-[11px] tracking-[0.15em] uppercase mb-2">
          Rest &mdash; {formatTime(prescribed)} prescribed
        </div>
      )}

      {/* Big timer digits */}
      <div
        className={`font-mono text-[64px] font-bold leading-none ${
          isOverage ? 'text-progress-same' : 'text-text-primary'
        }`}
      >
        {isOverage ? `+${formatTime(elapsed)}` : formatTime(remaining)}
      </div>

      {/* Sub-label */}
      {isOverage ? (
        <div className="text-[#92400e] text-xs mt-2">
          Total rest: {formatTime(totalRest)}
        </div>
      ) : (
        <div className="text-text-muted text-xs mt-2">
          Next: Set {nextSetNumber} of {targetSets}
        </div>
      )}

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="mt-4 bg-transparent text-text-secondary font-medium text-[13px] px-4 py-2 border-none cursor-pointer"
      >
        Dismiss Timer
      </button>
    </div>
  );
}
