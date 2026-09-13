#!/usr/bin/env python3
"""Prepare a verified model bundle; downloads occur only with --download."""
import argparse
import json
from pathlib import Path
import shutil
import sys
import urllib.request

PLUGIN = Path(__file__).resolve().parents[1] / 'UmiOCR-data/plugins/sumi_rapidocr'
sys.path.insert(0, str(PLUGIN))
from bundle import sha256, read_bundle


def main():
    catalog = json.loads((PLUGIN/'catalog.json').read_text(encoding='utf-8'))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', choices=sorted(catalog['profiles']), required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--cache', type=Path, help='Directory containing previously downloaded ONNX files')
    parser.add_argument('--download', action='store_true', help='Allow downloading pinned models from RapidAI ModelScope')
    args = parser.parse_args()
    profile = catalog['profiles'][args.profile]
    owned_temporary = None
    try:
        args.output.mkdir(parents=True, exist_ok=True)
        for item in profile['models'].values():
            target = args.output/item['file']
            if target.exists():
                if sha256(target) != item['sha256']:
                    raise ValueError('Existing file differs; use a new output directory: ' + str(target))
                continue
            temporary = target.with_suffix('.partial')
            with temporary.open('xb') as output:
                owned_temporary = temporary
                cached = args.cache/item['file'] if args.cache else None
                if cached and cached.is_file():
                    with cached.open('rb') as source:
                        shutil.copyfileobj(source, output)
                elif args.download:
                    with urllib.request.urlopen(item['url'], timeout=60) as source:
                        shutil.copyfileobj(source, output)
                else:
                    raise ValueError('Model unavailable locally; supply --cache or explicitly enable --download')
            if sha256(temporary) != item['sha256']:
                raise ValueError('Downloaded model checksum mismatch: ' + item['file'])
            temporary.rename(target)
            owned_temporary = None
        manifest = {'schema_version':1, 'profile':args.profile, 'models':profile['models'],
                    'rapidocr_version':catalog['rapidocr_version'], 'onnxruntime_version':catalog['onnxruntime_version'],
                    'dictionary':'embedded in recognition ONNX metadata; covered by its SHA-256'}
        dest = args.output/'bundle.json'
        encoded = json.dumps(manifest, ensure_ascii=False, indent=2)+'\n'
        if dest.exists() and dest.read_text(encoding='utf-8') != encoded:
            raise ValueError('Existing bundle differs; use a new output directory')
        if not dest.exists():
            with dest.open('x', encoding='utf-8') as stream:
                stream.write(encoded)
        read_bundle(dest)
        print(dest.resolve())
        return 0
    except Exception as exc:
        if owned_temporary is not None and owned_temporary.exists():
            owned_temporary.unlink()
        print('Model preparation failed: ' + str(exc), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
