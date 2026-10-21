import subprocess
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Load baseline from git HEAD
head_json = subprocess.check_output(['git', 'show', 'HEAD:eval/results/latest.json'], encoding='utf-8')
head_data = json.loads(head_json)

# Load current rescored data
curr_data = json.load(open('eval/results/latest.json', encoding='utf-8'))

target_ids = [
    'fresh_holdout_legit_police_hi_001',
    'fresh_holdout_legit_police_en_001',
    'bank_advisory_en_calib_005',
]

print("=" * 80)
print("         SIGNALS BEFORE (HEAD / Pre-M3.1b) vs AFTER (Current / Post-M3.1b)")
print("=" * 80)

for sid in target_ids:
    head_items = [it for it in head_data['items'] if it['script_id'] == sid]
    curr_items = [it for it in curr_data['items'] if it['script_id'] == sid]
    
    for h, c in zip(head_items, curr_items):
        var = h['variant']
        print(f"\n--- Target: {sid} [{var}] ---")
        print(f"BEFORE M3.1b: Score={h.get('score', 0)}, is_detected_scam={h.get('is_detected_scam', False)}")
        sigs_before = h.get('signals', [])
        if sigs_before:
            for s in sigs_before:
                print(f"  - category: {s.get('category')}, weight: {s.get('weight')}, evidence: {repr(s.get('evidence'))}")
        else:
            print("  - (no signals)")
            
        print(f"AFTER M3.1b:  Score={c.get('score', 0)}, is_detected_scam={c.get('is_detected_scam', False)}")
        sigs_after = c.get('signals', [])
        if sigs_after:
            for s in sigs_after:
                print(f"  - category: {s.get('category')}, weight: {s.get('weight')}, evidence: {repr(s.get('evidence'))}")
        else:
            print("  - (no signals - fully safe)")

print("=" * 80)
