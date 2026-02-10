import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Rest timer with three modes: idle, countdown, overage.
 *
 * - start(seconds): begins counting down from `seconds`
 * - At zero: transitions to overage mode (counts up) and calls onZero
 * - dismiss(): stops the timer and returns total elapsed seconds
 * - reset(): returns to idle
 */
export default function useTimer({ onZero } = {}) {
  const [mode, setMode] = useState('idle'); // 'idle' | 'countdown' | 'overage'
  const [remaining, setRemaining] = useState(0); // seconds left in countdown
  const [elapsed, setElapsed] = useState(0); // seconds over in overage
  const prescribedRef = useRef(0);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const onZeroRef = useRef(onZero);

  onZeroRef.current = onZero;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (seconds) => {
      clearTimer();
      prescribedRef.current = seconds;
      startTimeRef.current = Date.now();
      setRemaining(seconds);
      setElapsed(0);
      setMode('countdown');

      intervalRef.current = setInterval(() => {
        const totalElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

        if (totalElapsed < seconds) {
          setRemaining(seconds - totalElapsed);
        } else {
          // Transition to overage
          setRemaining(0);
          setElapsed(totalElapsed - seconds);
          setMode((prev) => {
            if (prev === 'countdown') {
              onZeroRef.current?.();
            }
            return 'overage';
          });
        }
      }, 250); // Update 4x/sec for smooth display
    },
    [clearTimer]
  );

  const dismiss = useCallback(() => {
    clearTimer();
    const totalElapsed = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;
    setMode('idle');
    setRemaining(0);
    setElapsed(0);
    return totalElapsed;
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setMode('idle');
    setRemaining(0);
    setElapsed(0);
    startTimeRef.current = null;
  }, [clearTimer]);

  // Get total elapsed at any time
  const getTotalElapsed = useCallback(() => {
    if (!startTimeRef.current) return 0;
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }, []);

  // Clean up on unmount
  useEffect(() => clearTimer, [clearTimer]);

  return {
    mode,
    remaining,
    elapsed,
    prescribed: prescribedRef.current,
    start,
    dismiss,
    reset,
    getTotalElapsed,
  };
}
