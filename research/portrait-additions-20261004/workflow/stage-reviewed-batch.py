import json, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path('/workspace/scratch/ea3fed8f4c52')
WORK = ROOT / 'work/portraits-20261004'
RESEARCH = ROOT / 'research/portrait-additions-20261004'
kind, batch, orders, reviewed = sys.argv[1:]
assert kind in ['new', 'redraw'] and reviewed == '--root-reviewed-originals'
result = subprocess.run([sys.executable, str(WORK / f'accept-{kind}-batch.py'), batch, orders], cwd=ROOT, capture_output=True, text=True)
if result.returncode:
    print(result.stderr or result.stdout)
    sys.exit(result.returncode)
prompt = f'{kind}-prompts-{batch}.json'
results = f'{"redraw-" if kind == "redraw" else ""}results-{batch}.json'
dest_prompt = f'{"generation" if kind == "new" else "redraw"}-prompts-{batch}.json'
dest_results = f'{"generation" if kind == "new" else "redraw"}-results-{batch}.json'
shutil.copy2(WORK / prompt, RESEARCH / dest_prompt)
shutil.copy2(WORK / results, RESEARCH / dest_results)
costume = ROOT / f'research/costume-reference-20261004/person-design-{kind}-{batch}.json'
shutil.copy2(WORK / prompt, costume)
paths = [str((RESEARCH / name).relative_to(ROOT)) for name in ['production-progress.json', 'production-status.json', 'visual-review-progress.json', 'checkpoint-images.json', dest_prompt, dest_results]] + [str(costume.relative_to(ROOT))]
receipt = {'kind': kind, 'batch': batch, 'orders': orders, 'paths': paths, 'reviewBasis': 'Root visually inspected each original PNG before invoking this helper.'}
(WORK / 'pending-batch-commit.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
status = json.loads((RESEARCH / 'production-status.json').read_text())
print(json.dumps({'newAccepted': status['newAccepted'], 'redrawAccepted': status['existingAccepted'], 'batch': batch, 'filesReady': len(json.loads((WORK / 'pending-new-images.json').read_text()))}))
