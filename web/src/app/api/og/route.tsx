import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";


const ALLOWED_TYPES: Record<string, { en: string; hi: string }> = {
  digital_arrest: { en: "Digital Arrest Scam", hi: "डिजिटल अरेस्ट ठगी" },
  bank_kyc: { en: "Bank KYC Expiry Fraud", hi: "बैंक केवाईसी एक्सपायरी फ्रॉड" },
  upi_refund: { en: "UPI Refund / Wrong Payment", hi: "यूपीआई रिफंड / गलत पेमेंट" },
  utility_disconnect: { en: "Electricity Bill Disconnection", hi: "बिजली बिल डिस्कनेक्शन" },
  courier_parcel: { en: "Customs / Illegal Parcel", hi: "कस्टम्स / अवैध पार्सल" },
  tech_support_remote: { en: "Fake Tech Support", hi: "फर्जी तकनीकी सहायता" },
  family_emergency: { en: "Family Emergency Scam", hi: "पारिवारिक आपातकाल ठगी" },
  lottery_prize: { en: "Lottery / Prize Scam", hi: "लॉटरी / इनाम ठगी" },
  investment_task: { en: "Investment / Part-time Task", hi: "निवेश / पार्ट-टाइम टास्क" },
  unknown_suspicious: { en: "Suspicious Call", hi: "संदिग्ध कॉल" },
};

const ALLOWED_LEVELS = new Set(["suspicious", "likely_scam", "scam"]);

// Never invent a domain: show the host only when the deploy sets NEXT_PUBLIC_SITE_URL.
const siteHost = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

const FONT_FILES: { file: string; weight: 400 | 700; name: string }[] = [
  { file: "noto-sans-devanagari-latin-400-normal.woff", weight: 400, name: "SajagLatin" },
  { file: "noto-sans-devanagari-latin-700-normal.woff", weight: 700, name: "SajagLatin" },
];
const FONT_DIR = path.join(process.cwd(), "src", "app", "api", "og", "fonts");

async function loadFonts() {
  return Promise.all(
    FONT_FILES.map(async (f) => {
      const buf = await readFile(path.join(FONT_DIR, f.file));
      return {
        name: f.name,
        data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
        weight: f.weight,
        style: "normal" as const,
      };
    })
  );
}

export async function GET(req: NextRequest) {
  try {
    const fonts = await loadFonts();
    const { searchParams } = new URL(req.url);
    const rawType = searchParams.get("type") || "digital_arrest";
    const rawLevel = searchParams.get("level") || "likely_scam";
    const rawLang = searchParams.get("lang") || "en";

    // Strict allowlist validation: fallback to neutral safe strings on unknown inputs
    const typeKey = rawType in ALLOWED_TYPES ? rawType : "unknown_suspicious";
    const levelKey = ALLOWED_LEVELS.has(rawLevel) ? rawLevel : "likely_scam";
    // The OG renderer (Satori) does not shape Devanagari: vowel signs such as the short i matra land after
// the wrong consonant ("पिन" renders as "पनि"). A broken Hindi preview would be worse than none, so the
// image is always English. Hindi stays on the /report page itself. See docs/DECISIONS.md.
void rawLang;
const isHindi = false;

    const typeInfo = ALLOWED_TYPES[typeKey];
    const typeLabel = isHindi ? typeInfo.hi : typeInfo.en;

    const isAlarm = levelKey === "likely_scam" || levelKey === "scam";
    const bannerColor = isAlarm ? "#b91c1c" : "#d97706";
    const bannerTitle = isHindi
      ? isAlarm
        ? "गंभीर चेतावनी • SCAM ALERT"
        : "सावधानी चेतावनी • CAUTION"
      : isAlarm
      ? "FRAUD RISK ALERT • SCAM DETECTED"
      : "CAUTION • SUSPICIOUS CALL DETECTED";

    const adviceLines = isHindi
      ? [
          "१. तुरंत फोन काट दें (Hang up immediately)",
          "२. कोई भी ओटीपी, पासवर्ड या पिन किसी से साझा न करें",
          "३. किसी भी 'सेफ अकाउंट' में पैसे ट्रांसफर न करें",
          "४. राष्ट्रीय साइबर हेल्पलाइन 1930 पर तुरंत कॉल करें",
        ]
      : [
          "1. Disconnect the call immediately.",
          "2. Never share OTP, UPI PIN, or bank passwords.",
          "3. Never transfer money to any 'safe account'.",
          "4. Call the National Cyber-Crime Helpline 1930.",
        ];

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#fbfaf8",
            padding: "48px 56px",
            fontFamily: "SajagLatin",
            border: `16px solid ${bannerColor}`,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  backgroundColor: bannerColor,
                  color: "#ffffff",
                  fontSize: 24,
                  fontWeight: 700,
                  padding: "8px 20px",
                  borderRadius: "8px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {bannerTitle}
              </div>
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#1c1917",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span>SAJAG</span>
            </div>
          </div>

          {/* Scam Type Display */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#78716c",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {isHindi ? "पहचाना गया संभावित घोटाला:" : "Identified Threat Pattern:"}
            </div>
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: "#1c1917",
                lineHeight: 1.15,
              }}
            >
              {typeLabel}
            </div>
          </div>

          {/* Action Directives */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              backgroundColor: "rgba(185, 28, 28, 0.06)",
              padding: "24px 28px",
              borderRadius: "16px",
              border: "2px solid rgba(185, 28, 28, 0.2)",
            }}
          >
            {adviceLines.map((line, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#1c1917",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "2px solid #e7e5e4",
              paddingTop: "20px",
              fontSize: 20,
              color: "#78716c",
              fontWeight: 600,
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              <span>{isHindi ? "राष्ट्रीय साइबर क्राइम हेल्पलाइन:" : "National Cyber-Crime Helpline:"}</span>
              <strong style={{ color: "#b91c1c" }}>1930</strong>
            </div>
            {siteHost ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <span>{isHindi ? "कॉल जांचें:" : "Check calls at"}</span>
                <strong style={{ color: "#1c1917" }}>{siteHost}</strong>
              </div>
            ) : (
              <div style={{ display: "flex" }}>Sajag</div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts,
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "OG Image generation error";
    return new Response(`Failed to generate image: ${errorMsg}`, { status: 500 });
  }
}
