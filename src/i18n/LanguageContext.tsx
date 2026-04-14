"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Locale, localeDir, translations } from "./translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  dir: "ltr",
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("adxb-lang") as Locale | null;
    if (stored && (stored === "en" || stored === "ar" || stored === "ru")) {
      setLocaleState(stored);
      document.documentElement.lang = stored;
      document.documentElement.dir = localeDir[stored];
      if (stored === "ar") {
        document.documentElement.classList.add("rtl");
      } else {
        document.documentElement.classList.remove("rtl");
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("adxb-lang", newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = localeDir[newLocale];
    if (newLocale === "ar") {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, dir: localeDir[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  const { locale } = useLanguage();

  const translate = useCallback(
    (key: string, ...args: (string | number)[]): string => {
      const strings = translations[locale] || translations.en;
      const enStrings = translations.en;
      let str = (strings as Record<string, string>)[key] || (enStrings as Record<string, string>)[key] || key;
      args.forEach((arg, i) => {
        str = str.replace(`{${i}}`, String(arg));
      });
      return str;
    },
    [locale]
  );

  return translate;
}
