import os
import yaml
from pathlib import Path
from typing import List, Dict, Any, Optional, Set, Tuple
from app.engine.normalizer import NormalizedText, normalize_text
from app.models.analysis import Signal

# Cache for playbook
_PLAYBOOK_CACHE: Optional[Dict[str, Any]] = None

NEGATION_TOKENS: Set[str] = {
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
    "fake",
    "नकली",
    "beware",
    "savdhan",
    "सावधान",
    "threatening",
    "threaten",
    "threatened",
    "advisory",
    "सतर्क",
    "सतर्कता",
}

# Words that form secrecy/isolation phrases with 'mat' - when 'mat' is part of these, it's not a generic negation
EXCLUDED_NEGATION_COMBOS: Set[str] = {
    "mat batana",
    "मत बताना",
    "mat batao",
    "मत बताओ",
    "mat bolna",
    "मत बोलना",
    "mat kaatna",
    "मत काटना",
}

REQUEST_VERBS: Set[str] = {
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
    "बोलिए",
    "बोलिये",
    "boliye",
    "bolo",
    "padhiye",
    "पढ़िए",
    "पढ़िए",
}

DIGIT_WORDS: Set[str] = {
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "oh",
    "शून्य", "एक", "दो", "तीन", "चार", "पांच", "पाँच", "छह", "छः", "सात", "आठ", "नौ",
    "shunya", "ek", "do", "teen", "char", "paanch", "panch", "chheh", "che", "saat", "aath", "nau",
    "जीरो", "वन", "टू", "थ्री", "फोर", "फाइव", "सिक्स", "सेवन", "एट", "नाइन",
}

AMOUNT_KEYWORDS: Set[str] = {
    "thousand", "lakh", "lakhs", "crore", "crores", "hundred", "rupees",
    "हजार", "हज़ार", "लाख", "करोड़", "रुपये", "रुपए", "रुपया",
    "थाउजेंड", "थाउजंड", "थाउज़न्ड",
}

TRANSFER_VERBS: Set[str] = {
    "send", "transfer", "deposit", "bhejiye", "bhejo", "bhej", "remit",
    "भेजिए", "भेजें", "भेजो", "जमा", "ट्रांसफर", "डिपॉजिट", "pay",
}

DELIVERY_WORDS: Set[str] = {
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
}


def load_playbook(playbook_path: Optional[str] = None) -> Dict[str, Any]:
    global _PLAYBOOK_CACHE
    if playbook_path is None:
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        playbook_path = str(base_dir / "data" / "playbook" / "playbook.yaml")

    with open(playbook_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
        _PLAYBOOK_CACHE = data
        return data


class Matcher:
    def __init__(self, playbook_data: Optional[Dict[str, Any]] = None):
        if playbook_data is None:
            playbook_data = load_playbook()
        self.playbook = playbook_data
        self.categories_config = playbook_data.get("categories", {})
        self.types_config = playbook_data.get("types", {})
        self.advisory_phrases: List[str] = playbook_data.get("advisory_phrases", [])
        self.helpline_numbers: Set[str] = set(playbook_data.get("helpline_numbers", []))
        self.advisory_authorities: Set[str] = set(playbook_data.get("advisory_authorities", []))
        self.advisory_frame_keywords: Set[str] = set(playbook_data.get("advisory_frame_keywords", []))

        # Pre-normalize patterns and index them
        self._compiled_patterns = []
        for cat_name, cat_cfg in self.categories_config.items():
            base_weight = cat_cfg.get("weight", 2)
            is_hard = cat_cfg.get("hard", False)
            needs_req = cat_cfg.get("needs_request_context", False)

            for p in cat_cfg.get("patterns", []):
                raw_pattern = p.get("text", "")
                lang = p.get("lang", "any")
                reviewed = p.get("reviewed", True)
                norm_pat = normalize_text(raw_pattern).norm_text
                if norm_pat:
                    self._compiled_patterns.append({
                        "category": cat_name,
                        "raw_pattern": raw_pattern,
                        "norm_pattern": norm_pat,
                        "base_weight": base_weight,
                        "hard": is_hard,
                        "needs_request_context": needs_req,
                        "lang": lang,
                        "reviewed": reviewed,
                        "pattern_tokens": norm_pat.split(),
                    })

    def _get_sentence_tokens(
        self, tokens: List[Dict[str, Any]], tok_start: int, tok_end: int, num_tokens: int
    ) -> List[Dict[str, Any]]:
        current_sentence = tokens[tok_start]["sentence_idx"]
        has_multiple_sentences = (tokens[-1]["sentence_idx"] != tokens[0]["sentence_idx"])
        if has_multiple_sentences:
            return [t for t in tokens if t["sentence_idx"] == current_sentence]

        # In an unpunctuated stream, find sentence/clause bounds around match.
        # Delimit by double space (turn boundary) or window of up to 25 tokens.
        s_start = tok_start
        while s_start > 0 and (tok_start - s_start) < 25:
            if tokens[s_start]["raw_start"] - tokens[s_start - 1]["raw_end"] >= 2:
                break
            s_start -= 1

        s_end = tok_end
        while s_end < num_tokens - 1 and (s_end - tok_end) < 25:
            if tokens[s_end + 1]["raw_start"] - tokens[s_end]["raw_end"] >= 2:
                break
            s_end += 1

        return tokens[s_start : s_end + 1]

    def _is_authority_advisory_sentence(
        self, sentence_tokens: List[Dict[str, Any]], is_authority_claim: bool = False
    ) -> bool:
        sent_words = [t["text"] for t in sentence_tokens]
        sent_str = " " + " ".join(sent_words) + " "

        # Check for advisory frame
        def _check_advisory_frame() -> bool:
            # 1. Advisory phrases from playbook
            for adv in self.advisory_phrases:
                if adv in sent_str:
                    return True

            # 2. Advisory frame keywords with semantic checks
            # "fake" / "नकली"
            if " fake " in sent_str or " नकली " in sent_str:
                is_contraband = any(cb in sent_str for cb in [
                    "fake passport", "fake debit", "fake credit", "fake currency",
                    "fake notes", "fake note", "fake id", "fake account", "fake sim",
                    "नकली पासपोर्ट", "नकली नोट", "नकली करेंसी"
                ])
                is_advisory = any(at in sent_str for at in [
                    "fake call", "fake calls", "fake notice", "fake officer", "fake threatening",
                    "fake warrant", "fake arrest", "fake threat", "नकली कॉल", "नकली अफसर", "नकली वारंट", "धमकाने वाली"
                ])
                if is_advisory or not is_contraband:
                    return True

            # "never" / "कभी नहीं" / "कभी भी ... नहीं"
            has_hindi_never = (" कभी " in sent_str or " कभी भी " in sent_str) and (" नहीं " in sent_str or " न " in sent_str)
            if " never " in sent_str or " कभी नहीं " in sent_str or " कभी भी नहीं " in sent_str or has_hindi_never:
                if "i have never" in sent_str or "i never" in sent_str or "maine kabhi" in sent_str:
                    if any(ia in sent_str for ia in ["police never", "courts never", "bank will never", "never transfer", "never share", "कभी भी नहीं करती"]):
                        return True
                else:
                    return True

            # "report" / "शिकायत"
            if " report " in sent_str or " शिकायत " in sent_str:
                if any(rw in sent_str for rw in [
                    "report to", "report on", "report immediately", "report fraud", "report fake",
                    "report threatening", "report call", "cyber crime portal", "cybercrime", "helpline", "1930",
                    "रिपोर्ट करें", "शिकायत तुरंत", "शिकायत दर्ज", "पोर्टल पर"
                ]):
                    return True

            # "advisory", "awareness", "सावधान", "जागरूकता", "परामर्श", "सतर्क", "prevention", "beware"
            for kw in ["advisory", "awareness", "सावधान", "सावधानी", "जागरूकता", "परामर्श", "सतर्क", "prevention", "beware"]:
                if f" {kw} " in sent_str:
                    return True

            return False

        has_advisory_frame = _check_advisory_frame()
        if not has_advisory_frame:
            return False

        # Check authority
        if is_authority_claim:
            has_authority = True
        else:
            has_authority = any(
                f" {au} " in sent_str for au in self.advisory_authorities
            ) or any(
                au in sent_str for au in self.advisory_authorities
            )

        return has_advisory_frame and has_authority

    def match_text(
        self, norm: NormalizedText, segment_index: int = 0
    ) -> Tuple[List[Signal], Dict[str, Any]]:
        raw_text = norm.raw_text
        norm_text = norm.norm_text
        tokens = norm.tokens
        num_tokens = len(tokens)

        padded_norm = f" {norm_text} "

        has_delivery_context = any(
            t["text"] in DELIVERY_WORDS for t in tokens
        ) or any(dw in padded_norm for dw in ["delivery", "डिलीवरी", "order", "at your gate", "गेट पर"])

        raw_matches = []

        for pat in self._compiled_patterns:
            norm_pat = pat["norm_pattern"]
            padded_pat = f" {norm_pat} "

            start_search = 0
            while True:
                idx = padded_norm.find(padded_pat, start_search)
                if idx == -1:
                    break

                match_norm_start = idx
                match_norm_end = idx + len(norm_pat)
                start_search = match_norm_start + 1

                # Find token span for this match
                tok_start = 0
                tok_end = num_tokens - 1
                for ti, tok in enumerate(tokens):
                    if tok["norm_start"] <= match_norm_start:
                        tok_start = ti
                    if tok["norm_end"] >= match_norm_end:
                        tok_end = ti
                        break

                current_sentence = tokens[tok_start]["sentence_idx"]

                # Context Rule 1: Negation / Warning & Advisory Frame Suppression
                # Check tokens outside the pattern itself, within the same clause/sentence
                if pat["category"] in {"OTP_PIN_REQUEST", "MONEY_TRANSFER", "SECRECY", "THREAT_ARREST", "ISOLATION"}:
                    # Backward window: check up to 10 tokens before
                    before_indices = [
                        ti for ti in range(max(0, tok_start - 10), tok_start)
                        if tokens[ti]["sentence_idx"] == current_sentence
                    ]
                    # Forward window: Hindi negation follows coordinate list (up to 8 tokens)
                    after_indices = [
                        ti for ti in range(tok_end + 1, min(num_tokens, tok_end + 9))
                        if tokens[ti]["sentence_idx"] == current_sentence
                    ]

                    before_words = [tokens[ti]["text"] for ti in before_indices]
                    before_str = " " + " ".join(before_words) + " "
                    after_words = [tokens[ti]["text"] for ti in after_indices]
                    after_str = " " + " ".join(after_words) + " "

                    has_negation = False

                    # Check English & Hindi advisory phrases preceding the pattern (from playbook)
                    for adv in self.advisory_phrases:
                        if adv in before_str:
                            adv_norm = adv.split()
                            adv_len = len(adv_norm)
                            for bi in range(len(before_words) - adv_len + 1):
                                if before_words[bi:bi+adv_len] == adv_norm:
                                    intervening = before_words[bi+adv_len:]
                                    has_intervening_demand = any(
                                        w in {"bataiye", "batao", "bhejiye", "bhejo", "dijiye", "enter", "warrant", "active", "mandate", "demand"}
                                        for w in intervening
                                    )
                                    if not has_intervening_demand:
                                        has_negation = True
                                        break
                            if has_negation:
                                break

                    # For SECRECY: if sharing/telling relates to credentials, it is a credential security advisory
                    if not has_negation and pat["category"] == "SECRECY":
                        if any(w in before_str for w in ["otp", "pin", "password", "cvv", "ओटीपी", "पिन", "पासवर्ड", "कोड"]):
                            has_negation = True

                    # Check Hindi warning verbs immediately following credential / coordinate list
                    if not has_negation and pat["category"] in {"OTP_PIN_REQUEST", "MONEY_TRANSFER"}:
                        for adv_post in [
                            "share mat", "शेयर मत", "साझा मत", "मत देना", "मत बताना", "मत करना", "mat karna",
                            "न दें", "शेयर न", "साझा न", "कभी मत", "kabhi mat", "नहीं मांगता", "नहीं मांगते",
                            "savdhan", "सावधान", "fraud calls",
                        ]:
                            if adv_post in after_str:
                                # Ensure no intervening demand verb
                                post_idx = after_str.find(adv_post)
                                intervening_post = after_str[:post_idx].split()
                                if not any(w in {"bataiye", "batao", "bhejiye", "bhejo", "dijiye", "enter", "share"} for w in intervening_post):
                                    has_negation = True
                                    break

                    # Check standard negation tokens in standard window (max 5 tokens before, 3 tokens after)
                    if not has_negation:
                        std_before = [
                            ti for ti in range(max(0, tok_start - 5), tok_start)
                            if tokens[ti]["sentence_idx"] == current_sentence
                        ]
                        std_after = [
                            ti for ti in range(tok_end + 1, min(num_tokens, tok_end + 4))
                            if tokens[ti]["sentence_idx"] == current_sentence
                        ]
                        for ti in std_before + std_after:
                            tok_word = tokens[ti]["text"]

                            # Check excluded combos like 'mat batana' (secrecy) or 'do not tell' (secrecy)
                            is_combo = False
                            if ti + 1 < num_tokens:
                                combo = f"{tok_word} {tokens[ti+1]['text']}"
                                if combo in EXCLUDED_NEGATION_COMBOS or combo in {"do not tell", "don't tell", "dont tell", "do not disconnect", "don't disconnect"}:
                                    is_combo = True
                            if ti > 0:
                                combo_prev = f"{tokens[ti-1]['text']} {tok_word}"
                                if combo_prev in EXCLUDED_NEGATION_COMBOS:
                                    is_combo = True

                            if is_combo:
                                continue

                            if tok_word in NEGATION_TOKENS:
                                # For THREAT_ARREST, only negate if directly attached to advisory verbs, not victim denial like "never engaged"
                                if pat["category"] == "THREAT_ARREST":
                                    if tok_word in {"fake", "नकली", "beware", "सावधान"}:
                                        has_negation = True
                                        break
                                else:
                                    has_negation = True
                                    break

                            if ti + 1 < num_tokens:
                                two_word = f"{tok_word} {tokens[ti+1]['text']}"
                                if two_word in {
                                    "do not", "don't", "mat karna", "मत करना", "kabhi mat", "कभी मत",
                                    "caller threatening", "any caller", "fraud prevention", "security advisory",
                                    "never share", "police never", "courts never", "bank never", "stay vigilant",
                                    "साझा न", "शेयर न", "मत देना", "सतर्क रहें", "सावधान रहें"
                                }:
                                    has_negation = True
                                    break

                    if has_negation:
                        continue

                # Generic Rule (M3.1b): An authority name inside a sentence that contains an advisory frame
                # must not score AUTHORITY_CLAIM, THREAT_ARREST or MONEY_TRANSFER for that sentence.
                if pat["category"] in {"AUTHORITY_CLAIM", "THREAT_ARREST", "MONEY_TRANSFER"}:
                    sent_tokens = self._get_sentence_tokens(tokens, tok_start, tok_end, num_tokens)
                    if self._is_authority_advisory_sentence(
                        sent_tokens, is_authority_claim=(pat["category"] == "AUTHORITY_CLAIM")
                    ):
                        continue

                # Context Rule: Authority Claims inside advisory frames
                if pat["category"] == "AUTHORITY_CLAIM":
                    # Check if authority is stating institutional negation (e.g. "police and courts never", "police never", "bank will never")
                    post_auth_tokens = [tokens[ti]["text"] for ti in range(tok_end + 1, min(num_tokens, tok_end + 5))]
                    post_auth_str = " ".join(post_auth_tokens)
                    if any(pw in post_auth_str for pw in ["never", "will never", "and courts never", "kabhi nahi", "कभी नहीं", "डू नॉट", "do not"]):
                        continue

                    # Check if authority is part of an awareness bulletin / advisory header
                    surrounding_tokens = [
                        tokens[ti]["text"] for ti in range(max(0, tok_start - 6), min(num_tokens, tok_end + 7))
                    ]
                    surrounding_str = " ".join(surrounding_tokens)
                    if any(aw in surrounding_str for aw in [
                        "public awareness", "awareness bulletin", "awareness message", "awareness announcement",
                        "fraud prevention", "security advisory", "customer advisory", "advisory bulletin",
                        "जागरूकता", "सुरक्षा जागरूकता", "वित्तीय जागरूकता",
                    ]):
                        continue

                # Context Rule: Urgency inside reporting/helpline frames
                if pat["category"] == "URGENCY":
                    surrounding_tokens = [
                        tokens[ti]["text"] for ti in range(max(0, tok_start - 4), min(num_tokens, tok_end + 5))
                    ]
                    surrounding_str = " ".join(surrounding_tokens)
                    if any(rw in surrounding_str for rw in [
                        "report", "helpline", "1930", "cybercrime", "cyber crime", "portal",
                        "रिपोर्ट", "शिकायत", "हेल्पलाइन", "पोर्टल", "one nine three zero"
                    ]):
                        continue

                # Context Rule 3: needs_request_context
                has_request_context = True
                if pat["needs_request_context"]:
                    window_start = max(0, tok_start - 6)
                    window_end = min(num_tokens, tok_end + 7)
                    found_request_verb = False
                    for ti in range(window_start, window_end):
                        if tokens[ti]["sentence_idx"] == current_sentence:
                            tok_word = tokens[ti]["text"]
                            if tok_word in REQUEST_VERBS:
                                found_request_verb = True
                                break
                    has_request_context = found_request_verb

                # Exact substring extraction from raw_text
                evidence_text, raw_start, raw_end = norm.get_raw_substring(
                    match_norm_start, match_norm_end
                )

                if not evidence_text:
                    continue

                raw_matches.append({
                    "category": pat["category"],
                    "base_weight": pat["base_weight"],
                    "hard": pat["hard"],
                    "needs_request_context": pat["needs_request_context"],
                    "has_request_context": has_request_context,
                    "evidence": evidence_text,
                    "raw_start": raw_start,
                    "raw_end": raw_end,
                    "reviewed": pat["reviewed"],
                    "segment_index": segment_index,
                })
        # Context Rule: Spoken digit sequence following code request
        has_code_request = any(
            m["category"] == "OTP_PIN_REQUEST" for m in raw_matches
        )
        if has_code_request:
            idx_tok = 0
            while idx_tok < num_tokens:
                if tokens[idx_tok]["text"] in DIGIT_WORDS or tokens[idx_tok]["text"].isdigit():
                    j = idx_tok
                    while j < num_tokens and (tokens[j]["text"] in DIGIT_WORDS or tokens[j]["text"].isdigit()):
                        j += 1
                    if j - idx_tok >= 3:
                        seq_norm_start = tokens[idx_tok]["norm_start"]
                        seq_norm_end = tokens[j - 1]["norm_end"]
                        ev_text, r_start, r_end = norm.get_raw_substring(seq_norm_start, seq_norm_end)
                        
                        # Check if this digit sequence is a helpline number (like 1930) or near helpline/report
                        norm_seq = " ".join(tokens[k]["text"] for k in range(idx_tok, j))
                        is_helpline = norm_seq in self.helpline_numbers or any(hn in norm_seq for hn in self.helpline_numbers)
                        nearby_words = [tokens[k]["text"] for k in range(max(0, idx_tok - 4), min(num_tokens, j + 4))]
                        if any(w in {"helpline", "report", "portal", "cybercrime", "crime", "हेल्पलाइन", "रिपोर्ट", "पोर्टल"} for w in nearby_words):
                            is_helpline = True

                        if ev_text and not is_helpline:
                            raw_matches.append({
                                "category": "OTP_PIN_REQUEST",
                                "base_weight": 3,
                                "hard": True,
                                "needs_request_context": False,
                                "has_request_context": True,
                                "evidence": ev_text,
                                "raw_start": r_start,
                                "raw_end": r_end,
                                "reviewed": True,
                                "segment_index": segment_index,
                            })
                    idx_tok = j
                else:
                    idx_tok += 1

        # Context Rule: Spelled-out amount with transfer/deposit/send/bhejiye
        for ti, tok in enumerate(tokens):
            if tok["text"] in TRANSFER_VERBS:
                window = range(max(0, ti - 5), min(num_tokens, ti + 6))
                for wi in window:
                    if tokens[wi]["text"] in AMOUNT_KEYWORDS:
                        start_tok = min(ti, wi)
                        end_tok = max(ti, wi)
                        # Check generic authority advisory rule for MONEY_TRANSFER
                        sent_tokens = self._get_sentence_tokens(tokens, start_tok, end_tok, num_tokens)
                        if self._is_authority_advisory_sentence(sent_tokens, is_authority_claim=False):
                            break
                        ev_text, r_start, r_end = norm.get_raw_substring(
                            tokens[start_tok]["norm_start"], tokens[end_tok]["norm_end"]
                        )
                        if ev_text:
                            raw_matches.append({
                                "category": "MONEY_TRANSFER",
                                "base_weight": 3,
                                "hard": True,
                                "needs_request_context": False,
                                "has_request_context": True,
                                "evidence": ev_text,
                                "raw_start": r_start,
                                "raw_end": r_end,
                                "reviewed": True,
                                "segment_index": segment_index,
                            })
                        break

        # Institutional Advisory Context:
        is_advisory_call = any(
            hdr in padded_norm for hdr in [
                "public awareness bulletin", "awareness bulletin", "fraud prevention announcement",
                "fraud awareness", "customer security advisory", "security advisory",
                "सुरक्षा जागरूकता सेवा", "सुरक्षा जागरूकता", "वित्तीय जागरूकता संदेश", "वित्तीय जागरूकता",
                "जागरूकता सेवा", "ग्राहक सुरक्षा", "rbi public awareness", "bulletin from the reserve bank",
                "fraud prevention unit"
            ]
        ) and any(
            adv in padded_norm for adv in [
                "never share", "police never", "courts never", "bank will never", "stay vigilant",
                "helpline", "1930", "cyber crime", "साझा न करें", "शेयर न करें", "सतर्क रहें", "सावधान रहें"
            ]
        )

        if is_advisory_call:
            has_unnegated_demands = any(
                (m["category"] in {"OTP_PIN_REQUEST", "MONEY_TRANSFER"} and m.get("has_request_context", True)) or
                m["category"] == "REMOTE_ACCESS_APP" or
                (m["category"] in {"ISOLATION", "THREAT_ARREST"} and m["base_weight"] >= 3)
                for m in raw_matches
            )
            if not has_unnegated_demands:
                raw_matches = []

        deduped_matches = self._deduplicate_matches(raw_matches)

        hard_categories_matched = {
            m["category"] for m in deduped_matches if m["hard"]
        }
        delivery_downgrade = False
        if has_delivery_context and hard_categories_matched == {"OTP_PIN_REQUEST"}:
            delivery_downgrade = True

        signals: List[Signal] = []
        for i, m in enumerate(deduped_matches):
            weight = m["base_weight"]

            if m["needs_request_context"] and not m["has_request_context"]:
                weight = 1

            if delivery_downgrade and m["category"] == "OTP_PIN_REQUEST":
                weight = 1

            sig_id = f"sig_{segment_index:02d}_{i+1:03d}"
            signals.append(
                Signal(
                    id=sig_id,
                    category=m["category"],
                    weight=weight,
                    evidence=m["evidence"],
                    segment_index=m["segment_index"],
                    start_char=m["raw_start"],
                    end_char=m["raw_end"],
                    reviewed=m["reviewed"],
                )
            )

        match_meta = {
            "has_delivery_context": has_delivery_context,
            "delivery_downgrade": delivery_downgrade,
        }
        return signals, match_meta

    def _deduplicate_matches(self, matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not matches:
            return []

        matches.sort(key=lambda m: (m["raw_start"], -(m["raw_end"] - m["raw_start"])))

        result = []
        seen_spans = set()

        for m in matches:
            span_key = (m["category"], m["raw_start"], m["raw_end"])
            if span_key in seen_spans:
                continue

            is_subspan = False
            for prev in result:
                if (
                    prev["category"] == m["category"]
                    and prev["raw_start"] <= m["raw_start"]
                    and prev["raw_end"] >= m["raw_end"]
                ):
                    is_subspan = True
                    break

            if not is_subspan:
                result.append(m)
                seen_spans.add(span_key)

        return result
