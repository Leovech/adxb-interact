"use client";

import { useEffect, useRef, useState } from "react";

export interface BarPoint {
  label: string;
  value: number;
}

interface Props {
  data: BarPoint[];
  height?: number;
  formatValue?: (n: number) => string;
  className?: string;
}

/**
 * Animated horizontal/vertical bar chart. Bars grow from 0 on scroll-in,
 * staggered left-to-right. Hover highlights a bar + shows its value.
 */
export default function AnimatedBars({
  data,
  height = 140,
  formatValue = (n) => n.toLocaleString(),
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [animate, setAnimate] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setAnimate(true); return; }
    const obs = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) { setAnimate(true); obs.disconnect(); } },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (data.length === 0) {
    return <div className={`flex items-center justify-center text-sm text-muted ${className}`} style={{ height }}>No data</div>;
  }

  const max = Math.max(...data.map((d) => d.value)) || 1;

  return (
    <div ref={ref} className={`rounded-xl border border-card-border bg-card-bg/40 p-4 ${className}`}>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const isHover = hover === i;
          return (
            <div
              key={i}
              className="group relative flex flex-1 items-end"
              style={{ height: "100%" }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={`w-full rounded-t transition-colors ${isHover ? "bg-accent" : "bg-accent/55"}`}
                style={{
                  height: animate ? `${pct}%` : "0%",
                  transition: `height 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 12}ms, background-color 0.2s`,
                }}
              />
              {isHover && (
                <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-card-border bg-card-bg px-2 py-1 text-center shadow-lg">
                  <p className="text-[9px] text-muted">{d.label}</p>
                  <p className="text-xs font-bold text-foreground">{formatValue(d.value)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted">
        <span>{data[0].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}
