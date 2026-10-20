from typing import List, Dict, Any, Tuple
from app.models.analysis import (
    Signal,
    ScamTypeMatch,
    RiskLevel,
    PrimaryType,
)


def score_signals(
    signals: List[Signal],
    playbook_types: Dict[str, Any],
    playbook_categories: Dict[str, Any],
) -> Tuple[int, RiskLevel, PrimaryType, List[ScamTypeMatch], List[str]]:
    """
    Computes score, level, types, primary_type, and advice_keys per SAJAG_SPEC 5.4 and 5.5.
    """
    if not signals:
        return 0, "safe", "none", [], ["stay_alert"]

    # 1. Group signals by category
    cat_signals: Dict[str, List[Signal]] = {}
    for s in signals:
        cat_signals.setdefault(s.category, []).append(s)

    # 2. Compute category scores
    # Rule: Each category counts once at its max weight; repeated mentions add +1 up to +2 per category.
    total_score = 0
    matched_categories = set(cat_signals.keys())
    hard_categories_matched = set()

    for cat_name, sig_list in cat_signals.items():
        max_weight = max(s.weight for s in sig_list)
        count = len(sig_list)
        repeat_bonus = min(2, count - 1) if count > 1 else 0
        cat_score = max_weight + repeat_bonus
        total_score += cat_score

        cat_cfg = playbook_categories.get(cat_name, {})
        if cat_cfg.get("hard", False):
            if any(s.weight >= 2 for s in sig_list):
                hard_categories_matched.add(cat_name)

    # 3. Check Playbook Types satisfaction
    type_matches: List[ScamTypeMatch] = []
    satisfied_types: List[Tuple[str, int, ScamTypeMatch]] = []

    for type_name, rule in playbook_types.items():
        all_of = rule.get("all_of", [])
        any_of = rule.get("any_of", [])
        also_any_of = rule.get("also_any_of", [])

        # Check all_of condition
        all_of_satisfied = all(cat in matched_categories for cat in all_of) if all_of else True
        if not all_of_satisfied:
            continue

        # Check any_of condition
        any_of_satisfied = any(cat in matched_categories for cat in any_of) if any_of else True
        if not any_of_satisfied:
            continue

        # Check also_any_of condition
        also_satisfied = any(cat in matched_categories for cat in also_any_of) if also_any_of else True
        if not also_satisfied:
            continue

        matched_in_type = [c for c in (set(all_of) | set(any_of) | set(also_any_of)) if c in matched_categories]
        num_matched = len(matched_in_type)

        confidence = "low"
        if total_score >= 11 or num_matched >= 3:
            confidence = "high"
        elif total_score >= 7 or num_matched >= 2:
            confidence = "medium"

        tm = ScamTypeMatch(
            type=type_name,
            confidence=confidence,
            matched_categories=matched_in_type,
        )
        type_matches.append(tm)
        satisfied_types.append((type_name, num_matched, tm))

    # 4. Determine Level per Section 5.5
    # scam: score >= 11 OR (type satisfied AND >= 2 hard categories matched)
    # likely_scam: score >= 7 OR any playbook type satisfied
    # suspicious: score >= 3
    # safe: otherwise
    level: RiskLevel = "safe"
    has_type_satisfied = len(satisfied_types) > 0
    has_two_hard_categories = len(hard_categories_matched) >= 2

    if total_score >= 11 or (has_type_satisfied and has_two_hard_categories):
        level = "scam"
    elif total_score >= 7 or has_type_satisfied:
        level = "likely_scam"
    elif total_score >= 3:
        level = "suspicious"
    else:
        level = "safe"

    # Unreviewed Pattern Cap (Section 5.3):
    all_unreviewed = all(not s.reviewed for s in signals)
    if all_unreviewed and level in ("likely_scam", "scam"):
        level = "suspicious"

    # 5. Determine Primary Type with intelligent tie-breaking
    primary_type: PrimaryType = "none"
    if satisfied_types:
        evidence_lower = " ".join(s.evidence.lower() for s in signals)

        def type_priority_key(item: Tuple[str, int, ScamTypeMatch]) -> Tuple[int, int]:
            t_name, match_count, _ = item
            bonus = 0

            # Tie-break: lottery vs refund
            if t_name == "lottery_prize" and any(w in evidence_lower for w in ["lottery", "prize", "लॉटरी", "इनाम", "kbc", "केबीसी", "25 lakh"]):
                bonus += 5
            elif t_name == "upi_refund" and any(w in evidence_lower for w in ["refund", "cashback", "रिफंड", "कैशबैक", "qr", "wrong payment", "galti se"]):
                bonus += 5

            # Tie-break: bank_kyc vs utility_disconnect vs tech_support
            if t_name == "utility_disconnect" and any(w in evidence_lower for w in ["electric", "power", "bijli", "बिजली", "bill", "बिल"]):
                bonus += 5
            elif t_name == "bank_kyc" and any(w in evidence_lower for w in ["bank", "account", "kyc", "खाता", "केवाईसी", "अकाउंट", "sbi"]):
                bonus += 5
            elif t_name == "tech_support_remote" and any(w in evidence_lower for w in ["virus", "hacked", "microsoft", "windows", "computer"]):
                bonus += 5

            # Tie-break: courier_parcel vs digital_arrest
            if t_name == "digital_arrest" and "ISOLATION" in matched_categories:
                bonus += 6
            elif t_name == "courier_parcel" and any(w in evidence_lower for w in ["fedex", "courier", "कूरियर", "parcel", "पार्सल"]):
                bonus += 3

            return (match_count + bonus, match_count)

        satisfied_types.sort(key=type_priority_key, reverse=True)
        primary_type = satisfied_types[0][0]
    elif total_score >= 3:
        primary_type = "unknown_suspicious"
    else:
        primary_type = "none"

    # 6. Generate Advice Keys
    advice_keys = []
    if level in ("scam", "likely_scam"):
        advice_keys.append("hang_up")
        if "OTP_PIN_REQUEST" in matched_categories or "ACCOUNT_THREAT" in matched_categories:
            advice_keys.append("never_share_otp")
        if "MONEY_TRANSFER" in matched_categories or primary_type in ("digital_arrest", "courier_parcel", "lottery_prize"):
            advice_keys.append("never_transfer_money")
        advice_keys.append("call_1930")
        advice_keys.append("warn_family")
    elif level == "suspicious":
        advice_keys.append("verify_independently")
        if "OTP_PIN_REQUEST" in matched_categories:
            advice_keys.append("never_share_otp")
        advice_keys.append("hang_up")
    else:
        advice_keys.append("stay_alert")

    return total_score, level, primary_type, type_matches, advice_keys
