import { useCallback } from 'react';

export default function useVibrate() {
  return useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }, []);
}
