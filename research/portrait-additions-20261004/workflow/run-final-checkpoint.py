import concurrent.futures, datetime, json, pathlib, re, shutil, subprocess

ROOT = pathlib.Path('/workspace/scratch/ea3fed8f4c52')
SITE = ROOT / 'site-recovery'
RESEARCH = ROOT / 'research/portrait-additions-20261004'
PROOF = RESEARCH / 'integration-final-100-150.json'
state = {'status': 'running', 'newIntegrated': 100, 'independentRedrawIntegrated': 150,
         'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
         'costumeEvidenceStatus': '待考', 'steps': []}

def save():
    PROOF.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')

def run(label, command):
    log = RESEARCH / ('final-' + label + '.log')
    with log.open('w') as output:
        result = subprocess.run(command, cwd=SITE, stdout=output, stderr=subprocess.STDOUT)
    step = {'phase': label, 'command': command, 'exitCode': result.returncode, 'log': log.name}
    print(json.dumps(step), flush=True)
    return step

save()
for label, command in [('source', ['npm', 'run', 'verify:source']),
                       ('release', ['npm', 'run', 'release:offline'])]:
    step = run(label, command)
    state['steps'].append(step)
    if step['exitCode']:
        state.update(status='failed', failedPhase=label)
        save()
        raise SystemExit(step['exitCode'])
    output = (RESEARCH / step['log']).read_text()
    tests, passed, failed = [re.findall(r'ℹ ' + field + r' (\d+)', output)[-1] for field in ['tests', 'pass', 'fail']]
    assert tests == passed and failed == '0'
    state['sourceTests' if label == 'source' else 'builtSuiteTests'] = int(tests)
    save()

jobs = []
for kind, count in [('new', 100), ('redraw', 150)]:
    orders = ','.join(map(str, range(1, count + 1)))
    for built in [False, True]:
        label = kind + ('-built-pages' if built else '-source-pages')
        command = ['node', 'work/verify-portrait-batch.mjs', orders] + (['redraw'] if kind == 'redraw' else []) + (['--built'] if built else [])
        report = 'portrait-' + kind + '-batch-' + orders.replace(',', '-') + ('-built' if built else '') + '.json'
        jobs.append((label, command, report))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    futures = {pool.submit(run, label, command): (label, report) for label, command, report in jobs}
    reports = []
    checks = 0
    for future in concurrent.futures.as_completed(futures):
        label, report_name = futures[future]
        step = future.result()
        state['steps'].append(step)
        if step['exitCode']:
            state.update(status='failed', failedPhase=label)
            save()
            continue
        report = json.loads((SITE / 'work/validation' / report_name).read_text())
        assert report['status'] == 'passed' and all(row['passed'] for row in report['checks'])
        checks += len(report['checks'])
        shutil.copy2(SITE / 'work/validation' / report_name, RESEARCH / report_name)
        reports.append(report_name)
        save()
if any(step['exitCode'] for step in state['steps']):
    raise SystemExit(1)
step = run('diff', ['git', 'diff', '--check'])
state['steps'].append(step)
assert not step['exitCode']
assert checks == 1000
state.update(status='passed', failures=0, portraitViewportChecks=checks, reports=reports,
             completedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
save()
shutil.copy2(PROOF, SITE / 'research/portrait-additions-20261004' / PROOF.name)
print(json.dumps({key:value for key,value in state.items() if key != 'reports'}), flush=True)
