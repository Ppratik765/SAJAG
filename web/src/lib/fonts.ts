import { Bricolage_Grotesque, Mukta, Kalam } from "next/font/google";

// next/font variables use an `--nf-` prefix so the Tailwind @theme tokens
// (`--font-display` etc.) can reference them without a self-reference.
export const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--nf-display",
  display: "swap",
});

export const fontBody = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "700", "800"],
  variable: "--nf-body",
  display: "swap",
});

export const fontHand = Kalam({
  subsets: ["latin", "devanagari"],
  weight: ["400", "700"],
  variable: "--nf-hand",
  display: "swap",
});
