"""Unit tests for usage counters and budget enforcement."""

import json
from pathlib import Path
from unittest.mock import patch

import pytest
from app.gnani.usage import (
    BudgetExhausted,
    check_stt_budget,
    check_tts_budget,
    get_current_day_usage,
    record_stt_usage,
    record_tts_usage,
)


def test_record_and_check_budget(tmp_path: Path):
    usage_file = tmp_path / "usage.json"
    with patch("app.gnani.usage.USAGE_FILE", usage_file), \
         patch("app.gnani.usage.CACHE_DIR", tmp_path), \
         patch("app.gnani.usage.get_daily_stt_seconds_cap", return_value=100.0), \
         patch("app.gnani.usage.get_daily_tts_chars_cap", return_value=500):

        # Initial state: 0 used
        init = get_current_day_usage()
        assert init["stt_seconds"] == 0.0
        assert init["tts_chars"] == 0

        # Record usage
        record_stt_usage(45.5)
        record_tts_usage(200)

        mid = get_current_day_usage()
        assert mid["stt_seconds"] == 45.5
        assert mid["tts_chars"] == 200

        # Within budget check
        check_stt_budget(30.0)  # 45.5 + 30 = 75.5 <= 100 -> OK
        check_tts_budget(100)   # 200 + 100 = 300 <= 500 -> OK

        # Exceeding budget raises BudgetExhausted
        with pytest.raises(BudgetExhausted) as exc_stt:
            check_stt_budget(60.0)  # 45.5 + 60 = 105.5 > 100
        assert exc_stt.value.kind == "stt"

        with pytest.raises(BudgetExhausted) as exc_tts:
            check_tts_budget(350)  # 200 + 350 = 550 > 500
        assert exc_tts.value.kind == "tts"
