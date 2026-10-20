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
}

export const HEADLINE_CYCLE: CycleEntry[] = [
  { code: "en", name: "English", text: "Is this call a scam?", reviewed: true, font: null },
  { code: "hi", name: "हिन्दी", text: "क्या यह कॉल ठगी है?", reviewed: true, font: null },
  { code: "hinglish", name: "Hinglish", text: "Kya yeh call scam hai?", reviewed: false, font: null },
  { code: "ta", name: "தமிழ்", text: "இந்த அழைப்பு மோசடியா?", reviewed: false, font: "ta" },
  { code: "te", name: "తెలుగు", text: "ఈ కాల్ మోసమా?", reviewed: false, font: "te" },
  { code: "bn", name: "বাংলা", text: "এই কলটা কি প্রতারণা?", reviewed: false, font: "bn" },
  { code: "gu", name: "ગુજરાતી", text: "શું આ કૉલ છેતરપિંડી છે?", reviewed: false, font: "gu" },
  { code: "mr", name: "मराठी", text: "हा कॉल फसवणूक आहे का?", reviewed: false, font: null },
  { code: "kn", name: "ಕನ್ನಡ", text: "ಈ ಕರೆ ವಂಚನೆಯೇ?", reviewed: false, font: "kn" },
  { code: "ml", name: "മലയാളം", text: "ഈ കോൾ തട്ടിപ്പാണോ?", reviewed: false, font: "ml" },
  { code: "pa", name: "ਪੰਜਾਬੀ", text: "ਕੀ ਇਹ ਕਾਲ ਧੋਖਾ ਹੈ?", reviewed: false, font: "pa" },
];

export const CYCLE_INTERVAL_MS = 2400;
