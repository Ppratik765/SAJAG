import sys
import yaml

if sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

ids = [
    'da_hi_001', 'da_hien_001', 'bk_hi_001', 'bk_hien_001', 'ur_hien_001',
    'ud_hi_001', 'cp_hien_001', 'legit_ba_hi_001', 'legit_do_hien_001', 'legit_fm_hi_001'
]

for sid in ids:
    doc = yaml.safe_load(open(f'data/corpus/scripts/{sid}.yaml', encoding='utf-8'))
    print(f"### Script: `{sid}` ({doc['language']} | {doc['label']}{(' (' + doc['legit_kind'] + ')') if doc.get('legit_kind') else ''} | Split: `{doc['split']}`)")
    for t in doc['turns']:
        print(f"- **{t['speaker']}**: {t['text']}")
    print()
