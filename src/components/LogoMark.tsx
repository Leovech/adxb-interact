/**
 * Sand Square Group logo mark — wavy lines transitioning from
 * foreground color (top) to accent gold (bottom).
 * Fully theme-aware: top waves use currentColor, bottom use --accent.
 */
export default function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  const accent = "var(--accent)";
  const accentHover = "var(--accent-hover)";

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Top waves — currentColor (adapts to dark/light theme) */}
      <path
        d="M0 8 Q8.3 2 16.7 8 Q25 14 33.3 8 Q41.7 2 50 8 Q58.3 14 66.7 8 Q75 2 83.3 8 Q91.7 14 100 8"
        stroke="currentColor"
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M0 20 Q8.3 14 16.7 20 Q25 26 33.3 20 Q41.7 14 50 20 Q58.3 26 66.7 20 Q75 14 83.3 20 Q91.7 26 100 20"
        stroke="currentColor"
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M0 32 Q8.3 26 16.7 32 Q25 38 33.3 32 Q41.7 26 50 32 Q58.3 38 66.7 32 Q75 26 83.3 32 Q91.7 38 100 32"
        stroke="currentColor"
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Transition wave */}
      <path
        d="M0 44 Q8.3 38 16.7 44 Q25 50 33.3 44 Q41.7 38 50 44 Q58.3 50 66.7 44 Q75 38 83.3 44 Q91.7 50 100 44"
        stroke="currentColor"
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* Bottom waves — accent gold */}
      <path
        d="M0 56 Q8.3 50 16.7 56 Q25 62 33.3 56 Q41.7 50 50 56 Q58.3 62 66.7 56 Q75 50 83.3 56 Q91.7 62 100 56"
        style={{ stroke: accent }}
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M0 68 Q8.3 62 16.7 68 Q25 74 33.3 68 Q41.7 62 50 68 Q58.3 74 66.7 68 Q75 62 83.3 68 Q91.7 74 100 68"
        style={{ stroke: accent }}
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path
        d="M0 80 Q8.3 74 16.7 80 Q25 86 33.3 80 Q41.7 74 50 80 Q58.3 86 66.7 80 Q75 74 83.3 80 Q91.7 86 100 80"
        style={{ stroke: accent }}
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M0 92 Q8.3 86 16.7 92 Q25 98 33.3 92 Q41.7 86 50 92 Q58.3 98 66.7 92 Q75 86 83.3 92 Q91.7 98 100 92"
        style={{ stroke: accentHover }}
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
