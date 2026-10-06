import json, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path('/workspace/scratch/ea3fed8f4c52')
SITE = ROOT / 'site-recovery'
RESEARCH = ROOT / 'research/portrait-additions-20261004'
new_orders = sys.argv[1]
redraw_orders = sys.argv[2]
new_count = len(json.loads((SITE / 'atlas/data/accepted-portrait-additions-20261004.json').read_text())['records'])
redraw_count = len(json.loads((SITE / 'atlas/data/accepted-independent-redraws-20261004.json').read_text())['records'])
key = f'{new_count:03}-{redraw_count:03}'
proof = SITE / f'work/validation/integration-checkpoint-{key}.json'
proof.parent.mkdir(parents=True, exist_ok=True)
state = {'status': 'running', 'newIntegrated': new_count, 'independentRedrawIntegrated': redraw_count, 'steps': [], 'costumeEvidenceStatus': '待考'}

def save():
    proof.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')

commands = [('source', ['npm', 'run', 'verify:source']), ('release', ['npm', 'run', 'release:offline'])]
reports = []
for kind, orders in [('new', new_orders), ('redraw', redraw_orders)]:
    if orders == '-':
        continue
    commands.append((kind + '-pages', ['node', 'work/verify-portrait-batch.mjs', orders] + (['redraw'] if kind == 'redraw' else [])))
    reports.append(f'portrait-{kind}-batch-{orders.replace(",", "-")}.json')
    commands.append((kind + '-built-pages', ['node', 'work/verify-portrait-batch.mjs', orders] + (['redraw'] if kind == 'redraw' else []) + ['--built']))
    reports.append(f'portrait-{kind}-batch-{orders.replace(",", "-")}-built.json')
commands.append(('diff', ['git', 'diff', '--check']))
save()
for label, command in commands:
    log = SITE / f'work/validation/{key}-{label}.log'
    result = subprocess.run(command, cwd=SITE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors='replace')
    output = result.stdout
    log.write_text(output)
    state['steps'].append({'phase': label, 'command': command, 'exitCode': result.returncode, 'log': str(log.relative_to(SITE))})
    print(json.dumps({'phase': label, 'exitCode': result.returncode}), flush=True)
    print('\n'.join(output.splitlines()[-8:]), flush=True)
    if result.returncode:
        state.update(status='failed', failedPhase=label)
        save()
        sys.exit(result.returncode)
    if label in ['source', 'release']:
        count = re.findall(r'ℹ tests (\d+)', output)
        passed = re.findall(r'ℹ pass (\d+)', output)
        failed = re.findall(r'ℹ fail (\d+)', output)
        assert count and passed and failed, f'Missing test summary in {log}'
        assert count[-1] == passed[-1] and failed[-1] == '0', f'Tests not all passed in {log}'
        state['sourceTests' if label == 'source' else 'builtSuiteTests'] = int(count[-1])
    save()

viewport_checks = 0
for name in reports:
    source = SITE / 'work/validation' / name
    report = json.loads(source.read_text())
    assert report['status'] == 'passed' and all(row['passed'] for row in report['checks'])
    viewport_checks += len(report['checks'])
    for directory in [RESEARCH, SITE / 'research/portrait-additions-20261004']:
        shutil.copy2(source, directory / name)
state.update(status='passed', pipelineExitCode=0, portraitViewportChecks=viewport_checks, failures=0, reports=reports)
save()
for directory in [RESEARCH, SITE / 'research/portrait-additions-20261004']:
    shutil.copy2(proof, directory / proof.name)
status_path = RESEARCH / 'production-status.json'
status = json.loads(status_path.read_text())
status.update(siteIntegratedNewCount=new_count, siteValidatedIndependentRedrawCount=redraw_count, siteLocalIntegratedNewCount=new_count, siteLocalIndependentRedrawCount=redraw_count, siteIntegratedNewOrders=list(range(1, new_count + 1)))
status_path.write_text(json.dumps(status, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(state, ensure_ascii=False), flush=True)
