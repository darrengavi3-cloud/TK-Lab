#!/usr/bin/env python3
"""Export/import a complete local Sumi model archive; no downloads."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'UmiOCR-data/plugins'))
from sumi_rapidocr.package import export_bundle, import_bundle


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command',required=True)
    pack = sub.add_parser('export')
    pack.add_argument('--bundle',required=True)
    pack.add_argument('--python',required=True)
    pack.add_argument('--output',required=True)
    unpack = sub.add_parser('import')
    unpack.add_argument('--archive',required=True)
    unpack.add_argument('--directory',required=True)
    args = parser.parse_args()
    try:
        result = (export_bundle(args.bundle,args.python,args.output) if args.command=='export'
                  else {'bundle':import_bundle(args.archive,args.directory)})
        print(json.dumps(result,ensure_ascii=False))
        return 0
    except Exception as exc:
        print(str(exc),file=sys.stderr)
        return 1


if __name__=='__main__':
    sys.exit(main())
