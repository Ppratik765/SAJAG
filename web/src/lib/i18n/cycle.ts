// Headline strings for the cycling hero. Native speakers must review every
// entry marked `reviewed: false` before public launch (spec section 13).

export interface CycleEntry {
  code: string;
  /** Language name written in its own script, used on the chips. */
  name: string;
  text: string;
  reviewed: boolean;
  /** Key into SCRIPT_FONT_FAMILIES, or null if the base fonts cover it. */
  font: string | null;
  /** Relative font scale to ensure no script wraps to 3 lines or clips. */
  scale: number;
}

export const HEADLINE_CYCLE: CycleEntry[] = [
  { code: "en", name: "English", text: "Is this call a scam?", reviewed: true, font: null, scale: 1.0 },
  { code: "hi", name: "हिन्दी", text: "क्या यह कॉल ठगी है?", reviewed: true, font: null, scale: 0.95 },
  { code: "hinglish", name: "Hinglish", text: "Kya yeh call scam hai?", reviewed: false, font: null, scale: 0.95 },
  { code: "ta", name: "தமிழ்", text: "இந்த அழைப்பு மோசடியா?", reviewed: false, font: "ta", scale: 0.58 },
  { code: "te", name: "తెలుగు", text: "ఈ కాల్ మోసమా?", reviewed: false, font: "te", scale: 0.80 },
  { code: "bn", name: "বাংলা", text: "এই কলটা কি প্রতারণা?", reviewed: false, font: "bn", scale: 0.86 },
  { code: "gu", name: "ગુજરાતી", text: "શું આ કૉલ છેતરપિંડી છે?", reviewed: false, font: "gu", scale: 0.74 },
  { code: "mr", name: "मराठी", text: "हा कॉल फसवणूक आहे का?", reviewed: false, font: null, scale: 0.65 },
  { code: "kn", name: "ಕನ್ನಡ", text: "ಈ ಕರೆ ವಂಚನೆಯೇ?", reviewed: false, font: "kn", scale: 0.78 },
  { code: "ml", name: "മലയാളം", text: "ഈ കോൾ തട്ടിപ്പാണോ?", reviewed: false, font: "ml", scale: 0.70 },
  { code: "pa", name: "ਪੰਜਾਬੀ", text: "ਕੀ ਇਹ ਕਾਲ ਧੋਖਾ ਹੈ?", reviewed: false, font: "pa", scale: 0.86 },
];

export const CYCLE_INTERVAL_MS = 2400;
