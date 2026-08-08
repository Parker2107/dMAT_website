"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A stopwatch driven by performance.now(). Date.now() is deliberately avoided:
 * it jumps when the system clock is adjusted, which would corrupt the recorded
 * time for a question.
 *
 * The clock origin is set inside an effect rather than during render, so a
 * double render under concurrent React cannot silently reset it.
 */
export function useStopwatch() {
  const originRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    originRef.current ??= performance.now();
    const id = setInterval(() => {
      // Read the origin on every tick, so restart() takes effect immediately
      // without having to tear the interval down.
      setElapsedMs(performance.now() - (originRef.current ?? performance.now()));
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  /** Freezes the clock and returns the exact elapsed time. */
  const stop = useCallback(() => {
    const final = performance.now() - (originRef.current ?? performance.now());
    setElapsedMs(final);
    setRunning(false);
    return final;
  }, []);

  const restart = useCallback(() => {
    originRef.current = performance.now();
    setElapsedMs(0);
    setRunning(true);
  }, []);

  return { elapsedMs, running, stop, restart };
}

/** Counts down from a fixed budget; used for the 25-minute exam sets. */
export function useCountdown(totalMs: number, onExpire?: () => void) {
  const [remainingMs, setRemainingMs] = useState(totalMs);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    const origin = performance.now();
    let expired = false;

    const id = setInterval(() => {
      const left = totalMs - (performance.now() - origin);
      setRemainingMs(Math.max(0, left));
      if (left <= 0 && !expired) {
        expired = true;
        onExpireRef.current?.();
      }
    }, 250);

    return () => clearInterval(id);
  }, [totalMs]);

  return { remainingMs, expired: remainingMs <= 0 };
}
