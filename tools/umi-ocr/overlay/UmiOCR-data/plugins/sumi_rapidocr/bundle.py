"""Versioned, local-only model bundles. Importable without OCR dependencies."""
import hashlib
import json
from pathlib import Path


def sha256(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def read_bundle(path):
    path = Path(path).resolve()
    manifest = json.loads(path.read_text(encoding='utf-8'))
    catalog = json.loads(Path(__file__).with_name('catalog.json').read_text(encoding='utf-8'))
    if manifest.get('schema_version') != 1 or manifest.get('profile') not in catalog['profiles']:
        raise ValueError('Unsupported model bundle; use prepare_models.py')
    for key in ('rapidocr_version', 'onnxruntime_version'):
        if manifest.get(key) != catalog[key]:
            raise ValueError('Runtime identity differs from the pinned catalog')
    profile = catalog['profiles'][manifest['profile']]
    files = {}
    for stage, spec in profile['models'].items():
        target = path.parent / spec['file']
        target.resolve().relative_to(path.parent)
        if not target.is_file() or sha256(target) != spec['sha256']:
            raise ValueError('Missing or changed model: ' + spec['file'])
        files[stage] = str(target)
    if manifest.get('models') != profile['models']:
        raise ValueError('Bundle does not match the pinned model catalog')
    return manifest, profile, files
