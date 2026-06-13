import { useEffect, useRef, useState } from "react";

/**
 * Catch-up factor: each frame we close ~25% of the remaining gap (normalized to
 * a 60fps frame) so the reveal accelerates on big bursts and eases out at the end.
 */
const CATCH_UP_FACTOR = 0.25;

/** Reference frame duration in milliseconds (60fps) used to normalize the step. */
const FRAME_MS = 1000 / 60;

/**
 * Smoothly reveals `target` one prefix at a time so streamed text appears with a
 * steady "typewriter" cadence even when tokens arrive in irregular network bursts.
 *
 * The reveal speed is proportional to how far behind the displayed length is, then
 * normalized by the frame delta so it stays roughly framerate-independent. When
 * streaming ends, the full target is shown immediately.
 *
 * @param target The full (possibly still-growing) text to reveal.
 * @param isStreaming Whether `target` is still being appended to.
 * @returns A prefix of `target` that animates upward toward the full string.
 */
export function useSmoothText(target: string, isStreaming: boolean): string {
  const [displayed, setDisplayed] = useState<string>(isStreaming ? "" : target);
  const countRef = useRef<number>(isStreaming ? 0 : target.length);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // A reset (or shorter/brand-new message) means the prior prefix is no longer
    // valid, so snap back to the start and animate from there.
    if (!target.startsWith(displayed)) {
      countRef.current = 0;
    }

    // Finished streaming: reveal everything at once and cancel any in-flight frame.
    // The setState is scheduled via rAF (not run synchronously) to satisfy the
    // react-hooks/set-state-in-effect rule.
    if (!isStreaming) {
      countRef.current = target.length;
      lastTimeRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (displayed !== target) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setDisplayed(target);
        });
      }

      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }

    const tick = (time: number): void => {
      const last = lastTimeRef.current ?? time;
      lastTimeRef.current = time;
      const frames = Math.max(1, (time - last) / FRAME_MS);

      const remaining = target.length - countRef.current;
      if (remaining <= 0) {
        rafRef.current = null;
        lastTimeRef.current = null;
        return;
      }

      const step = Math.max(1, Math.ceil(remaining * CATCH_UP_FACTOR * frames));
      countRef.current = Math.min(target.length, countRef.current + step);
      setDisplayed(target.slice(0, countRef.current));

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [target, isStreaming, displayed]);

  return displayed;
}
