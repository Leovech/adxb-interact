"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion, animate as fmAnimate } from "framer-motion";

interface Props {
  /** Final numeric value */
  value: number;
  /** Animation duration in seconds */
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
 * Counts up from 0 to `value` once, the first time it scrolls into view.
 * Uses framer-motion's useInView (fires correctly even when the element is
 * already mostly on-screen at initial paint, unlike a bare
 * IntersectionObserver with a high area threshold). Respects
 * prefers-reduced-motion (jumps straight to the value).
 */
export default function AnimatedCounter({
  value,
  duration = 1.5,
  decimals = 0,
  prefix = "",
  suffix = "",
  separator = true,
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = fmAnimate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  const formatted = (() => {
    const n = Number(display.toFixed(decimals));
    return separator
      ? n.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : n.toFixed(decimals);
  })();

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
