"use client";

import { Building2, Menu, X, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

const navLinks = [
  { label: "Dashboard", href: "#dashboard" },
  { label: "Trends", href: "#trends" },
  { label: "Trendy", href: "#trendy" },
  { label: "Map", href: "#map" },
  { label: "Transactions", href: "#transactions" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("adxb-theme");
    if (stored === "light") {
      document.documentElement.classList.add("light");
      setIsLight(true);
    } else {
      document.documentElement.classList.remove("light");
      setIsLight(false);
    }
  }, []);

  const toggleTheme = () => {
    const next = !isLight;
    setIsLight(next);
    if (next) {
      document.documentElement.classList.add("light");
      localStorage.setItem("adxb-theme", "light");
    } else {
      document.documentElement.classList.remove("light");
      localStorage.setItem("adxb-theme", "dark");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-card-border bg-header-bg backdrop-blur-md">
      {/* Demo Banner */}
      <div className="bg-accent/15 border-b border-accent/20 px-4 py-1.5 text-center">
        <p className="text-xs font-medium text-accent">
          DEMO &mdash; Created by{" "}
          <span className="font-bold">Sand Square Group</span>
        </p>
      </div>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
            <Building2 className="h-5 w-5 text-accent" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight tracking-tight text-foreground">
              ADXB<span className="text-accent">Interact</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted">
              Abu Dhabi Real Estate
            </span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-card-bg hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA + Theme Toggle */}
        <div className="hidden items-center gap-3 md:flex">
          <span className="text-xs text-muted">Powered by ADREC Data</span>
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input-border text-muted transition-colors hover:border-accent hover:text-accent"
            aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
            title={isLight ? "Switch to dark theme" : "Switch to light theme"}
          >
            {isLight ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
          <button className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover">
            Export Data
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input-border text-muted transition-colors hover:border-accent hover:text-accent"
            aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
          >
            {isLight ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
          <button
            className="p-2 text-muted"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-card-border bg-background p-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-card-bg hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
