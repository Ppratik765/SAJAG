"""Run the final_holdout scripts ONCE against the frozen engine (text only, 0 credits).

Do not tune the engine or playbook after seeing this output. If you do, relabel final_holdout contaminated.
"""

import json
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, ".")
sys.path.insert(0, "api")

from app.engine.analyzer import analyze_text  # noqa: E402
from eval.corpus import load_all_scripts  # noqa: E402


def main() -> None:
    commit = subprocess.run(["git", "log", "--format=%h", "-1", "--", "api/app/engine", "data/playbook"],
                            capture_output=True, text=True).stdout.strip()
    rows = []
    for s in load_all_scripts():
        if s.split != "final_holdout":
            continue
        res = analyze_text(s.full_text, language_code=s.language)
        flagged = res.level in ("likely_scam", "scam")
        rows.append({
            "id": s.id, "label": s.label, "language": s.language, "level": res.level, "score": res.score,
            "flagged": flagged,
            "signals": [{"category": g.category, "evidence": g.evidence, "weight": g.weight} for g in res.signals],
        })
    scam = [r for r in rows if r["label"] != "legit"]
    legit = [r for r in rows if r["label"] == "legit"]
    tp = sum(r["flagged"] for r in scam)
    fp = sum(r["flagged"] for r in legit)
    out = {"engine_last_changed_commit": commit, "n_scam": len(scam), "n_legit": len(legit),
           "scam_recall": f"{tp}/{len(scam)}", "legit_false_positives": f"{fp}/{len(legit)}", "items": rows}
    print(json.dumps({k: v for k, v in out.items() if k != "items"}, indent=2))
    for r in rows:
        mark = "OK " if (r["flagged"] == (r["label"] != "legit")) else "MISS" if r["label"] != "legit" else "FP  "
        print(f"{mark} {r['id']:<34} {r['level']:<12} score={r['score']:<3} "
              + "; ".join(f"{g['category']}:{g['evidence']}" for g in r["signals"]))
    with open("eval/results/final_holdout.json", "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
