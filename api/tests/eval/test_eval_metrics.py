"""Tests for evaluation metrics and character error rate (CER) calculations."""

from __future__ import annotations

import pytest

from eval.run_eval import compute_cer, compute_metrics


def test_compute_cer_exact_match():
    assert compute_cer("Hello world", "Hello world") == 0.0
    assert compute_cer("नमस्ते दुनिया", "नमस्ते दुनिया") == 0.0


def test_compute_cer_differences():
    # 1 edit in 5 chars
    cer = compute_cer("apple", "apply")
    assert abs(cer - 0.2) < 1e-4

    # Empty cases
    assert compute_cer("", "") == 0.0
    assert compute_cer("test", "") == 1.0


def test_compute_metrics_confusion_matrix():
    eval_items = [
        # 3 True scams
        {"is_true_scam": True, "is_detected_scam": True, "label": "digital_arrest", "primary_type": "digital_arrest", "time_to_detect_likely_scam": 12.0, "cer": 0.05},
        {"is_true_scam": True, "is_detected_scam": True, "label": "bank_kyc", "primary_type": "bank_kyc", "time_to_detect_likely_scam": 18.0, "cer": 0.08},
        {"is_true_scam": True, "is_detected_scam": False, "label": "upi_refund", "primary_type": "none", "time_to_detect_likely_scam": None, "cer": 0.12}, # FN
        # 2 Legit calls
        {"is_true_scam": False, "is_detected_scam": False, "label": "legit", "primary_type": "none", "time_to_detect_likely_scam": None, "cer": 0.04}, # TN
        {"is_true_scam": False, "is_detected_scam": True, "label": "legit", "primary_type": "bank_kyc", "time_to_detect_likely_scam": 15.0, "cer": 0.06}, # FP
    ]

    m = compute_metrics(eval_items)

    assert m["total_clips"] == 5
    assert m["tp"] == 2
    assert m["fp"] == 1
    assert m["tn"] == 1
    assert m["fn"] == 1

    # Precision: 2 / (2 + 1) = 0.6667
    assert abs(m["precision"] - 0.6667) < 0.001
    # Recall: 2 / (2 + 1) = 0.6667
    assert abs(m["recall"] - 0.6667) < 0.001
    # F1: 0.6667
    assert abs(m["f1"] - 0.6667) < 0.001
    # False positive rate: 1 / (1 + 1) = 0.5
    assert abs(m["false_positive_rate"] - 0.5) < 0.001
    # Type accuracy among TP: both correct (2/2 = 1.0)
    assert m["type_accuracy"] == 1.0
    # Median time to detect: median of [12.0, 18.0] = 18.0 (index 1)
    assert m["median_time_to_detect_s"] in (12.0, 18.0)
