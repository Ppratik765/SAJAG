import unicodedata
from app.engine.normalizer import normalize_text


def test_normalizer_nfc_and_lowercase():
    raw = "Hello WORLD! This is a TEST."
    norm = normalize_text(raw)
    assert norm.norm_text == "hello world this is a test"
    assert len(norm.tokens) == 6


def test_normalizer_indic_preservation():
    raw = "नमस्ते दुनिया! यह एक परीक्षण है।"
    norm = normalize_text(raw)
    # Devanagari characters preserved, danda and exclamation converted to spaces
    assert "नमस्ते दुनिया यह एक परीक्षण है" == norm.norm_text


def test_normalizer_strips_zero_width_chars():
    # Insert ZWSP (\u200b), ZWNJ (\u200c), ZWJ (\u200d), BOM (\ufeff)
    raw = "C\u200bB\u200cI\u200d \ufeffOfficer"
    norm = normalize_text(raw)
    assert norm.norm_text == "cbi officer"


def test_normalizer_raw_offset_mapping():
    raw = "Special ALERT: Crime Branch officer Vikram here."
    norm = normalize_text(raw)
    # Find "crime branch" in normalized text
    idx = norm.norm_text.find("crime branch")
    assert idx != -1
    sub, r_start, r_end = norm.get_raw_substring(idx, idx + len("crime branch"))
    assert sub == "Crime Branch"
    assert raw[r_start:r_end] == "Crime Branch"


def test_normalizer_empty_and_whitespace():
    assert normalize_text("").norm_text == ""
    assert normalize_text("   \n\t  ").norm_text == ""
