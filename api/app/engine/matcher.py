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

                # Context Rule 1: Negation / Warning Suppression
                # Strictly check tokens outside the pattern itself, within the SAME sentence
                if pat["category"] in {"OTP_PIN_REQUEST", "MONEY_TRANSFER", "SECRECY", "THREAT_ARREST", "ISOLATION"}:
                    before_indices = [
                        ti for ti in range(max(0, tok_start - 6), tok_start)
                        if tokens[ti]["sentence_idx"] == current_sentence
                    ]
                    after_indices = [
                        ti for ti in range(tok_end + 1, min(num_tokens, tok_end + 7))
                        if tokens[ti]["sentence_idx"] == current_sentence
                    ]

                    has_negation = False
                    for ti in before_indices + after_indices:
                        tok_word = tokens[ti]["text"]
                        
                        # Check if this token is part of an excluded combo like 'mat batana' or 'mat kaatna'
                        is_combo = False
                        if ti + 1 < num_tokens:
                            combo = f"{tok_word} {tokens[ti+1]['text']}"
                            if combo in EXCLUDED_NEGATION_COMBOS:
                                is_combo = True
                        if ti > 0:
                            combo_prev = f"{tokens[ti-1]['text']} {tok_word}"
                            if combo_prev in EXCLUDED_NEGATION_COMBOS:
                                is_combo = True

                        if is_combo:
                            continue

                        if tok_word in NEGATION_TOKENS:
                            has_negation = True
                            break
                        if ti + 1 < num_tokens:
                            two_word = f"{tok_word} {tokens[ti+1]['text']}"
                            if two_word in {"do not", "don't", "mat karna", "मत करना", "kabhi mat", "कभी मत"}:
                                has_negation = True
                                break

                    if has_negation:
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
