import hashlib, json
from pathlib import Path

root = Path('/workspace/scratch/ea3fed8f4c52')
research = root / 'research/portrait-additions-20261004'
site = root / 'site-recovery'
progress = json.loads((research / 'production-progress.json').read_text())
changes = []
for kind, filename in [('new', 'accepted-portrait-additions-20261004.json'), ('existing', 'accepted-independent-redraws-20261004.json')]:
    path = site / 'atlas/data' / filename
    accepted = json.loads(path.read_text())
    records = {row['order']: row for row in progress[kind]}
    for row in accepted['records']:
        actual = records[row['order']]
        assert row['personId'] == actual['personId'] and row['sha256'] == actual['sha256']
        assert hashlib.sha256((site / row['path']).read_bytes()).hexdigest() == actual['sha256']
        if row['visualReview'] != actual['visualReview']:
            changes.append({'kind': kind, 'order': row['order'], 'personId': row['personId'], 'sha256': row['sha256'], 'previousReview': row['visualReview'], 'rootReviewedFlags': actual['visualReview']})
            row['visualReview'] = actual['visualReview'].copy()
            for field in ['fullBodyReviewedAt', 'fullBodyReviewBasis']:
                if field in actual:
                    row[field] = actual[field]
    path.write_text(json.dumps(accepted, ensure_ascii=False, indent=2) + '\n')
report = {'status': 'aligned', 'changedMetadataRecords': len(changes), 'overwrittenImages': 0, 'changes': changes}
(research / 'visual-review-alignment.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': 'aligned', 'changedMetadataRecords': len(changes), 'overwrittenImages': 0}))
