// Data-driven scripted call timeline for the hero Living CallSheet.
// Both Hindi and English versions are defined. Every mark evidence MUST
// be an exact substring of its line text.

export interface ScriptMark {
  id: string;
  category: string;
  evidence: string;
  kind: "highlight" | "circle";
  weight: number;
  explanation: string;
}

export interface ScriptStep {
  atMs: number;
  lineIndex: number;
  time: string;
  text: string;
  marks: ScriptMark[];
  note: {
    text: string;
    category: string;
  } | null;
  scoreAfter: number;
}

export interface HeroScriptData {
  steps: ScriptStep[];
  stampAtMs: number;
  alertAtMs: number;
  totalDurationMs: number;
  alertSpeech: string;
}

export const HERO_SCRIPT_HI: HeroScriptData = {
  totalDurationMs: 9000,
  alertAtMs: 5800,
  stampAtMs: 8400,
  alertSpeech: "तुरंत फोन काटें — यह डिजिटल अरेस्ट की ठगी है।",
  steps: [
    {
      atMs: 1000,
      lineIndex: 0,
      time: "0:04",
      text: "नमस्ते जी, मैं सीबीआई हेडक्वार्टर से डीसीपी राजेश कुमार बात कर रहा हूँ।",
      marks: [
        {
          id: "m0",
          category: "AUTHORITY_CLAIM",
          evidence: "सीबीआई हेडक्वार्टर",
          kind: "circle",
          weight: 2,
          explanation: "सरकारी एजेंसी या पुलिस होने का झूठा दावा",
        },
      ],
      note: {
        text: "सीबीआई का झूठा दावा",
        category: "AUTHORITY_CLAIM",
      },
      scoreAfter: 2,
    },
    {
      atMs: 2800,
      lineIndex: 1,
      time: "0:14",
      text: "आपके आधार से लिंक बैंक खाते में संदिग्ध विदेशी फंड आए हैं। मनी लॉन्ड्रिंग की एफआईआर दर्ज है।",
      marks: [
        {
          id: "m1",
          category: "THREAT_ARREST",
          evidence: "मनी लॉन्ड्रिंग की एफआईआर दर्ज है",
          kind: "circle",
          weight: 3,
          explanation: "गैरकानूनी गिरफ्तारी व कोर्ट केस का डर",
        },
      ],
      note: {
        text: "मुकदमे की धमकी",
        category: "THREAT_ARREST",
      },
      scoreAfter: 5,
    },
    {
      atMs: 4800,
      lineIndex: 2,
      time: "0:25",
      text: "सुप्रीम कोर्ट के निर्देशानुसार आप डिजिटल अरेस्ट में हैं। तुरंत वीडियो कॉल पर रहिए, फोन मत काटना।",
      marks: [
        {
          id: "m2",
          category: "ISOLATION",
          evidence: "डिजिटल अरेस्ट",
          kind: "circle",
          weight: 3,
          explanation: "अवैध 'डिजिटल अरेस्ट' की धमकी",
        },
        {
          id: "m3",
          category: "ISOLATION",
          evidence: "फोन मत काटना",
          kind: "highlight",
          weight: 2,
          explanation: "परिवार से संपर्क काटने के लिए फोन पर रखने का दबाव",
        },
      ],
      note: {
        text: "फोन पर रहने का दबाव",
        category: "ISOLATION",
      },
      scoreAfter: 9,
    },
    {
      atMs: 7000,
      lineIndex: 3,
      time: "0:36",
      text: "वेरिफिकेशन के लिए तुरंत सेफ अकाउंट में चालीस हज़ार रुपये भेजिए।",
      marks: [
        {
          id: "m4",
          category: "MONEY_TRANSFER",
          evidence: "सेफ अकाउंट में चालीस हज़ार रुपये भेजिए",
          kind: "circle",
          weight: 3,
          explanation: "फर्जी 'सेफ अकाउंट' में तुरंत पैसे भेजने की मांग",
        },
      ],
      note: {
        text: "पैसे ट्रांसफर की मांग",
        category: "MONEY_TRANSFER",
      },
      scoreAfter: 12,
    },
  ],
};

export const HERO_SCRIPT_EN: HeroScriptData = {
  totalDurationMs: 9000,
  alertAtMs: 5800,
  stampAtMs: 8400,
  alertSpeech: "Hang up now — this is an illegal digital arrest scam.",
  steps: [
    {
      atMs: 1000,
      lineIndex: 0,
      time: "0:04",
      text: "Hello, I am DCP Rajesh Kumar speaking from CBI Headquarters.",
      marks: [
        {
          id: "m0_en",
          category: "AUTHORITY_CLAIM",
          evidence: "CBI Headquarters",
          kind: "circle",
          weight: 2,
          explanation: "False authority claim pretending to be police or agency",
        },
      ],
      note: {
        text: "False CBI claim",
        category: "AUTHORITY_CLAIM",
      },
      scoreAfter: 2,
    },
    {
      atMs: 2800,
      lineIndex: 1,
      time: "0:14",
      text: "Suspicious foreign funds arrived in bank accounts linked to your Aadhaar. A money laundering FIR is filed.",
      marks: [
        {
          id: "m1_en",
          category: "THREAT_ARREST",
          evidence: "money laundering FIR is filed",
          kind: "circle",
          weight: 3,
          explanation: "Fabricated criminal case and arrest threat",
        },
      ],
      note: {
        text: "Arrest & FIR threat",
        category: "THREAT_ARREST",
      },
      scoreAfter: 5,
    },
    {
      atMs: 4800,
      lineIndex: 2,
      time: "0:25",
      text: "As per Supreme Court orders, you are under digital arrest. Stay on video call immediately, do not hang up.",
      marks: [
        {
          id: "m2_en",
          category: "ISOLATION",
          evidence: "digital arrest",
          kind: "circle",
          weight: 3,
          explanation: "Fabricated illegal 'digital arrest' order",
        },
        {
          id: "m3_en",
          category: "ISOLATION",
          evidence: "do not hang up",
          kind: "highlight",
          weight: 2,
          explanation: "Urgent pressure to prevent consulting family",
        },
      ],
      note: {
        text: "Pressure to stay on call",
        category: "ISOLATION",
      },
      scoreAfter: 9,
    },
    {
      atMs: 7000,
      lineIndex: 3,
      time: "0:36",
      text: "For verification, transfer forty thousand rupees to our safe account immediately.",
      marks: [
        {
          id: "m4_en",
          category: "MONEY_TRANSFER",
          evidence: "transfer forty thousand rupees to our safe account",
          kind: "circle",
          weight: 3,
          explanation: "Direct financial extortion demanding immediate payment",
        },
      ],
      note: {
        text: "Money transfer demand",
        category: "MONEY_TRANSFER",
      },
      scoreAfter: 12,
    },
  ],
};

export function getHeroScript(lang: string): HeroScriptData {
  return lang === "hi" ? HERO_SCRIPT_HI : HERO_SCRIPT_EN;
}
