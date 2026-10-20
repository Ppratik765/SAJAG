import { Bricolage_Grotesque, Mukta, Kalam } from "next/font/google";

export const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const fontBody = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const fontHand = Kalam({
  subsets: ["latin", "devanagari"],
  weight: ["400", "700"],
  variable: "--font-hand",
  display: "swap",
});
