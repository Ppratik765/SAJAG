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
    { href: "/spot", label: t("nav.spot") },
    { href: "/parent", label: t("nav.parent") },
    { href: "/demo", label: t("nav.demo") },
    { href: "/accuracy", label: t("nav.accuracy") },
    { href: "/about", label: t("nav.about") },
  ];

  const handleThemeToggle = (e: React.MouseEvent) => {
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      const x = e.clientX;
      const y = e.clientY;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = (document as unknown as { startViewTransition: (cb: () => void) => { ready: Promise<void> } }).startViewTransition(() => {
        toggleTheme();
      });

      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 350,
              easing: "ease-in-out",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => {});
    } else {
      toggleTheme();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)]">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1">
        {/* Brand: Seal + Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[var(--stamp)] rounded-lg p-0.5 shrink-0"
          aria-label="Sajag Home"
        >
          <Seal size={30} variant="brand" />
          <span className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-[var(--ink)] leading-none">
            {locale === "hi" ? "सजग" : "Sajag"}
          </span>
        </Link>

        {/* Desktop Nav: single-line, whitespace-nowrap, collapses below 1100px */}
        <nav className="hidden min-[1100px]:flex items-center gap-5 text-sm font-medium text-[var(--ink-muted)] whitespace-nowrap">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative py-1 transition-colors hover:text-[var(--ink)] whitespace-nowrap ${
                  active ? "text-[var(--stamp)] font-bold" : ""
                }`}
              >
                <span>{link.label}</span>
                {active && (
                  <svg
                    className="absolute -bottom-0.5 left-0 right-0 w-full h-[5px] text-[var(--stamp)] pointer-events-none animate-[penWriteReveal_250ms_ease-out]"
                    viewBox="0 0 40 5"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M 1,3 Q 20,1 39,3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
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

          {/* Theme Toggle (circular reveal) */}
          <button
            type="button"
            onClick={handleThemeToggle}
            className="p-1.5 sm:p-2 rounded-full border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink)] hover:bg-[var(--line)]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--stamp)]"
            aria-label={theme === "light" ? "Switch to dark night ink" : "Switch to light paper"}
            title={theme === "light" ? "Night ink mode" : "Light paper mode"}
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {/* Mobile Menu Button (below 1100px) */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="min-[1100px]:hidden p-1.5 sm:p-2 rounded-full border border-[var(--line)] bg-[var(--sheet)] text-[var(--ink)]"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (below 1100px) */}
      {mobileOpen && (
        <div className="min-[1100px]:hidden border-t border-[var(--line)] bg-[var(--bg)] px-4 py-4 space-y-2 animate-[penWriteReveal_200ms_ease-out]">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block py-2 text-sm font-semibold rounded-md px-3 transition-colors ${
                  active
                    ? "bg-[var(--stamp)] text-white"
                    : "text-[var(--ink)] hover:bg-[var(--line)]/20"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
