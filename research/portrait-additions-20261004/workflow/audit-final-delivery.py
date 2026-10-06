import argparse, csv, hashlib, json, subprocess
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--require-complete', action='store_true')
args = parser.parse_args()
root = Path('/workspace/scratch/ea3fed8f4c52')
research = root / 'research/portrait-additions-20261004'
site = root / 'site-recovery'
subprocess.run(['python', str(research / 'workflow/export-acceptance-record.py')], check=True)
progress = json.loads((research / 'production-progress.json').read_text())
index = json.loads((research / 'checkpoint-images.json').read_text())
with (research / 'portrait-acceptance-record.csv').open(encoding='utf-8-sig') as file:
    csv_rows = {(row['kind'], int(row['order'])): row for row in csv.DictReader(file)}
manifest = json.loads((site / 'atlas/data/portrait-manifest.json').read_text())
pending = []
checked = []
preserved = {}
for kind, count, filename in [('new', 100, 'accepted-portrait-additions-20261004.json'), ('existing', 150, 'accepted-independent-redraws-20261004.json')]:
    site_rows = {row['order']: row for row in json.loads((site / 'atlas/data' / filename).read_text())['records']}
    active = {row['order']: row for row in progress[kind]}
    for order in range(1, count + 1):
        if order not in active:
            pending.append({'kind': kind, 'order': order, 'reason': 'not-produced'})
            continue
        row = active[order]
        image_path = root / row['path']
        sha = hashlib.sha256(image_path.read_bytes()).hexdigest()
        assert sha == row['sha256'] == index[row['path']]
        with Image.open(image_path) as image:
            assert image.size == (row['width'], row['height'])
            image.verify()
        csv_row = csv_rows[('new' if kind == 'new' else 'independent-redraw', order)]
        reasons = [field for field in ['front', 'ageAppropriate', 'fullBody', 'completeHands', 'completeFeet', 'desktopVerified', 'mobileVerified', 'desktopBuiltVerified', 'mobileBuiltVerified'] if csv_row[field] != 'True']
        if order not in site_rows:
            reasons.append('not-integrated')
        else:
            bound = site_rows[order]
            assert bound['personId'] == row['personId'] and bound['sha256'] == sha
            assert hashlib.sha256((site / row['path']).read_bytes()).hexdigest() == sha
            portrait_id = f'portrait:additional:20261004:{order:03d}' if kind == 'new' else row['portraitId']
            asset = manifest['assetsById'][portrait_id]
            assert asset['personId'] == row['personId'] and asset['src'] == bound['assetPath']
            assert portrait_id in manifest['byPersonId'][row['personId']]['portraitIds']
            if bound['visualReview'] != row['visualReview']:
                reasons.append('site-review-metadata')
            original = bound.get('originalSrc')
            if original and bound.get('originalSha256'):
                original_path = site / 'atlas' / original.removeprefix('./')
                assert hashlib.sha256(original_path.read_bytes()).hexdigest() == bound['originalSha256']
                preserved[str(original_path.relative_to(site))] = bound['originalSha256']
        if reasons:
            pending.append({'kind': kind, 'order': order, 'personId': row['personId'], 'reasons': reasons})
        checked.append({'kind': kind, 'order': order, 'personId': row['personId'], 'file': row['path'], 'sha256': sha})
report = {'status': 'passed' if not pending else 'in-progress', 'newAccepted': len(progress['new']), 'independentRedrawAccepted': len(progress['existing']), 'activeHashAndDimensionsChecked': len(checked), 'preservedOriginalFilesChecked': len(preserved), 'unfinishedCount': len(pending), 'unfinished': pending, 'activeRecords': checked, 'preservedOriginals': preserved, 'costumeEvidence': '待考', 'note': 'Visual flags refer to recorded original-image reviews; page checks refer to exact active file. Does not infer historical appearance or source calls from faces.'}
(research / 'delivery-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({key: value for key, value in report.items() if key not in ['activeRecords', 'preservedOriginals', 'unfinished']}))
if args.require_complete:
    assert not pending and len(checked) == 250, 'Delivery incomplete; see delivery-audit.json'
