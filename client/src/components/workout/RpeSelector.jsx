import { RPE_VALUES } from '../../utils/constants';

export default function RpeSelector({ value, onChange }) {
  return (
    <div>
      <label className="text-text-secondary text-[11px] block mb-2">RPE</label>
      <div className="flex gap-2 justify-between">
        {RPE_VALUES.map((rpe) => (
          <button
            key={rpe}
            type="button"
            onClick={() => onChange(rpe)}
            className={`w-9 h-9 rounded-lg font-mono text-sm flex items-center justify-center border ${
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
