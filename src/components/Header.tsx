"use client";

import { Menu, X, Sun, Moon, Globe, User as UserIcon, LogIn } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLanguage, useT } from "@/i18n/LanguageContext";
import { Locale, localeNames } from "@/i18n/translations";
import LogoMark from "./LogoMark";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale } = useLanguage();
  const t = useT();
  const { user, status } = useAuth();

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

  // Close lang dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const navLinks = [
    { label: t("nav_dashboard"), href: "/dashboard" },
    { label: t("nav_trends"), href: "/trends" },
    { label: t("nav_market_analysis"), href: "/market-analysis" },
    { label: t("nav_mls"), href: "/mls" },
    { label: t("nav_assistant"), href: "/assistant" },
  ];

  const langFlag: Record<Locale, string> = {
    en: "EN",
    ar: "AR",
    ru: "RU",
  };

  return (
    <header className="sticky top-0 z-50 border-b border-card-border bg-header-bg backdrop-blur-md">
      {/* Demo Banner */}
      <div className="bg-accent/15 border-b border-accent/20 px-4 py-1.5 text-center">
        <p className="text-xs font-medium text-accent">
          {t("demo_banner")} &mdash; {t("created_by")}{" "}
          <span className="font-bold">{t("brand_name")}</span>
        </p>
      </div>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 overflow-hidden">
            <LogoMark className="h-8 w-8 text-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight tracking-tight text-foreground">
              ADXB<span className="text-accent">Interact</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted">
              {t("subtitle")}
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

        {/* CTA + Theme Toggle + Language */}
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-xs text-muted">{t("powered_by")}</span>

          {/* Language Switcher */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-input-border px-2.5 text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{langFlag[locale]}</span>
            </button>
            {langOpen && (
              <div className="absolute end-0 top-full z-50 mt-1 w-36 rounded-xl border border-card-border bg-card-bg py-1 shadow-xl shadow-black/20">
                {(Object.keys(localeNames) as Locale[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLocale(lang);
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-input-bg ${
                      locale === lang ? "text-accent font-semibold" : "text-foreground"
                    }`}
                  >
                    <span className="w-6 text-center text-xs font-bold text-muted">
                      {langFlag[lang]}
                    </span>
                    {localeNames[lang]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input-border text-muted transition-colors hover:border-accent hover:text-accent"
            aria-label={isLight ? t("switch_dark") : t("switch_light")}
            title={isLight ? t("switch_dark") : t("switch_light")}
          >
            {isLight ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
          {/* Auth state */}
          {status === "authenticated" && user ? (
            <a
              href="/account"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-input-border px-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
              title={user.email}
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">
                {user.name || user.email.split("@")[0]}
              </span>
            </a>
          ) : (
            <div className="flex items-center gap-1">
              <a
                href="/sign-in"
                className="flex h-9 items-center gap-1.5 rounded-lg border border-input-border px-2.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <LogIn className="h-3.5 w-3.5" />
                {t("nav_sign_in")}
              </a>
              <a
                href="/sign-up"
                className="flex h-9 items-center rounded-lg bg-accent px-3 text-xs font-semibold text-background transition-colors hover:bg-accent-hover"
              >
                {t("nav_sign_up")}
              </a>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile Language */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex h-9 items-center gap-1 rounded-lg border border-input-border px-2 text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold">{langFlag[locale]}</span>
            </button>
            {langOpen && (
              <div className="absolute end-0 top-full z-50 mt-1 w-36 rounded-xl border border-card-border bg-card-bg py-1 shadow-xl shadow-black/20">
                {(Object.keys(localeNames) as Locale[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLocale(lang);
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-input-bg ${
                      locale === lang ? "text-accent font-semibold" : "text-foreground"
                    }`}
                  >
                    <span className="w-6 text-center text-xs font-bold text-muted">
                      {langFlag[lang]}
                    </span>
                    {localeNames[lang]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input-border text-muted transition-colors hover:border-accent hover:text-accent"
            aria-label={isLight ? t("switch_dark") : t("switch_light")}
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
            <div className="my-2 border-t border-card-border" />
            {status === "authenticated" && user ? (
              <a
                href="/account"
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-card-bg"
                onClick={() => setMobileOpen(false)}
              >
                <UserIcon className="h-4 w-4 text-accent" />
                {user.name || user.email.split("@")[0]}
              </a>
            ) : (
              <>
                <a
                  href="/sign-in"
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-card-bg"
                  onClick={() => setMobileOpen(false)}
                >
                  <LogIn className="h-4 w-4" />
                  {t("nav_sign_in")}
                </a>
                <a
                  href="/sign-up"
                  className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-background"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav_sign_up")}
                </a>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
