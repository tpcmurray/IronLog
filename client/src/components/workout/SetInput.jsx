import { useState, useEffect } from 'react';
import RpeSelector from './RpeSelector';

export default function SetInput({ setNumber, targetSets, prefill, onLogSet }) {
  const [weight, setWeight] = useState(prefill.weight);
  const [reps, setReps] = useState(prefill.reps);
  const [rpe, setRpe] = useState(null);
  const [saving, setSaving] = useState(false);

  // Update pre-fill when set number or exercise changes
  useEffect(() => {
    setWeight(prefill.weight);
    setReps(prefill.reps);
    setRpe(null);
  }, [prefill.weight, prefill.reps]);

  const canLog = weight !== '' && reps !== '' && rpe !== null && !saving;

  async function handleLog() {
    if (!canLog) return;
    setSaving(true);
    try {
      await onLogSet({ weight, reps, rpe });
      // Reset RPE for next set (weight/reps will update via prefill)
      setRpe(null);
    } catch {
      // Error handling will be added in Phase 21
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#1e1e3a] border border-accent rounded-lg p-4 mb-4">
      <div className="text-accent text-[11px] font-semibold mb-3">
        SET {setNumber} of {targetSets} &mdash; NOW
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-text-secondary text-[11px] block mb-1">Weight (lbs)</label>
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-bg-card border border-border-light rounded-lg px-4 py-3 text-white text-lg font-mono text-center focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="text-text-secondary text-[11px] block mb-1">Reps</label>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="w-full bg-bg-card border border-border-light rounded-lg px-4 py-3 text-white text-lg font-mono text-center focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <RpeSelector value={rpe} onChange={setRpe} />

      <button
        onClick={handleLog}
        disabled={!canLog}
        className="w-full rounded-xl py-4 text-lg font-semibold text-white bg-accent disabled:opacity-40 mt-4"
      >
        {saving ? 'Logging...' : 'Log Set'}
      </button>
    </div>
  );
}
