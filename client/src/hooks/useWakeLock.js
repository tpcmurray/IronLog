import { useRef, useEffect } from 'react';

export default function useWakeLock(active) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let released = false;

    navigator.wakeLock.request('screen').then((lock) => {
      if (released) {
        lock.release();
      } else {
        lockRef.current = lock;
      }
    }).catch(() => {
      // Wake lock not available or denied
    });

    return () => {
      released = true;
      if (lockRef.current) {
        lockRef.current.release().catch(() => {});
        lockRef.current = null;
      }
    };
  }, [active]);
}
