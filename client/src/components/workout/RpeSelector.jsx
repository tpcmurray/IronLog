import { RPE_VALUES } from '../../utils/constants';

export default function RpeSelector({ value, onChange }) {
  return (
    <div>
      <label className="text-text-secondary text-[11px] block mb-2">RPE</label>
      <div className="flex gap-1 justify-between">
        {RPE_VALUES.map((rpe) => (
          <button
            key={rpe}
            type="button"
            onClick={() => onChange(rpe)}
            className={`min-w-[44px] min-h-[44px] rounded-lg font-mono text-xs flex items-center justify-center border ${
              value === rpe
                ? 'bg-accent border-accent text-white'
                : 'bg-bg-card border-border-light text-text-secondary'
            }`}
          >
            {rpe}
          </button>
        ))}
      </div>
    </div>
  );
}
