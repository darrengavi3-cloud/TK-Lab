#!/usr/bin/env python3
"""Recognize an image or enlarged region into a separate, unreviewed JSON result."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'UmiOCR-data/plugins'))
from sumi_rapidocr.client import Api


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--python', required=True, help='Independent engine Python executable')
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--image', type=Path, required=True)
    parser.add_argument('--region', type=int, nargs=4, metavar=('LEFT','TOP','RIGHT','BOTTOM'))
    parser.add_argument('--scale', type=int, choices=(1,2), default=1)
    parser.add_argument('--detail', action='store_true')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    api = Api({'python_executable':args.python, 'bundle_manifest':str(args.bundle.resolve())})
    try:
        if args.output.exists():
            raise ValueError('Output already exists; choose a new result filename')
        if not args.region and args.scale != 1:
            raise ValueError('--scale 2 requires --region in original image pixels')
        original = hashlib.sha256(args.image.read_bytes()).hexdigest()
        message = api.start({'detail':args.detail})
        if message.startswith('[Error]'):
            raise RuntimeError(message)
        result = (api.runRegion(args.image.resolve(), args.region, args.scale)
                  if args.region else api.runPath(args.image.resolve()))
        if hashlib.sha256(args.image.read_bytes()).hexdigest() != original:
            raise ValueError('Source changed during recognition; rerun on a stable file')
        result.update(schema_version=1, status='unreviewed', source_sha256=original,
                      coordinates='original_image_pixels')
        with args.output.open('x', encoding='utf-8') as stream:
            json.dump(result, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write('\n')
        print(str(args.output.resolve()))
        return 0 if result['code'] in (100,101) else 1
    except Exception as exc:
        print('Recognition failed: '+str(exc), file=sys.stderr)
        return 1
    finally:
        api.stop()


if __name__ == '__main__':
    sys.exit(main())
