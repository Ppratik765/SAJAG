import unicodedata
import string
from typing import List, Tuple, Dict, Any, Set

ZERO_WIDTH_CHARS: Set[str] = {
    "\u200b",
    "\u200c",
    "\u200d",
    "\ufeff",
}

SENTENCE_BOUNDARIES: Set[str] = {
    ".",
    "!",
    "?",
    "|",
    "।",
    "॥",
    "\n",
    "\r",
}

PUNCTUATION_CHARS: Set[str] = set(string.punctuation) | {
    "।",
    "॥",
    "“",
    "”",
    "‘",
    "’",
    "‚",
    "„",
    "—",
    "–",
    "…",
    "·",
    "•",
    "«",
    "»",
    "¿",
    "¡",
}


class NormalizedText:
    def __init__(self, raw_text: str, norm_text: str, norm_to_raw: List[int], tokens: List[Dict[str, Any]]):
        self.raw_text = raw_text
        self.norm_text = norm_text
        self.norm_to_raw = norm_to_raw
        self.tokens = tokens  # list of dicts: {"text": str, "norm_start": int, "norm_end": int, "raw_start": int, "raw_end": int, "sentence_idx": int}

    def get_raw_substring(self, norm_start: int, norm_end: int) -> Tuple[str, int, int]:
        if norm_start >= norm_end or norm_start >= len(self.norm_to_raw):
            return "", 0, 0

        raw_start = self.norm_to_raw[norm_start]
        last_norm_idx = min(norm_end - 1, len(self.norm_to_raw) - 1)
        raw_end = self.norm_to_raw[last_norm_idx] + 1

        raw_slice = self.raw_text[raw_start:raw_end]
        
        # Trim leading whitespace
        lead_trim = len(raw_slice) - len(raw_slice.lstrip())
        raw_start += lead_trim
        raw_slice = raw_slice[lead_trim:]

        # Trim trailing whitespace
        trail_trim = len(raw_slice) - len(raw_slice.rstrip())
        if trail_trim > 0:
            raw_end -= trail_trim
            raw_slice = raw_slice[:-trail_trim]

        return self.raw_text[raw_start:raw_end], raw_start, raw_end


def normalize_text(raw_text: str) -> NormalizedText:
    if not raw_text:
        return NormalizedText("", "", [], [])

    nfc_raw = unicodedata.normalize("NFC", raw_text)

    norm_chars: List[str] = []
    norm_to_raw: List[int] = []
    char_sentence_indices: List[int] = []

    current_sentence = 0
    in_space = False

    for raw_idx, ch in enumerate(nfc_raw):
        if ch in ZERO_WIDTH_CHARS:
            continue
        elif ch in SENTENCE_BOUNDARIES:
            current_sentence += 1
            if not in_space:
                norm_chars.append(" ")
                norm_to_raw.append(raw_idx)
                char_sentence_indices.append(current_sentence)
                in_space = True
        elif ch in PUNCTUATION_CHARS or ch.isspace():
            if not in_space:
                norm_chars.append(" ")
                norm_to_raw.append(raw_idx)
                char_sentence_indices.append(current_sentence)
                in_space = True
        else:
            in_space = False
            lowered = ch.lower()
            norm_chars.append(lowered)
            norm_to_raw.append(raw_idx)
            char_sentence_indices.append(current_sentence)

    start_offset = 0
    while start_offset < len(norm_chars) and norm_chars[start_offset] == " ":
        start_offset += 1

    end_offset = len(norm_chars)
    while end_offset > start_offset and norm_chars[end_offset - 1] == " ":
        end_offset -= 1

    final_chars = norm_chars[start_offset:end_offset]
    final_mapping = norm_to_raw[start_offset:end_offset]
    final_sentences = char_sentence_indices[start_offset:end_offset]
    final_norm_text = "".join(final_chars)

    tokens: List[Dict[str, Any]] = []
    current_token_chars: List[str] = []
    token_norm_start = 0

    for i, ch in enumerate(final_norm_text):
        if ch == " ":
            if current_token_chars:
                token_str = "".join(current_token_chars)
                tokens.append({
                    "text": token_str,
                    "norm_start": token_norm_start,
                    "norm_end": i,
                    "raw_start": final_mapping[token_norm_start],
                    "raw_end": final_mapping[i - 1] + 1,
                    "sentence_idx": final_sentences[token_norm_start],
                })
                current_token_chars = []
        else:
            if not current_token_chars:
                token_norm_start = i
            current_token_chars.append(ch)

    if current_token_chars:
        token_str = "".join(current_token_chars)
        i = len(final_norm_text)
        tokens.append({
            "text": token_str,
            "norm_start": token_norm_start,
            "norm_end": i,
            "raw_start": final_mapping[token_norm_start],
            "raw_end": final_mapping[i - 1] + 1,
            "sentence_idx": final_sentences[token_norm_start],
        })

    return NormalizedText(nfc_raw, final_norm_text, final_mapping, tokens)
