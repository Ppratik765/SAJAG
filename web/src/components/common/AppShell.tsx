"use client";

import React from "react";
import { ThemeProvider } from "@/lib/theme/context";
import { I18nProvider } from "@/lib/i18n/context";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <div className="flex flex-col min-h-screen">
          <AppHeader />
          <div className="flex-1">{children}</div>
          <AppFooter />
        </div>
      </I18nProvider>
    </ThemeProvider>
  );
}
