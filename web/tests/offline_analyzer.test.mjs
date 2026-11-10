import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const { analyzeTextWithPlaybook } = await import("../src/lib/engine/offlineAnalyzer.ts");
const { resolveApiBaseUrl, resolveWsBaseUrl } = await import("../src/lib/api/backend.ts");

const playbook = JSON.parse(
  fs.readFileSync(new URL("../src/lib/engine/playbook.json", import.meta.url), "utf8")
);

test("backend URL resolution never hits localhost on deployed Vercel hosts", () => {
  assert.equal(resolveApiBaseUrl("", "sajag-alpha.vercel.app"), null);
  assert.equal(resolveApiBaseUrl(undefined, "sajag-alpha.vercel.app"), null);
  assert.equal(resolveWsBaseUrl("", "", { hostname: "sajag-alpha.vercel.app", protocol: "https:" }), null);

  assert.equal(resolveApiBaseUrl("", "localhost"), "http://localhost:8000");
  assert.equal(resolveApiBaseUrl("", "127.0.0.1"), "http://localhost:8000");
  assert.equal(resolveApiBaseUrl("https://api.example.com/", "sajag-alpha.vercel.app"), "https://api.example.com");
  assert.equal(resolveWsBaseUrl("", "https://api.example.com/", { hostname: "sajag-alpha.vercel.app", protocol: "https:" }), "wss://api.example.com");
});

test("offline /paste engine classifies all 5 PastePage quick samples faithfully", () => {
  const digitalArrestEn = analyzeTextWithPlaybook(
    "This is officer Vikram calling from Crime Branch police cyber cell. We have issued an arrest warrant against you for international money laundering. You are placed under digital arrest. Stay on this video call, lock your room and keep this strictly confidential.",
    playbook,
    "en-IN"
  );
  assert.equal(digitalArrestEn.level, "scam");
  assert.equal(digitalArrestEn.primary_type, "digital_arrest");

  const digitalArrestHi = analyzeTextWithPlaybook(
    "सीबीआई और पुलिस मुख्यालय से अफसर बोल रहा हूँ। आपका आधार कार्ड गैर-कानूनी पार्सल में पाया गया है। मनी लॉन्ड्रिंग का केस दर्ज है। फोन मत काटना, वीडियो कॉल पर रहिए और सरकारी सेफ अकाउंट में पैसे ट्रांसफर कीजिए।",
    playbook,
    "hi-IN"
  );
  assert.equal(digitalArrestHi.level, "scam");
  assert.equal(digitalArrestHi.primary_type, "digital_arrest");

  const bankKyc = analyzeTextWithPlaybook(
    "Dear SBI customer, your bank account block is scheduled tonight at 9 PM because KYC update is pending. To avoid suspension immediately install QuickSupport and share your OTP.",
    playbook,
    "en-IN"
  );
  assert.equal(bankKyc.level, "scam");
  assert.equal(bankKyc.primary_type, "bank_kyc");

  const deliveryOtp = analyzeTextWithPlaybook(
    "Hello sir, Zomato delivery partner is at your gate with your food order. Please share the delivery OTP to complete handover.",
    playbook,
    "en-IN"
  );
  assert.equal(deliveryOtp.level, "safe");

  const genuineAdvisory = analyzeTextWithPlaybook(
    "Dear customer, State Bank of India reminds you to never share your OTP, UPI PIN, or CVV with anyone. Bank officials never ask for secret credentials over phone calls.",
    playbook,
    "en-IN"
  );
  assert.equal(genuineAdvisory.level, "safe");
  assert.equal(genuineAdvisory.signals.length, 0);
});

test("evidence invariant holds for every signal produced offline", () => {
  const cases = [
    "",
    "Hello, please transfer fifty thousand rupees to our government account immediately or we will arrest you.",
    "Public awareness bulletin: Police never place citizens under digital arrest. Report fake calls immediately to helpline 1930.",
    "FedEx Mumbai parcel seized with MDMA drugs and illegal passport. CBI narcotics officer calling, don't disconnect.",
    "बधाई हो! केबीसी लॉटरी में 25 लाख रुपये निकले हैं, पहले प्रोसेसिंग फीस जमा करें।",
  ];

  for (const input of cases) {
    const res = analyzeTextWithPlaybook(input, playbook, "hi-IN");
    for (const sig of res.signals) {
      assert.ok(res.transcript.includes(sig.evidence), `Missing substring "${sig.evidence}" in "${res.transcript}"`);
      assert.equal(
        res.transcript.slice(sig.start_char, sig.end_char),
        sig.evidence,
        `Span mismatch for "${sig.evidence}"`
      );
    }
  }
});

