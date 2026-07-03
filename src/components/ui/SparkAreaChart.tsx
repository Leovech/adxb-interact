"use client";

import { useEffect, useId, useRef, useState } from "react";
import { animate as fmAnimate, useReducedMotion } from "framer-motion";

export interface SparkPoint {
  label: string;
  value: number;
}

interface Props {
  data: SparkPoint[];
  height?: number;
  /** Format the tooltip value */
  formatValue?: (n: number) => string;
  /** Show min/max/last footer */
  showFooter?: boolean;
  className?: string;
  /** Accent css color var name, default --accent */
  color?: string;
  /** Count the footer's "Now" value up from 0 once the chart draws in */
  animateNow?: boolean;
}

/**
 * Animated SVG area chart with:
 *  - line-draw entrance animation (stroke-dashoffset)
 *  - gradient area fill that fades in
 *  - hover tooltip + crosshair tracking the nearest point
 * No external chart lib — prints clean and stays light.
 */
export default function SparkAreaChart({
  data,
  height = 220,
  formatValue = (n) => n.toLocaleString(),
  showFooter = true,
  className = "",
  animateNow = false,
}: Props) {
  const gradId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [animate, setAnimate] = useState(false);
  const [nowDisplay, setNowDisplay] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setAnimate(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) { setAnimate(true); obs.disconnect(); }
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!animateNow || !animate) return;
    const lastVal = data[data.length - 1]?.value;
    if (lastVal === undefined) return;
    if (reducedMotion) {
      setNowDisplay(lastVal);
      return;
    }
    const controls = fmAnimate(0, lastVal, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => setNowDisplay(v),
    });
    return () => controls.stop();
  }, [animateNow, animate, data, reducedMotion]);

  if (data.length < 2) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-card-border bg-card-bg/40 text-sm text-muted ${className}`} style={{ height }}>
        Not enough data to plot
      </div>
    );
  }

  const w = 800;
  const padX = 12;
  const padY = 22;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (w - padX * 2) / (data.length - 1);

  const xOf = (i: number) => padX + i * stepX;
  const yOf = (v: number) => padY + (height - padY * 2) * (1 - (v - min) / span);

  const linePts = data.map((d, i) => `${xOf(i)},${yOf(d.value)}`).join(" ");
  const areaPts = `${padX},${height - padY} ${linePts} ${xOf(data.length - 1)},${height - padY}`;

  const first = values[0];
  const last = values[values.length - 1];
  const delta = first > 0 ? ((last - first) / first) * 100 : 0;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.round((x - padX) / stepX);
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const ticks = [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <div className={`rounded-xl border border-card-border bg-card-bg/40 p-4 ${className}`}>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted">{data[0].label} → {data[data.length - 1].label}</span>
        <span className={`font-semibold ${delta >= 0 ? "text-positive" : "text-negative"}`}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
        </span>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${height}`}
          className="w-full touch-none"
          preserveAspectRatio="none"
          onMouseMove={onMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={`area-${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* area fill */}
          <polygon
            points={areaPts}
            fill={`url(#area-${gradId})`}
            style={{ opacity: animate ? 1 : 0, transition: "opacity 0.8s ease 0.3s" }}
          />

          {/* drawn line */}
          <polyline
            points={linePts}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: animate ? 0 : 1,
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)",
            }}
          />

          {/* hover crosshair + dot */}
          {hoverIdx !== null && (
            <>
              <line
                x1={xOf(hoverIdx)} y1={padY}
                x2={xOf(hoverIdx)} y2={height - padY}
                stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.4"
              />
              <circle cx={xOf(hoverIdx)} cy={yOf(data[hoverIdx].value)} r="4.5" fill="var(--accent)" />
              <circle cx={xOf(hoverIdx)} cy={yOf(data[hoverIdx].value)} r="8" fill="var(--accent)" fillOpacity="0.2" />
            </>
          )}
        </svg>

        {/* tooltip */}
        {hoverIdx !== null && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-card-border bg-card-bg px-2.5 py-1.5 text-center shadow-lg"
            style={{
              left: `${(xOf(hoverIdx) / w) * 100}%`,
              top: 0,
            }}
          >
            <p className="text-[10px] text-muted">{data[hoverIdx].label}</p>
            <p className="text-sm font-bold text-foreground">{formatValue(data[hoverIdx].value)}</p>
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-muted">
        {ticks.map((i) => <span key={i}>{data[i].label}</span>)}
      </div>

      {showFooter && (
        <div className="mt-2 grid grid-cols-3 gap-2 border-t border-card-border pt-2 text-[11px]">
          <div>Min <span className="font-semibold text-foreground">{formatValue(min)}</span></div>
          <div className="text-center">Max <span className="font-semibold text-foreground">{formatValue(max)}</span></div>
          <div className="text-right">Now <span className="font-semibold text-foreground">{formatValue(animateNow ? nowDisplay : last)}</span></div>
        </div>
      )}
    </div>
  );
}
