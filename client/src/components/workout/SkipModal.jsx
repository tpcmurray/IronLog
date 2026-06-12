import { useState } from 'react';

export default function SkipModal({ exerciseName, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-bg-card border border-border-light rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-text-primary text-lg font-semibold mb-1">
          Skip {exerciseName}?
        </h3>
        <p className="text-text-muted text-sm mb-4">
          This exercise will be marked as skipped for today.
        </p>

        <label className="text-text-secondary text-sm block mb-1.5">
          Reason (optional)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., shoulder pain"
          className="w-full bg-bg-card border border-border-light rounded-lg px-4 py-3 text-white text-base text-left focus:border-accent focus:outline-none mb-4"
        />

        <button
          onClick={() => onConfirm(reason || undefined)}
          className="w-full rounded-xl py-4 text-lg font-semibold text-white bg-danger mb-2"
        >
          Skip Exercise
        </button>
        <button
          onClick={onCancel}
          className="w-full bg-transparent text-text-secondary font-medium text-sm py-2 min-h-[44px]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
