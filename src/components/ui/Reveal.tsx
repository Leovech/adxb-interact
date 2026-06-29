"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Stagger index 1-6 → adds a transition-delay class */
  delay?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  /** Render as a different element (default div) */
  as?: "div" | "section" | "li" | "article";
}

/**
 * Scroll-triggered entrance. Adds `.is-visible` when the element enters the
 * viewport (once). The actual animation is the `.reveal` CSS class in
 * globals.css. Falls back to visible if IntersectionObserver is missing.
 */
export default function Reveal({
  children,
  delay,
  className = "",
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const cls = [
    "reveal",
    delay ? `stagger-${delay}` : "",
    visible ? "is-visible" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const Tag = as as "div";
  return (
    <Tag ref={ref as React.Ref<HTMLDivElement>} className={cls}>
      {children}
    </Tag>
  );
}
