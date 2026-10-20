"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, Menu, X } from "lucide-react";
import { Seal } from "../ui/Seal";
import { useI18n } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";

export function AppHeader() {
  const { locale, setLocale, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/live", label: t("nav.live") },
    { href: "/check", label: t("nav.check") },
    { href: "/paste", label: t("nav.paste") },
    { href: "/parent", label: t("nav.parent") },
    { href: "/demo", label: t("nav.demo") },
    { href: "/accuracy", label: t("nav.accuracy") },
    { href: "/about", label: t("nav.about") },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)]">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-6 h-16 flex items-center justify-between gap-1">
        {/* Brand: Seal + Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-[var(--stamp)] rounded-lg p-0.5 shrink-0"
          aria-label="Sajag Home"
        >
          <Seal size={30} variant="brand" />
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-[var(--ink)] leading-none">
              {locale === "hi" ? "सजग" : "Sajag"}
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)]">
              Scam Shield
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-[var(--ink-muted)]">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-[var(--ink)] ${
                  active ? "text-[var(--stamp)] font-bold" : ""
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Toggles: Language, Theme & Mobile Menu */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Language Toggle */}
          <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--sheet)] p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full transition-colors text-[11px] sm:text-xs ${
                locale === "en"
                  ? "bg-[var(--stamp)] text-white"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
              aria-label="Switch to English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("hi")}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full transition-colors font-semibold text-[11px] sm:text-xs ${
                locale === "hi"
                  ? "bg-[var(--stamp)] text-white"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
              aria-label="Switch to Hindi (हिन्दी)"
            >
              हिं
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-full border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink)] hover:bg-[var(--line)]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--stamp)]"
            aria-label={theme === "light" ? "Switch to dark night ink" : "Switch to light paper"}
            title={theme === "light" ? "Night ink mode" : "Light paper mode"}
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-1.5 sm:p-2 rounded-full border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink)]"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-[var(--line)] bg-[var(--sheet)] px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-[var(--ink)] hover:bg-[var(--line)]/10"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[var(--line)]">
            <Link
              href="/dev/ui"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-1.5 text-xs text-[var(--ink-muted)] italic"
            >
              Component Gallery (/dev/ui)
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
