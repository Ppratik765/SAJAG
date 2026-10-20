// Extra script fonts for the cycling hero headline. This module is only ever
// loaded through a dynamic import() after the hero is interactive, so these
// fonts are not part of the initial page payload. Weight 700, script subset only.
import {
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
  Noto_Sans_Bengali,
  Noto_Sans_Gujarati,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Gurmukhi,
} from "next/font/google";

const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], weight: "700", preload: false, display: "swap" });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], weight: "700", preload: false, display: "swap" });
const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], weight: "700", preload: false, display: "swap" });
const gujarati = Noto_Sans_Gujarati({ subsets: ["gujarati"], weight: "700", preload: false, display: "swap" });
const kannada = Noto_Sans_Kannada({ subsets: ["kannada"], weight: "700", preload: false, display: "swap" });
const malayalam = Noto_Sans_Malayalam({ subsets: ["malayalam"], weight: "700", preload: false, display: "swap" });
const gurmukhi = Noto_Sans_Gurmukhi({ subsets: ["gurmukhi"], weight: "700", preload: false, display: "swap" });

export const SCRIPT_FONT_FAMILIES: Record<string, string> = {
  ta: tamil.style.fontFamily,
  te: telugu.style.fontFamily,
  bn: bengali.style.fontFamily,
  gu: gujarati.style.fontFamily,
  kn: kannada.style.fontFamily,
  ml: malayalam.style.fontFamily,
  pa: gurmukhi.style.fontFamily,
};
