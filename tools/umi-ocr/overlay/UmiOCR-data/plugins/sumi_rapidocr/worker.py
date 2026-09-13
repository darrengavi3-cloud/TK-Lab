#!/usr/bin/env python3
"""Private JSON-lines worker, separate from the Qt interpreter."""
import argparse
import json
import sys
from contextlib import redirect_stdout
from backend import Backend


def send(value):
    print(json.dumps(value, ensure_ascii=False, allow_nan=False), flush=True)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--bundle', required=True)
    parser.add_argument('--detail', action='store_true')
    args=parser.parse_args()
    try:
        with redirect_stdout(sys.stderr):
            backend=Backend(args.bundle,args.detail)
        send({'event':'ready','engineInfo':backend.info})
    except Exception as exc:
        send({'event':'error','message':str(exc)})
        return 1
    for line in sys.stdin:
        try:
            request=json.loads(line)
            result=backend.run(request)
        except Exception as exc:
            result={'code':902,'data':'Sumi engine failed: '+str(exc)}
        send(result)
    return 0


if __name__=='__main__':
    sys.exit(main())
