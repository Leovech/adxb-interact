"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** Final numeric value */
  value: number;
  /** Animation duration in ms */
  duration?: number;
  /** Decimal places to show */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Format with thousands separators */
  separator?: boolean;
  className?: string;
}

/**
 * Counts up from 0 to `value` when scrolled into view. Uses
 * requestAnimationFrame with an ease-out curve. Respects reduced-motion
 * (jumps straight to the value).
 */
export default function AnimatedCounter({
  value,
  duration = 1400,
  decimals = 0,
  prefix = "",
  suffix = "",
  separator = true,
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const run = () => {
      if (started.current) return;
      started.current = true;
      if (reduced) {
        setDisplay(value);
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        // easeOutExpo
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        setDisplay(value * eased);
        if (p < 1) requestAnimationFrame(tick);
        else setDisplay(value);
      };
      requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) run();
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  const formatted = (() => {
    const n = Number(display.toFixed(decimals));
    return separator ? n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) : n.toFixed(decimals);
  })();

  return (
    <span ref={ref} className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
