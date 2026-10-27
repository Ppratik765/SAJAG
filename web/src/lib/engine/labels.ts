/**
 * Plain-English & Plain-Hindi explanation phrases for detection signals and scam types.
 * Spec Rule: Plain words in notes (no category jargon like AUTHORITY_CLAIM or THREAT_ARREST).
 */

export const CATEGORY_PLAIN_NOTES: Record<string, { en: string; hi: string }> = {
  AUTHORITY_CLAIM: {
    en: "claims official authority",
    hi: "अधिकारी होने का दावा",
  },
  THREAT_ARREST: {
    en: "threatens police arrest",
    hi: "गिरफ्तारी की धमकी",
  },
  ISOLATION: {
    en: "demands you stay on call",
    hi: "फोन न काटने का दबाव",
  },
  SECRECY: {
    en: "demands secrecy",
    hi: "किसी को न बताने को कहा",
  },
  OTP_PIN_REQUEST: {
    en: "asks for secret PIN or OTP",
    hi: "ओटीपी या पिन मांगा",
  },
  MONEY_TRANSFER: {
    en: "demands money transfer",
    hi: "पैसे भेजने की मांग",
  },
  REMOTE_ACCESS_APP: {
    en: "asks to install screen share app",
    hi: "स्क्रीन शेयर ऐप इंस्टॉल करने को कहा",
  },
  ACCOUNT_THREAT: {
    en: "threatens account or SIM block",
    hi: "खाता या सिम बंद करने की धमकी",
  },
  URGENCY: {
    en: "pressures with false urgency",
    hi: "तुरंत करने का दबाव",
  },
  PRIZE_REFUND: {
    en: "claims prize or lottery refund",
    hi: "इनाम या लॉटरी का झांसा",
  },
  FAMILY_EMERGENCY: {
    en: "claims family accident emergency",
    hi: "परिवार में दुर्घटना का बहाना",
  },
  PARCEL: {
    en: "claims seized illegal parcel",
    hi: "पार्सल में ड्रग्स का दावा",
  },
  INVESTMENT: {
    en: "promises unrealistic profit",
    hi: "घर बैठे पैसे कमाने का झांसा",
  },
};

export const SCAM_TYPE_NAMES: Record<string, { en: string; hi: string }> = {
  digital_arrest: {
    en: "Digital Arrest Scam",
    hi: "डिजिटल अरेस्ट ठगी",
  },
  bank_kyc: {
    en: "Bank KYC & Account Block Scam",
    hi: "बैंक केवाईसी और खाता बंद ठगी",
  },
  upi_refund: {
    en: "UPI Cashback / Wrong Payment Scam",
    hi: "यूपीआई कैशबैक या गलत ट्रांसफर ठगी",
  },
  utility_disconnect: {
    en: "Electricity Bill Disconnect Scam",
    hi: "बिजली बिल कनेक्शन काटने की ठगी",
  },
  courier_parcel: {
    en: "Customs / Courier Parcel Scam",
    hi: "कस्टम्स या फेडेक्स पार्सल ठगी",
  },
  tech_support_remote: {
    en: "Remote Access / Tech Support Scam",
    hi: "रिमोट एक्सेस या वायरस सपोर्ट ठगी",
  },
  family_emergency: {
    en: "Family Emergency / Bail Scam",
    hi: "परिवार में दुर्घटना या ज़मानत ठगी",
  },
  lottery_prize: {
    en: "Lottery / KBC Cash Prize Scam",
    hi: "लॉटरी या केबीसी इनाम ठगी",
  },
  investment_task: {
    en: "Part-Time Task & Investment Scam",
    hi: "पार्ट टाइम टास्क या ट्रेडिंग ठगी",
  },
  unknown_suspicious: {
    en: "Suspicious Pressure Call",
    hi: "संदेहास्पद कॉल",
  },
  none: {
    en: "No warning signs found yet",
    hi: "अभी कोई संकेत नहीं मिला",
  },
};

export const ADVICE_TEXTS: Record<string, { en: string; hi: string }> = {
  hang_up: {
    en: "Hang up immediately. Do not stay on the line.",
    hi: "तुरंत फोन काट दें। लाइन पर बिल्कुल न रहें।",
  },
  never_share_otp: {
    en: "Never share your OTP, UPI PIN, or password with any caller.",
    hi: "अपना ओटीपी, यूपीआई पिन या पासवर्ड कभी किसी को न बताएं।",
  },
  never_transfer_money: {
    en: "No legitimate police or court officer asks for money transfer.",
    hi: "कोई भी असली पुलिस या कोर्ट अफसर पैसे ट्रांसफर करने को नहीं कहता।",
  },
  call_1930: {
    en: "Report immediately to National Cyber Crime Helpline: 1930.",
    hi: "राष्ट्रीय साइबर अपराध हेल्पलाइन नंबर 1930 पर तुरंत शिकायत करें।",
  },
  warn_family: {
    en: "Warn family members before taking any financial action.",
    hi: "कोई भी फैसला लेने से पहले अपने परिवार से जरूर बात करें।",
  },
  verify_independently: {
    en: "Verify caller identity independently using official bank helpline.",
    hi: "बैंक की आधिकारिक वेबसाइट या हेल्पलाइन से अलग से जाँच करें।",
  },
  stay_alert: {
    en: "No warning signs found yet. Still do not share codes, PINs or money with unknown callers.",
    hi: "अभी कोई संकेत नहीं मिला। फिर भी अनजान कॉलर के साथ कोड, पिन या पैसे साझा न करें।",
  },
};
