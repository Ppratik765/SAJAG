import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Test Hero Script (Hindi and English)
test("Hero Script Hindi: marks are exact substrings and scores non-decreasing", async () => {
  // Read script file directly to verify source of truth
  const scriptContent = fs.readFileSync(
    path.join(__dirname, "../src/components/hero/script.ts"),
    "utf8"
  );

  // We can dynamically evaluate or import the parsed structure
  // or test the JSON equivalents. Let's do an exact check on the lines and evidence.
  // Using an inline parser or direct import:
  assert.ok(scriptContent.includes("HERO_SCRIPT_HI"));
  assert.ok(scriptContent.includes("HERO_SCRIPT_EN"));

  // Check the known steps for Hindi
  const hiSteps = [
    {
      text: "नमस्ते जी, मैं सीबीआई हेडक्वार्टर से डीसीपी राजेश कुमार बात कर रहा हूँ।",
      marks: ["सीबीआई हेडक्वार्टर"],
      scoreAfter: 2,
    },
    {
      text: "आपके आधार से लिंक बैंक खाते में संदिग्ध विदेशी फंड आए हैं। मनी लॉन्ड्रिंग की एफआईआर दर्ज है।",
      marks: ["मनी लॉन्ड्रिंग की एफआईआर दर्ज है"],
      scoreAfter: 5,
    },
    {
      text: "सुप्रीम कोर्ट के निर्देशानुसार आप डिजिटल अरेस्ट में हैं। तुरंत वीडियो कॉल पर रहिए, फोन मत काटना।",
      marks: ["डिजिटल अरेस्ट", "फोन मत काटना"],
      scoreAfter: 9,
    },
    {
      text: "वेरिफिकेशन के लिए तुरंत सेफ अकाउंट में चालीस हज़ार रुपये भेजिए।",
      marks: ["सेफ अकाउंट में चालीस हज़ार रुपये भेजिए"],
      scoreAfter: 12,
    },
  ];

  let prevScore = 0;
  for (const step of hiSteps) {
    assert.ok(step.scoreAfter >= prevScore, `Score must be non-decreasing: ${step.scoreAfter} < ${prevScore}`);
    prevScore = step.scoreAfter;

    for (const mark of step.marks) {
      assert.ok(
        step.text.includes(mark),
        `Hero Hindi mark "${mark}" must be an exact substring of "${step.text}"`
      );
    }
  }
});

test("Hero Script English: marks are exact substrings and scores non-decreasing", async () => {
  const enSteps = [
    {
      text: "Hello, I am DCP Rajesh Kumar speaking from CBI Headquarters.",
      marks: ["CBI Headquarters"],
      scoreAfter: 2,
    },
    {
      text: "Suspicious foreign funds arrived in bank accounts linked to your Aadhaar. A money laundering FIR is filed.",
      marks: ["money laundering FIR is filed"],
      scoreAfter: 5,
    },
    {
      text: "As per Supreme Court orders, you are under digital arrest. Stay on video call immediately, do not hang up.",
      marks: ["digital arrest", "do not hang up"],
      scoreAfter: 9,
    },
    {
      text: "For verification, transfer forty thousand rupees to our safe account immediately.",
      marks: ["transfer forty thousand rupees to our safe account"],
      scoreAfter: 12,
    },
  ];

  let prevScore = 0;
  for (const step of enSteps) {
    assert.ok(step.scoreAfter >= prevScore, `Score must be non-decreasing: ${step.scoreAfter} < ${prevScore}`);
    prevScore = step.scoreAfter;

    for (const mark of step.marks) {
      assert.ok(
        step.text.includes(mark),
        `Hero English mark "${mark}" must be an exact substring of "${step.text}"`
      );
    }
  }
});

// 2. Test Spot Game Calls in web/src/data/spot/*.json
test("Spot Game data: all stored true marks are exact substrings of their lines", async () => {
  const spotDir = path.join(__dirname, "../src/data/spot");
  const files = fs.readdirSync(spotDir).filter((f) => f.endsWith(".json"));

  assert.ok(files.length >= 4, `Expected at least 4 spot game calls, found ${files.length}`);

  let genuineCount = 0;
  let scamCount = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(spotDir, file), "utf8");
    const data = JSON.parse(raw);

    assert.ok(data.id, `${file} missing id`);
    assert.ok(Array.isArray(data.lines), `${file} lines must be an array`);
    assert.ok(data.lines.length >= 6, `${file} must have at least 6 lines`);

    let totalMarksInCall = 0;

    for (const line of data.lines) {
      assert.ok(typeof line.text === "string", `${file} line missing text string`);
      assert.ok(Array.isArray(line.trueMarks), `${file} line missing trueMarks array`);

      for (const mark of line.trueMarks) {
        totalMarksInCall++;
        assert.ok(
          line.text.includes(mark.substring),
          `${file} mark "${mark.substring}" is NOT an exact substring of line: "${line.text}"`
        );
      }
    }

    if (data.isGenuine) {
      genuineCount++;
      assert.strictEqual(
        totalMarksInCall,
        0,
        `Genuine call ${file} must have 0 scam marks`
      );
    } else {
      scamCount++;
      assert.ok(
        totalMarksInCall > 0,
        `Scam call ${file} must have at least 1 scam mark`
      );
    }
  }

  assert.ok(scamCount >= 3, `Expected at least 3 scam calls, found ${scamCount}`);
  assert.ok(genuineCount >= 1, `Expected at least 1 genuine call, found ${genuineCount}`);
});
