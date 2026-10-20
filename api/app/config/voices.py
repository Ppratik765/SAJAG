"""Voice configuration for Timbre TTS (v2.5).

Each voice has one preferred language. Always pass the matching language.
Default warning voices are selected for calm, clear articulation.
"""

from __future__ import annotations

# Available Timbre v2.5 voices per language (spec section 2.5)
VOICES_BY_LANGUAGE: dict[str, list[str]] = {
    "en-IN": ["Kaveri", "Trupti", "Devika", "Pranav", "Shlok", "Girish"],
    "hi-IN": [
        "Nalini",
        "Bhavna",
        "Yashvi",
        "Urmila",
        "Jwala",
        "Chitra",
        "Ambuja",
        "Deepak",
        "Roopesh",
        "Vikrant",
        "Hemraj",
        "Jalaj",
        "Omkar",
    ],
    "hi-en": ["Poorvi"],
    "ta-IN": ["Asmita", "Trisha", "Brinda", "Vedika", "Noopur"],
    "te-IN": ["Suhana", "Lehara", "Lavanya", "Yukti", "Varuni"],
    "kn-IN": ["Saanvi", "Kavin"],
    "ml-IN": ["Reshma", "Riyaan"],
    "mr-IN": ["Zahira", "Ishaan"],
    "bn-IN": ["Kirra", "Dhruva"],
    "gu-IN": ["Falak", "Veera"],
    "pa-IN": ["Mehuli", "Zayan"],
}

# Default warning voice per language (spec section 2.5)
DEFAULT_WARNING_VOICES: dict[str, str] = {
    "hi-IN": "Chitra",
    "en-IN": "Kaveri",
    "hi-en": "Poorvi",
    "gu-IN": "Falak",
    "mr-IN": "Ishaan",
    "ta-IN": "Brinda",
    "te-IN": "Lavanya",
    "kn-IN": "Kavin",
    "ml-IN": "Reshma",
    "bn-IN": "Kirra",
    "pa-IN": "Zayan",
}


def get_default_warning_voice(language_code: str) -> str:
    """Return default warning voice for a language code, falling back to Chitra."""
    return DEFAULT_WARNING_VOICES.get(language_code, "Chitra")
