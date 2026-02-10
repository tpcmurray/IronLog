import { useState, useEffect } from 'react';
import { subscribe, getToasts, dismissToast } from '../../utils/toastStore';

export default function Toasts() {
  const [toasts, setToasts] = useState(getToasts);

  useEffect(() => subscribe(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg flex items-center justify-between ${
            t.type === 'error'
              ? 'bg-[#dc2626] text-white'
              : t.type === 'success'
                ? 'bg-[#166534] text-white'
                : 'bg-[#92400e] text-white'
          }`}
        >
          <span>{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="ml-3 bg-transparent border-none text-white/70 text-lg cursor-pointer leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
