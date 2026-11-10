/**
 * Pure TypeScript port of the frozen Sajag deterministic rules engine
 * (data/playbook/playbook.yaml + normalizer.py + matcher.py + scorer.py).
 *
 * Written in type-strippable syntax only (no enums, no parameter properties,
 * no external path aliases) so both Next.js and `node --test` can import it directly.
 */

export type OfflineRiskLevel = "safe" | "suspicious" | "likely_scam" | "scam";

export interface OfflineSignal {
  id: string;
  category: string;
  weight: number;
  evidence: string;
  segment_index: number;
  start_char: number;
  end_char: number;
  reviewed: boolean;
}

export interface OfflineScamTypeMatch {
  type: string;
  confidence: "low" | "medium" | "high";
  matched_categories: string[];
}

export interface OfflineSegment {
  index: number;
  text: string;
  duration_s: number;
  offset_s: number;
}

export interface OfflineAnalysisResult {
  analysis_id: string;
  language_code: string;
  duration_seconds: number;
  transcript: string;
  segments: OfflineSegment[];
  level: OfflineRiskLevel;
  score: number;
  primary_type: string;
  types: OfflineScamTypeMatch[];
  signals: OfflineSignal[];
  advice_keys: string[];
  disclaimer_key: string;
  engine_attached: boolean;
}

export interface PlaybookPattern {
  text: string;
  lang?: string;
  reviewed?: boolean;
}

export interface PlaybookCategoryConfig {
  weight: number;
  hard?: boolean;
  needs_request_context?: boolean;
  patterns: PlaybookPattern[];
}

export interface PlaybookTypeRule {
  all_of?: string[];
  any_of?: string[];
  also_any_of?: string[];
}

export interface PlaybookData {
  version: number;
  categories: Record<string, PlaybookCategoryConfig>;
  types: Record<string, PlaybookTypeRule>;
  advisory_phrases: string[];
  helpline_numbers: string[];
  advisory_authorities: string[];
  advisory_frame_keywords: string[];
  demand_to_listener_patterns: string[];
  advisory_negated_directives: string[];
  advisory_preamble_phrases: string[];
  advisory_arrest_negated_directives: string[];
  advisory_money_negated_directives: string[];
}

interface NormToken {
  text: string;
  normStart: number;
  normEnd: number;
  rawStart: number;
  rawEnd: number;
  sentenceIdx: number;
}

interface CompiledPattern {
  category: string;
  rawPattern: string;
  normPattern: string;
  baseWeight: number;
  hard: boolean;
  needsRequestContext: boolean;
  lang: string;
  reviewed: boolean;
}

interface RawMatch {
  category: string;
  baseWeight: number;
  hard: boolean;
  needsRequestContext: boolean;
  hasRequestContext: boolean;
  evidence: string;
  rawStart: number;
  rawEnd: number;
  reviewed: boolean;
  segmentIndex: number;
}

const ZERO_WIDTH_CHARS = new Set(["\u200b", "\u200c", "\u200d", "\ufeff"]);

const SENTENCE_BOUNDARIES = new Set([".", "!", "?", "|", "।", "॥", "\n", "\r"]);

const PUNCTUATION_CHARS = new Set([
  "!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/",
  ":", ";", "<", "=", ">", "?", "@", "[", "\\", "]", "^", "_", "`", "{", "|", "}", "~",
  "।", "॥", "“", "”", "‘", "’", "‚", "„", "—", "–", "…", "·", "•", "«", "»", "¿", "¡",
]);

const NEGATION_TOKENS = new Set([
  "mat",
  "मत",
  "न",
  "नहीं",
  "nahi",
  "nahin",
  "na",
  "kabhi",
  "कभी",
  "never",
  "not",
  "dont",
  "don't",
  "no",
]);

const EXCLUDED_NEGATION_COMBOS = new Set([
  "mat batana",
  "मत बताना",
  "mat batao",
  "मत बताओ",
  "mat bolna",
  "मत बोलना",
  "mat kaatna",
  "मत काटना",
]);

const REQUEST_VERBS = new Set([
  "bataiye",
  "batao",
  "bata",
  "share",
  "send",
  "bhejiye",
  "bhejo",
  "bhej",
  "dijiye",
  "dijiye ga",
  "do",
  "de",
  "den",
  "बताइए",
  "दीजिए",
  "बोलिए",
  "दें",
  "दीजिये",
  "बताओ",
  "भेजिए",
  "भेजें",
  "enter",
  "provide",
  "give",
  "tell",
  "type",
  "daaliye",
  "डालिए",
  "read",
  "बोल",
  "बोलिये",
  "boliye",
  "bolo",
  "padhiye",
  "पढ़िए",
  "पढ़िए",
]);

const DIGIT_WORDS = new Set([
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "oh",
  "शून्य", "एक", "दो", "तीन", "चार", "पांच", "पाँच", "छह", "छः", "सात", "आठ", "नौ",
  "shunya", "ek", "do", "teen", "char", "paanch", "panch", "chheh", "che", "saat", "aath", "nau",
  "जीरो", "वन", "टू", "थ्री", "फोर", "फाइव", "सिक्स", "सेवन", "एट", "नाइन",
]);

const AMOUNT_KEYWORDS = new Set([
  "thousand", "lakh", "lakhs", "crore", "crores", "hundred", "rupees",
  "हजार", "हज़ार", "लाख", "करोड़", "रुपये", "रुपए", "रुपया",
  "थाउजेंड", "थाउजंड", "थाउज़न्ड",
]);

const TRANSFER_VERBS = new Set([
  "send", "transfer", "deposit", "bhejiye", "bhejo", "bhej", "remit",
  "भेजिए", "भेजें", "भेजो", "जमा", "ट्रांसफर", "डिपॉजिट", "pay",
]);

const DELIVERY_WORDS = new Set([
  "delivery",
  "डिलीवरी",
  "order",
  "ऑर्डर",
  "zomato",
  "swiggy",
  "amazon",
  "blinkit",
  "flipkart",
  "courier boy",
  "gate",
  "गेट",
  "parcel boy",
]);

function splitWords(str: string): string[] {
  const trimmed = str.trim();
  return trimmed ? trimmed.split(/\s+/) : [];
}

function isDigitToken(tok: string): boolean {
  return /^\d+$/.test(tok);
}

interface NormalizedTextResult {
  rawText: string;
  normText: string;
  normToRaw: number[];
  tokens: NormToken[];
  getRawSubstring: (normStart: number, normEnd: number) => { text: string; rawStart: number; rawEnd: number };
}

export function normalizeText(rawText: string): NormalizedTextResult {
  if (!rawText) {
    return {
      rawText: "",
      normText: "",
      normToRaw: [],
      tokens: [],
      getRawSubstring: () => ({ text: "", rawStart: 0, rawEnd: 0 }),
    };
  }

  const nfcRaw = rawText.normalize("NFC");
  const normChars: string[] = [];
  const normToRaw: number[] = [];
  const charSentenceIndices: number[] = [];

  let currentSentence = 0;
  let inSpace = false;

  for (let rawIdx = 0; rawIdx < nfcRaw.length; rawIdx++) {
    const ch = nfcRaw[rawIdx];
    if (ZERO_WIDTH_CHARS.has(ch)) {
      continue;
    } else if (SENTENCE_BOUNDARIES.has(ch)) {
      currentSentence += 1;
      if (!inSpace) {
        normChars.push(" ");
        normToRaw.push(rawIdx);
        charSentenceIndices.push(currentSentence);
        inSpace = true;
      }
    } else if (PUNCTUATION_CHARS.has(ch) || /\s/.test(ch)) {
      if (!inSpace) {
        normChars.push(" ");
        normToRaw.push(rawIdx);
        charSentenceIndices.push(currentSentence);
        inSpace = true;
      }
    } else {
      inSpace = false;
      normChars.push(ch.toLowerCase());
      normToRaw.push(rawIdx);
      charSentenceIndices.push(currentSentence);
    }
  }

  let startOffset = 0;
  while (startOffset < normChars.length && normChars[startOffset] === " ") {
    startOffset += 1;
  }

  let endOffset = normChars.length;
  while (endOffset > startOffset && normChars[endOffset - 1] === " ") {
    endOffset -= 1;
  }

  const finalChars = normChars.slice(startOffset, endOffset);
  const finalMapping = normToRaw.slice(startOffset, endOffset);
  const finalSentences = charSentenceIndices.slice(startOffset, endOffset);
  const finalNormText = finalChars.join("");

  const tokens: NormToken[] = [];
  let currentTokenChars: string[] = [];
  let tokenNormStart = 0;

  for (let i = 0; i < finalNormText.length; i++) {
    const ch = finalNormText[i];
    if (ch === " ") {
      if (currentTokenChars.length > 0) {
        tokens.push({
          text: currentTokenChars.join(""),
          normStart: tokenNormStart,
          normEnd: i,
          rawStart: finalMapping[tokenNormStart],
          rawEnd: finalMapping[i - 1] + 1,
          sentenceIdx: finalSentences[tokenNormStart],
        });
        currentTokenChars = [];
      }
    } else {
      if (currentTokenChars.length === 0) {
        tokenNormStart = i;
      }
      currentTokenChars.push(ch);
    }
  }

  if (currentTokenChars.length > 0) {
    const i = finalNormText.length;
    tokens.push({
      text: currentTokenChars.join(""),
      normStart: tokenNormStart,
      normEnd: i,
      rawStart: finalMapping[tokenNormStart],
      rawEnd: finalMapping[i - 1] + 1,
      sentenceIdx: finalSentences[tokenNormStart],
    });
  }

  const getRawSubstring = (normStart: number, normEnd: number) => {
    if (normStart >= normEnd || normStart >= finalMapping.length) {
      return { text: "", rawStart: 0, rawEnd: 0 };
    }
    let rawStart = finalMapping[normStart];
    const lastNormIdx = Math.min(normEnd - 1, finalMapping.length - 1);
    let rawEnd = finalMapping[lastNormIdx] + 1;

    const rawSlice = nfcRaw.slice(rawStart, rawEnd);
    const leadMatch = rawSlice.match(/^\s*/);
    const leadTrim = leadMatch ? leadMatch[0].length : 0;
    rawStart += leadTrim;
    const afterLead = rawSlice.slice(leadTrim);

    const trailMatch = afterLead.match(/\s*$/);
    const trailTrim = trailMatch ? trailMatch[0].length : 0;
    if (trailTrim > 0) {
      rawEnd -= trailTrim;
    }

    return {
      text: nfcRaw.slice(rawStart, rawEnd),
      rawStart,
      rawEnd,
    };
  };

  return {
    rawText: nfcRaw,
    normText: finalNormText,
    normToRaw: finalMapping,
    tokens,
    getRawSubstring,
  };
}

function getSentenceTokens(
  tokens: NormToken[],
  tokStart: number,
  tokEnd: number,
  numTokens: number
): NormToken[] {
  if (numTokens === 0) return [];
  const currentSentence = tokens[tokStart].sentenceIdx;
  const hasMultipleSentences = tokens[numTokens - 1].sentenceIdx !== tokens[0].sentenceIdx;
  if (hasMultipleSentences) {
    return tokens.filter((t) => t.sentenceIdx === currentSentence);
  }

  let sStart = tokStart;
  while (sStart > 0 && tokStart - sStart < 25) {
    if (tokens[sStart].rawStart - tokens[sStart - 1].rawEnd >= 2) {
      break;
    }
    sStart -= 1;
  }

  let sEnd = tokEnd;
  while (sEnd < numTokens - 1 && sEnd - tokEnd < 25) {
    if (tokens[sEnd + 1].rawStart - tokens[sEnd].rawEnd >= 2) {
      break;
    }
    sEnd += 1;
  }

  return tokens.slice(sStart, sEnd + 1);
}

function getSentenceWindowTokens(
  tokens: NormToken[],
  currentSentence: number,
  windowSize: number
): NormToken[] {
  if (tokens.length === 0) return [];
  const hasMultipleSentences = tokens[tokens.length - 1].sentenceIdx !== tokens[0].sentenceIdx;
  if (hasMultipleSentences) {
    const minSent = Math.max(0, currentSentence - windowSize);
    return tokens.filter((t) => t.sentenceIdx >= minSent && t.sentenceIdx <= currentSentence);
  }
  return tokens;
}

function hasUnnegatedDemandInSentence(
  sentTokens: NormToken[],
  demandPatterns: string[]
): boolean {
  const sentWords = sentTokens.map((t) => t.text);
  const n = sentWords.length;
  const afterNegSet = new Set(["mat", "मत", "न", "नहीं", "kabhi", "कभी"]);

  for (const dpat of demandPatterns) {
    const dWords = splitWords(dpat);
    const dLen = dWords.length;
    if (dLen === 0 || dLen > n) continue;

    for (let i = 0; i <= n - dLen; i++) {
      let match = true;
      for (let j = 0; j < dLen; j++) {
        if (sentWords[i + j] !== dWords[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        const before = sentWords.slice(Math.max(0, i - 10), i);
        const isNegBefore = before.some((w) => NEGATION_TOKENS.has(w));
        const after = sentWords.slice(i + dLen, Math.min(n, i + dLen + 3));
        const isNegAfter = after.some((w) => afterNegSet.has(w));
        if (!isNegBefore && !isNegAfter) {
          return true;
        }
      }
    }
  }
  return false;
}

function isAuthorityAdvisorySentence(
  sentenceTokens: NormToken[],
  playbook: PlaybookData,
  isAuthorityClaim: boolean
): boolean {
  const sentWords = sentenceTokens.map((t) => t.text);
  const sentStr = " " + sentWords.join(" ") + " ";

  const checkAdvisoryFrame = (): boolean => {
    for (const adv of playbook.advisory_phrases) {
      if (sentStr.includes(adv)) return true;
    }

    if (sentStr.includes(" fake ") || sentStr.includes(" नकली ")) {
      const contrabandWords = [
        "fake passport", "fake debit", "fake credit", "fake currency",
        "fake notes", "fake note", "fake id", "fake account", "fake sim",
        "नकली पासपोर्ट", "नकली नोट", "नकली करेंसी",
      ];
      const advisoryWords = [
        "fake call", "fake calls", "fake notice", "fake officer", "fake threatening",
        "fake warrant", "fake arrest", "fake threat", "नकली कॉल", "नकली अफसर", "नकली वारंट", "धमकाने वाली",
      ];
      const isContraband = contrabandWords.some((cb) => sentStr.includes(cb));
      const isAdvisory = advisoryWords.some((at) => sentStr.includes(at));
      if (isAdvisory || !isContraband) return true;
    }

    const hasHindiNever =
      (sentStr.includes(" कभी ") || sentStr.includes(" कभी भी ")) &&
      (sentStr.includes(" नहीं ") || sentStr.includes(" न "));

    if (
      sentStr.includes(" never ") ||
      sentStr.includes(" कभी नहीं ") ||
      sentStr.includes(" कभी भी नहीं ") ||
      hasHindiNever
    ) {
      if (
        sentStr.includes("i have never") ||
        sentStr.includes("i never") ||
        sentStr.includes("maine kabhi")
      ) {
        const institutionalAlways = [
          "police never",
          "courts never",
          "bank will never",
          "never transfer",
          "never share",
          "कभी भी नहीं करती",
        ];
        if (institutionalAlways.some((ia) => sentStr.includes(ia))) return true;
      } else {
        return true;
      }
    }

    if (sentStr.includes(" report ") || sentStr.includes(" शिकायत ")) {
      const reportWords = [
        "report to", "report on", "report immediately", "report fraud", "report fake",
        "report threatening", "report call", "cyber crime portal", "cybercrime", "helpline", "1930",
        "रिपोर्ट करें", "शिकायत तुरंत", "शिकायत दर्ज", "पोर्टल पर",
      ];
      if (reportWords.some((rw) => sentStr.includes(rw))) return true;
    }

    const frameKws = ["advisory", "awareness", "सावधान", "सावधानी", "जागरूकता", "परामर्श", "सतर्क", "prevention", "beware"];
    for (const kw of frameKws) {
      if (sentStr.includes(" " + kw + " ")) return true;
    }

    return false;
  };

  if (!checkAdvisoryFrame()) return false;

  if (isAuthorityClaim) return true;

  return playbook.advisory_authorities.some(
    (au) => sentStr.includes(" " + au + " ") || sentStr.includes(au)
  );
}

function deduplicateMatches(matches: RawMatch[]): RawMatch[] {
  if (matches.length === 0) return [];

  const sorted = [...matches].sort((a, b) => {
    if (a.rawStart !== b.rawStart) return a.rawStart - b.rawStart;
    return -(a.rawEnd - a.rawStart) - -(b.rawEnd - b.rawStart);
  });

  const result: RawMatch[] = [];
  const seenSpans = new Set<string>();

  for (const m of sorted) {
    const spanKey = `${m.category}:${m.rawStart}:${m.rawEnd}`;
    if (seenSpans.has(spanKey)) continue;

    const isSubspan = result.some(
      (prev) =>
        prev.category === m.category &&
        prev.rawStart <= m.rawStart &&
        prev.rawEnd >= m.rawEnd
    );

    if (!isSubspan) {
      result.push(m);
      seenSpans.add(spanKey);
    }
  }

  return result;
}

export function analyzeTextWithPlaybook(
  text: string,
  playbook: PlaybookData,
  languageCode: string = "hi-IN",
  segmentIndex: number = 0
): OfflineAnalysisResult {
  const norm = normalizeText(text);
  const tokens = norm.tokens;
  const numTokens = tokens.length;

  const compiledPatterns: CompiledPattern[] = [];
  for (const [catName, catCfg] of Object.entries(playbook.categories)) {
    const baseWeight = catCfg.weight ?? 2;
    const isHard = Boolean(catCfg.hard);
    const needsReq = Boolean(catCfg.needs_request_context);

    for (const p of catCfg.patterns ?? []) {
      const rawPattern = p.text ?? "";
      const normPat = normalizeText(rawPattern).normText;
      if (normPat) {
        compiledPatterns.push({
          category: catName,
          rawPattern,
          normPattern: normPat,
          baseWeight,
          hard: isHard,
          needsRequestContext: needsReq,
          lang: p.lang ?? "any",
          reviewed: p.reviewed !== false,
        });
      }
    }
  }

  const paddedNorm = " " + norm.normText + " ";
  const helplineSet = new Set(playbook.helpline_numbers ?? []);
  const demandPatterns = playbook.demand_to_listener_patterns ?? [];
  const negatedDirectives = playbook.advisory_negated_directives ?? [];
  const moneyNegatedDirectives = playbook.advisory_money_negated_directives ?? [];
  const arrestNegatedDirectives = playbook.advisory_arrest_negated_directives ?? [];
  const preamblePhrases = playbook.advisory_preamble_phrases ?? [];

  const hasDeliveryContext =
    tokens.some((t) => DELIVERY_WORDS.has(t.text)) ||
    ["delivery", "डिलीवरी", "order", "at your gate", "गेट पर"].some((dw) => paddedNorm.includes(dw));

  let rawMatches: RawMatch[] = [];

  if (numTokens > 0) {
    for (const pat of compiledPatterns) {
      const paddedPat = " " + pat.normPattern + " ";
      let startSearch = 0;

      while (true) {
        const idx = paddedNorm.indexOf(paddedPat, startSearch);
        if (idx === -1) break;

        const matchNormStart = idx;
        const matchNormEnd = idx + pat.normPattern.length;
        startSearch = matchNormStart + 1;

        let tokStart = 0;
        let tokEnd = numTokens - 1;
        for (let ti = 0; ti < numTokens; ti++) {
          const tok = tokens[ti];
          if (tok.normStart <= matchNormStart) {
            tokStart = ti;
          }
          if (tok.normEnd >= matchNormEnd) {
            tokEnd = ti;
            break;
          }
        }

        const currentSentence = tokens[tokStart].sentenceIdx;
        const sentTokens = getSentenceTokens(tokens, tokStart, tokEnd, numTokens);
        const hasUnnegatedDemand = hasUnnegatedDemandInSentence(sentTokens, demandPatterns);

        const windowTokens = getSentenceWindowTokens(tokens, currentSentence, 2);
        const windowStr = " " + windowTokens.map((t) => t.text).join(" ") + " ";
        const sentStr = " " + sentTokens.map((t) => t.text).join(" ") + " ";

        if (
          pat.category === "OTP_PIN_REQUEST" ||
          pat.category === "MONEY_TRANSFER" ||
          pat.category === "PRIZE_REFUND"
        ) {
          const directives =
            pat.category === "OTP_PIN_REQUEST" ? negatedDirectives : moneyNegatedDirectives;

          if (!hasUnnegatedDemand) {
            if (directives.some((adv) => sentStr.includes(adv) || windowStr.includes(adv))) {
              continue;
            }
          }

          const afterIndices: number[] = [];
          for (let ti = tokEnd + 1; ti < Math.min(numTokens, tokEnd + 9); ti++) {
            if (tokens[ti].sentenceIdx === currentSentence) afterIndices.push(ti);
          }
          const afterWords = afterIndices.map((ti) => tokens[ti].text);
          const afterStr = " " + afterWords.join(" ") + " ";

          let hasLocalNegation = false;
          const advPostList = [
            "share mat", "शेयर मत", "साझा मत", "मत देना", "मत बताना", "मत करना", "mat karna",
            "न दें", "शेयर न", "साझा न", "कभी मत", "kabhi mat", "नहीं मांगता", "नहीं मांगते",
          ];
          const askVerbs = new Set(["bataiye", "batao", "bhejiye", "bhejo", "dijiye", "enter", "share", "tell"]);

          for (const advPost of advPostList) {
            const postIdx = afterStr.indexOf(advPost);
            if (postIdx !== -1) {
              const interveningPost = splitWords(afterStr.slice(0, postIdx));
              if (!interveningPost.some((w) => askVerbs.has(w))) {
                hasLocalNegation = true;
                break;
              }
            }
          }

          if (!hasLocalNegation) {
            const checkIndices: number[] = [];
            for (let ti = Math.max(0, tokStart - 5); ti < tokStart; ti++) {
              if (tokens[ti].sentenceIdx === currentSentence) checkIndices.push(ti);
            }
            for (let ti = tokEnd + 1; ti < Math.min(numTokens, tokEnd + 4); ti++) {
              if (tokens[ti].sentenceIdx === currentSentence) checkIndices.push(ti);
            }

            const excludedEnCombos = new Set([
              "do not tell",
              "don't tell",
              "dont tell",
              "do not disconnect",
              "don't disconnect",
            ]);

            for (const ti of checkIndices) {
              const tokWord = tokens[ti].text;
              let isCombo = false;
              if (ti + 1 < numTokens) {
                const combo = `${tokWord} ${tokens[ti + 1].text}`;
                if (EXCLUDED_NEGATION_COMBOS.has(combo) || excludedEnCombos.has(combo)) {
                  isCombo = true;
                }
              }
              if (ti > 0) {
                const comboPrev = `${tokens[ti - 1].text} ${tokWord}`;
                if (EXCLUDED_NEGATION_COMBOS.has(comboPrev)) {
                  isCombo = true;
                }
              }
              if (!isCombo && NEGATION_TOKENS.has(tokWord)) {
                hasLocalNegation = true;
                break;
              }
            }
          }

          if (hasLocalNegation) continue;
        }

        if (pat.category === "AUTHORITY_CLAIM") {
          if (!hasUnnegatedDemand) {
            const postAuthTokens: string[] = [];
            for (let ti = tokEnd + 1; ti < Math.min(numTokens, tokEnd + 5); ti++) {
              postAuthTokens.push(tokens[ti].text);
            }
            const postAuthStr = postAuthTokens.join(" ");
            const postNeverWords = ["never", "will never", "and courts never", "kabhi nahi", "कभी नहीं", "do not"];
            if (postNeverWords.some((pw) => postAuthStr.includes(pw))) continue;

            if (preamblePhrases.some((aw) => sentStr.includes(aw) || windowStr.includes(aw))) {
              continue;
            }
            if (isAuthorityAdvisorySentence(sentTokens, playbook, true)) {
              continue;
            }
          }
        }

        if (pat.category === "THREAT_ARREST" || pat.category === "ISOLATION") {
          if (!hasUnnegatedDemand) {
            if (arrestNegatedDirectives.some((adv) => sentStr.includes(adv) || windowStr.includes(adv))) {
              continue;
            }
            if (preamblePhrases.some((pr) => sentStr.includes(pr) || windowStr.includes(pr))) {
              continue;
            }
            if (isAuthorityAdvisorySentence(sentTokens, playbook, false)) {
              continue;
            }
          }
        }

        if (pat.category === "SECRECY") {
          const credWords = [
            "otp", "pin", "password", "cvv", "code", "codes", "details", "credential", "credentials",
            "ओटीपी", "पिन", "पासवर्ड", "कोड", "जानकारी", "विवरण",
          ];
          if (credWords.some((w) => sentStr.includes(w))) {
            continue;
          }
        }

        if (pat.category === "URGENCY") {
          const repWords = [
            "report", "helpline", "1930", "cybercrime", "cyber crime", "portal",
            "रिपोर्ट", "शिकायत", "हेल्पलाइन", "पोर्टल", "one nine three zero",
          ];
          if (repWords.some((rw) => sentStr.includes(rw) || windowStr.includes(rw))) {
            continue;
          }
        }

        let hasRequestContext = true;
        if (pat.needsRequestContext) {
          const windowStart = Math.max(0, tokStart - 6);
          const windowEnd = Math.min(numTokens, tokEnd + 7);
          let foundReqVerb = false;
          for (let ti = windowStart; ti < windowEnd; ti++) {
            if (tokens[ti].sentenceIdx === currentSentence && REQUEST_VERBS.has(tokens[ti].text)) {
              foundReqVerb = true;
              break;
            }
          }
          hasRequestContext = foundReqVerb;
        }

        const sub = norm.getRawSubstring(matchNormStart, matchNormEnd);
        if (!sub.text) continue;

        rawMatches.push({
          category: pat.category,
          baseWeight: pat.baseWeight,
          hard: pat.hard,
          needsRequestContext: pat.needsRequestContext,
          hasRequestContext,
          evidence: sub.text,
          rawStart: sub.rawStart,
          rawEnd: sub.rawEnd,
          reviewed: pat.reviewed,
          segmentIndex,
        });
      }
    }

    const hasCodeRequest = rawMatches.some((m) => m.category === "OTP_PIN_REQUEST");
    if (hasCodeRequest) {
      let idxTok = 0;
      const nearbyHelpWords = new Set(["helpline", "report", "portal", "cybercrime", "crime", "हेल्पलाइन", "रिपोर्ट", "पोर्टल"]);
      while (idxTok < numTokens) {
        if (DIGIT_WORDS.has(tokens[idxTok].text) || isDigitToken(tokens[idxTok].text)) {
          let j = idxTok;
          while (j < numTokens && (DIGIT_WORDS.has(tokens[j].text) || isDigitToken(tokens[j].text))) {
            j += 1;
          }
          if (j - idxTok >= 3) {
            const sub = norm.getRawSubstring(tokens[idxTok].normStart, tokens[j - 1].normEnd);
            const seqWords: string[] = [];
            for (let k = idxTok; k < j; k++) seqWords.push(tokens[k].text);
            const normSeq = seqWords.join(" ");

            let isHelpline =
              helplineSet.has(normSeq) ||
              Array.from(helplineSet).some((hn) => normSeq.includes(hn));

            for (let k = Math.max(0, idxTok - 4); k < Math.min(numTokens, j + 4); k++) {
              if (nearbyHelpWords.has(tokens[k].text)) {
                isHelpline = true;
                break;
              }
            }

            if (sub.text && !isHelpline) {
              rawMatches.push({
                category: "OTP_PIN_REQUEST",
                baseWeight: 3,
                hard: true,
                needsRequestContext: false,
                hasRequestContext: true,
                evidence: sub.text,
                rawStart: sub.rawStart,
                rawEnd: sub.rawEnd,
                reviewed: true,
                segmentIndex,
              });
            }
          }
          idxTok = j;
        } else {
          idxTok += 1;
        }
      }
    }

    for (let ti = 0; ti < numTokens; ti++) {
      if (TRANSFER_VERBS.has(tokens[ti].text)) {
        const wStart = Math.max(0, ti - 5);
        const wEnd = Math.min(numTokens, ti + 6);
        for (let wi = wStart; wi < wEnd; wi++) {
          if (AMOUNT_KEYWORDS.has(tokens[wi].text)) {
            const startTok = Math.min(ti, wi);
            const endTok = Math.max(ti, wi);
            const sentTokens = getSentenceTokens(tokens, startTok, endTok, numTokens);
            const hasUnnegatedDemand = hasUnnegatedDemandInSentence(sentTokens, demandPatterns);
            if (!hasUnnegatedDemand) {
              const sentStr = " " + sentTokens.map((t) => t.text).join(" ") + " ";
              if (moneyNegatedDirectives.some((adv) => sentStr.includes(adv))) {
                break;
              }
            }
            const sub = norm.getRawSubstring(tokens[startTok].normStart, tokens[endTok].normEnd);
            if (sub.text) {
              rawMatches.push({
                category: "MONEY_TRANSFER",
                baseWeight: 3,
                hard: true,
                needsRequestContext: false,
                hasRequestContext: true,
                evidence: sub.text,
                rawStart: sub.rawStart,
                rawEnd: sub.rawEnd,
                reviewed: true,
                segmentIndex,
              });
            }
            break;
          }
        }
      }
    }

    const allAdvDirectives = [
      ...negatedDirectives,
      ...arrestNegatedDirectives,
      ...moneyNegatedDirectives,
    ];
    const isAdvisoryCall =
      preamblePhrases.some((hdr) => paddedNorm.includes(hdr)) &&
      allAdvDirectives.some((adv) => paddedNorm.includes(adv));

    if (isAdvisoryCall) {
      const hasUnnegatedDemands = rawMatches.some(
        (m) =>
          ((m.category === "OTP_PIN_REQUEST" || m.category === "MONEY_TRANSFER") && m.hasRequestContext) ||
          m.category === "REMOTE_ACCESS_APP" ||
          ((m.category === "ISOLATION" || m.category === "THREAT_ARREST") && m.baseWeight >= 3)
      );
      if (!hasUnnegatedDemands) {
        rawMatches = [];
      }
    }
  }

  const dedupedMatches = deduplicateMatches(rawMatches);

  const hardCategoriesMatchedInRaw = new Set(
    dedupedMatches.filter((m) => m.hard).map((m) => m.category)
  );
  const deliveryDowngrade =
    hasDeliveryContext &&
    hardCategoriesMatchedInRaw.size === 1 &&
    hardCategoriesMatchedInRaw.has("OTP_PIN_REQUEST");

  const signals: OfflineSignal[] = [];
  for (let i = 0; i < dedupedMatches.length; i++) {
    const m = dedupedMatches[i];
    let weight = m.baseWeight;
    if (m.needsRequestContext && !m.hasRequestContext) {
      weight = 1;
    }
    if (deliveryDowngrade && (m.category === "OTP_PIN_REQUEST" || m.category === "PARCEL")) {
      weight = 1;
    }

    if (!norm.rawText.includes(m.evidence)) {
      continue;
    }

    const segPad = String(m.segmentIndex).padStart(2, "0");
    const idxPad = String(i + 1).padStart(3, "0");
    signals.push({
      id: `sig_${segPad}_${idxPad}`,
      category: m.category,
      weight,
      evidence: m.evidence,
      segment_index: m.segmentIndex,
      start_char: m.rawStart,
      end_char: m.rawEnd,
      reviewed: m.reviewed,
    });
  }

  const scored = scoreOfflineSignals(signals, playbook.types, playbook.categories);

  return {
    analysis_id: "offline-" + Math.random().toString(36).slice(2, 10),
    language_code: languageCode,
    duration_seconds: 0,
    transcript: norm.rawText,
    segments: norm.rawText ? [{ index: 0, text: norm.rawText, duration_s: 0, offset_s: 0 }] : [],
    level: scored.level,
    score: scored.score,
    primary_type: scored.primaryType,
    types: scored.typeMatches,
    signals,
    advice_keys: scored.adviceKeys,
    disclaimer_key: "not_a_guarantee",
    engine_attached: false,
  };
}

function scoreOfflineSignals(
  signals: OfflineSignal[],
  playbookTypes: Record<string, PlaybookTypeRule>,
  playbookCategories: Record<string, PlaybookCategoryConfig>
): {
  score: number;
  level: OfflineRiskLevel;
  primaryType: string;
  typeMatches: OfflineScamTypeMatch[];
  adviceKeys: string[];
} {
  if (signals.length === 0) {
    return {
      score: 0,
      level: "safe",
      primaryType: "none",
      typeMatches: [],
      adviceKeys: ["stay_alert"],
    };
  }

  const catSignals = new Map<string, OfflineSignal[]>();
  for (const s of signals) {
    const arr = catSignals.get(s.category) ?? [];
    arr.push(s);
    catSignals.set(s.category, arr);
  }

  let totalScore = 0;
  const matchedCategories = new Set(catSignals.keys());
  const hardCategoriesMatched = new Set<string>();

  for (const [catName, sigList] of catSignals.entries()) {
    const maxWeight = Math.max(...sigList.map((s) => s.weight));
    const count = sigList.length;
    const repeatBonus = count > 1 ? Math.min(2, count - 1) : 0;
    totalScore += maxWeight + repeatBonus;

    const catCfg = playbookCategories[catName];
    if (catCfg?.hard && sigList.some((s) => s.weight >= 2)) {
      hardCategoriesMatched.add(catName);
    }
  }

  const typeMatches: OfflineScamTypeMatch[] = [];
  const satisfiedTypes: Array<{ typeName: string; matchCount: number; match: OfflineScamTypeMatch }> = [];

  for (const [typeName, rule] of Object.entries(playbookTypes)) {
    const allOf = rule.all_of ?? [];
    const anyOf = rule.any_of ?? [];
    const alsoAnyOf = rule.also_any_of ?? [];

    const allOfSatisfied = allOf.length === 0 || allOf.every((c) => matchedCategories.has(c));
    if (!allOfSatisfied) continue;

    const anyOfSatisfied = anyOf.length === 0 || anyOf.some((c) => matchedCategories.has(c));
    if (!anyOfSatisfied) continue;

    const alsoSatisfied = alsoAnyOf.length === 0 || alsoAnyOf.some((c) => matchedCategories.has(c));
    if (!alsoSatisfied) continue;

    const unionCats = new Set([...allOf, ...anyOf, ...alsoAnyOf]);
    const matchedInType = Array.from(unionCats).filter((c) => matchedCategories.has(c));
    const numMatched = matchedInType.length;

    let confidence: "low" | "medium" | "high" = "low";
    if (totalScore >= 11 || numMatched >= 3) {
      confidence = "high";
    } else if (totalScore >= 7 || numMatched >= 2) {
      confidence = "medium";
    }

    const tm: OfflineScamTypeMatch = {
      type: typeName,
      confidence,
      matched_categories: matchedInType,
    };
    typeMatches.push(tm);
    satisfiedTypes.push({ typeName, matchCount: numMatched, match: tm });
  }

  let level: OfflineRiskLevel = "safe";
  const hasTypeSatisfied = satisfiedTypes.length > 0;
  const hasTwoHardCategories = hardCategoriesMatched.size >= 2;

  if (totalScore >= 11 || (hasTypeSatisfied && hasTwoHardCategories)) {
    level = "scam";
  } else if (totalScore >= 7 || hasTypeSatisfied) {
    level = "likely_scam";
  } else if (totalScore >= 3) {
    level = "suspicious";
  }

  const allUnreviewed = signals.every((s) => !s.reviewed);
  if (allUnreviewed && (level === "likely_scam" || level === "scam")) {
    level = "suspicious";
  }

  let primaryType = "none";
  if (satisfiedTypes.length > 0) {
    const evidenceLower = signals.map((s) => s.evidence.toLowerCase()).join(" ");
    const hasAny = (words: string[]) => words.some((w) => evidenceLower.includes(w));

    const priorityScore = (tName: string, matchCount: number): number => {
      let bonus = 0;
      if (tName === "lottery_prize" && hasAny(["lottery", "prize", "लॉटरी", "इनाम", "kbc", "केबीसी", "25 lakh"])) {
        bonus += 5;
      } else if (tName === "upi_refund" && hasAny(["refund", "cashback", "रिफंड", "कैशबैक", "qr", "wrong payment", "galti se"])) {
        bonus += 5;
      }

      if (tName === "utility_disconnect" && hasAny(["electric", "power", "bijli", "बिजली", "bill", "बिल"])) {
        bonus += 5;
      } else if (tName === "bank_kyc" && hasAny(["bank", "account", "kyc", "खाता", "केवाईसी", "अकाउंट", "sbi"])) {
        bonus += 5;
      } else if (tName === "tech_support_remote" && hasAny(["virus", "hacked", "microsoft", "windows", "computer"])) {
        bonus += 5;
      }

      if (tName === "digital_arrest" && matchedCategories.has("ISOLATION")) {
        bonus += 6;
      } else if (tName === "courier_parcel" && hasAny(["fedex", "courier", "कूरियर", "parcel", "पार्सल"])) {
        bonus += 3;
      }

      return matchCount + bonus;
    };

    satisfiedTypes.sort((a, b) => {
      const pa = priorityScore(a.typeName, a.matchCount);
      const pb = priorityScore(b.typeName, b.matchCount);
      if (pb !== pa) return pb - pa;
      return b.matchCount - a.matchCount;
    });
    primaryType = satisfiedTypes[0].typeName;
  } else if (totalScore >= 3) {
    primaryType = "unknown_suspicious";
  }

  const adviceKeys: string[] = [];
  if (level === "scam" || level === "likely_scam") {
    adviceKeys.push("hang_up");
    if (matchedCategories.has("OTP_PIN_REQUEST") || matchedCategories.has("ACCOUNT_THREAT")) {
      adviceKeys.push("never_share_otp");
    }
    if (
      matchedCategories.has("MONEY_TRANSFER") ||
      primaryType === "digital_arrest" ||
      primaryType === "courier_parcel" ||
      primaryType === "lottery_prize"
    ) {
      adviceKeys.push("never_transfer_money");
    }
    adviceKeys.push("call_1930");
    adviceKeys.push("warn_family");
  } else if (level === "suspicious") {
    adviceKeys.push("verify_independently");
    if (matchedCategories.has("OTP_PIN_REQUEST")) {
      adviceKeys.push("never_share_otp");
    }
    adviceKeys.push("hang_up");
  } else {
    adviceKeys.push("stay_alert");
  }

  return {
    score: totalScore,
    level,
    primaryType,
    typeMatches,
    adviceKeys,
  };
}

