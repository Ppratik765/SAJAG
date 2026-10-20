"use client";

import React, { createContext, useContext, useSyncExternalStore } from "react";
import en from "./en.json";
import hi from "./hi.json";

export type Locale = "en" | "hi";

type DeepStringRecord = {
  [k: string]: string | string[] | DeepStringRecord;
};

const dictionaries: Record<Locale, DeepStringRecord> = { en, hi };

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (keyPath: string) => string;
  tArray: (keyPath: string) => string[];
}

const I18nContext = createContext<I18nContextType | null>(null);

let currentLocale: Locale = "hi";
const localeListeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("sajag_locale") as Locale | null;
    if (saved === "en" || saved === "hi") {
      currentLocale = saved;
    }
  } catch {
    // ignore
  }
}

function subscribeLocale(listener: () => void) {
  localeListeners.add(listener);
  return () => {
    localeListeners.delete(listener);
  };
}

function getLocaleSnapshot(): Locale {
  return currentLocale;
}

function getServerLocaleSnapshot(): Locale {
  return "hi";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getServerLocaleSnapshot);

  const setLocale = (l: Locale) => {
    currentLocale = l;
    try {
      localStorage.setItem("sajag_locale", l);
      document.documentElement.lang = l;
    } catch {
      // ignore
    }
    for (const listener of localeListeners) {
      listener();
    }
  };

  const resolve = (keyPath: string): unknown => {
    const keys = keyPath.split(".");
    let curr: unknown = dictionaries[locale];
    for (const k of keys) {
      if (curr && typeof curr === "object" && k in curr) {
        curr = (curr as Record<string, unknown>)[k];
      } else {
        // Fallback to english
        let fb: unknown = dictionaries.en;
        for (const fbk of keys) {
          if (fb && typeof fb === "object" && fbk in fb) {
            fb = (fb as Record<string, unknown>)[fbk];
          } else {
            return keyPath;
          }
        }
        return fb;
      }
    }
    return curr;
  };

  const t = (keyPath: string): string => {
    const val = resolve(keyPath);
    return typeof val === "string" ? val : keyPath;
  };

  const tArray = (keyPath: string): string[] => {
    const val = resolve(keyPath);
    return Array.isArray(val) ? (val as string[]) : [];
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, tArray }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
