import json, sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, ".")
sys.path.insert(0, "api")

from app.engine.analyzer import analyze_text
from eval.corpus import load_all_scripts

scripts = {s.id: s for s in load_all_scripts()}
data = json.load(open("eval/results/latest.json", encoding="utf-8"))

splits = ["dev", "test", "holdout", "fresh_holdout"]
metrics = {sp: {"tp": 0, "fn": 0, "fp": 0, "tn": 0, "scam_total": 0, "legit_total": 0} for sp in splits}

dropped_scams = []
new_fps = []

for it in data["items"]:
    sid = it["script_id"]
    var = it["variant"]
    s = scripts[sid]
    sp = s.split
    
    # We analyze the clean and tel transcripts as present in latest.json
    res = analyze_text(it["transcript"], language_code=s.language)
    is_scam = res.level in ("likely_scam", "scam")
    was_scam = it["is_detected_scam"]
    
    if s.label != "legit":
        metrics[sp]["scam_total"] += 1
        if is_scam:
            metrics[sp]["tp"] += 1
        else:
            metrics[sp]["fn"] += 1
            if was_scam:
                dropped_scams.append((sid, var, sp, it["score"], res.score))
    else:
        metrics[sp]["legit_total"] += 1
        if is_scam:
            metrics[sp]["fp"] += 1
            if not was_scam:
                new_fps.append((sid, var, sp, it["score"], res.score))
        else:
            metrics[sp]["tn"] += 1

print("================================================================================")
print("                    FULL CORPUS REGRESSION RESULTS")
print("================================================================================")
for sp in splits:
    m = metrics[sp]
    recall = (m["tp"] / m["scam_total"] * 100) if m["scam_total"] > 0 else 0
    fp_rate = (m["fp"] / m["legit_total"] * 100) if m["legit_total"] > 0 else 0
    precision = (m["tp"] / (m["tp"] + m["fp"]) * 100) if (m["tp"] + m["fp"]) > 0 else 0
    print(f"Split: {sp.upper():<14} | Scam Recall: {recall:>5.1f}% ({m['tp']}/{m['scam_total']}) | Legit FP Rate: {fp_rate:>5.2f}% ({m['fp']}/{m['legit_total']}) | Precision: {precision:>5.1f}%")

print("\nDropped Scams:", dropped_scams)
print("New False Positives:", new_fps)
print("================================================================================")
