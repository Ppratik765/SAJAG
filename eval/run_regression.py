import argparse
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, ".")
sys.path.insert(0, "api")

from app.engine.analyzer import analyze_text
from eval.corpus import load_all_scripts


def parse_args():
    parser = argparse.ArgumentParser(description="Run regression evaluation across splits.")
    parser.add_argument(
        "--text-only",
        action="store_true",
        help="Score data/corpus/scripts via analyze_text directly on script text (text, no STT noise).",
    )
    return parser.parse_args()


def get_effective_split(s) -> str:
    if s.id.startswith("adv_") and s.split == "dev":
        return "adv_dev"
    if s.split == "adv_holdout":
        return "adv_holdout"
    if s.id.startswith("fresh_holdout_"):
        return "fresh_holdout"
    if s.id.startswith("holdout_"):
        return "holdout"
    return s.split


def main():
    args = parse_args()
    all_scripts = load_all_scripts()
    scripts = {s.id: s for s in all_scripts}

    splits = ["dev", "test", "holdout", "fresh_holdout", "adv_dev", "adv_holdout"]
    metrics = {
        sp: {"tp": 0, "fn": 0, "fp": 0, "tn": 0, "scam_total": 0, "legit_total": 0}
        for sp in splits
    }

    dropped_scams = []
    new_fps = []

    if args.text_only:
        print("================================================================================")
        print("         FULL CORPUS REGRESSION RESULTS (TEXT ONLY, NO STT NOISE)")
        print("================================================================================")
        for s in all_scripts:
            sp = get_effective_split(s)
            res = analyze_text(s.full_text, language_code=s.language)
            is_scam = res.level in ("likely_scam", "scam")

            if s.label != "legit":
                metrics[sp]["scam_total"] += 1
                if is_scam:
                    metrics[sp]["tp"] += 1
                else:
                    metrics[sp]["fn"] += 1
                    dropped_scams.append((s.id, sp, res.level, res.score))
            else:
                metrics[sp]["legit_total"] += 1
                if is_scam:
                    metrics[sp]["fp"] += 1
                    new_fps.append((s.id, sp, res.level, res.score))
                else:
                    metrics[sp]["tn"] += 1
    else:
        print("================================================================================")
        print("         FULL CORPUS REGRESSION RESULTS (AUDIO REPLAY / STT)")
        print("================================================================================")
        data = json.load(open("eval/results/latest.json", encoding="utf-8"))
        for it in data["items"]:
            sid = it["script_id"]
            var = it.get("variant", "unknown")
            if sid not in scripts:
                continue
            s = scripts[sid]
            sp = get_effective_split(s)

            res = analyze_text(it["transcript"], language_code=s.language)
            is_scam = res.level in ("likely_scam", "scam")
            was_scam = it.get("is_detected_scam", False)

            if s.label != "legit":
                metrics[sp]["scam_total"] += 1
                if is_scam:
                    metrics[sp]["tp"] += 1
                else:
                    metrics[sp]["fn"] += 1
                    if was_scam:
                        dropped_scams.append((sid, var, sp, it.get("score", 0), res.score))
            else:
                metrics[sp]["legit_total"] += 1
                if is_scam:
                    metrics[sp]["fp"] += 1
                    if not was_scam:
                        new_fps.append((sid, var, sp, it.get("score", 0), res.score))
                else:
                    metrics[sp]["tn"] += 1

    for sp in splits:
        m = metrics[sp]
        total = m["scam_total"] + m["legit_total"]
        if total == 0:
            continue
        recall = (m["tp"] / m["scam_total"] * 100) if m["scam_total"] > 0 else 0
        fp_rate = (m["fp"] / m["legit_total"] * 100) if m["legit_total"] > 0 else 0
        precision = (m["tp"] / (m["tp"] + m["fp"]) * 100) if (m["tp"] + m["fp"]) > 0 else 0
        print(
            f"Split: {sp.upper():<14} | Scam Recall: {recall:>5.1f}% ({m['tp']:>2}/{m['scam_total']:>2}) | "
            f"Legit FP Rate: {fp_rate:>5.2f}% ({m['fp']:>2}/{m['legit_total']:>2}) | Precision: {precision:>5.1f}%"
        )

    print("\nDropped Scams:", dropped_scams)
    print("New False Positives:", new_fps)
    print("================================================================================")


if __name__ == "__main__":
    main()
