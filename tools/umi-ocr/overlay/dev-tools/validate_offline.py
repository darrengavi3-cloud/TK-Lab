#!/usr/bin/env python3
"""Validate a local bundle under kernel network denial (Linux/macOS)."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import sys
import tempfile
import time

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'UmiOCR-data/plugins'))
from sumi_rapidocr.client import Api
from sumi_rapidocr.bundle import read_bundle


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for key in ('python','bundle','image','output'):
        p.add_argument('--'+key,required=True)
    a=p.parse_args()
    read_bundle(a.bundle)
    api=Api({'python_executable':a.python,'bundle_manifest':a.bundle,'kernel_offline':True})
    try:
        start=time.perf_counter()
        message=api.start({})
        if message.startswith('[Error]'):
            raise RuntimeError(message)
        startup=time.perf_counter()-start
        start=time.perf_counter()
        result=api.runPath(a.image)
        elapsed=time.perf_counter()-start
        if result['code']!=100:
            raise RuntimeError(str(result))
        guard=api.engineInfo.get('offline_validation',{})
        if not all(guard.get(family+'_socket_denied') or guard.get(family+'_connect_denied')
                   for family in ('ipv4','ipv6')):
            raise RuntimeError('Kernel network-denial evidence missing')
        report={'schema_version':1,'platform':platform.platform(),'startup_seconds':startup,
                'recognition_seconds':elapsed,'engine':api.engineInfo,
                'image_sha256':hashlib.sha256(Path(a.image).read_bytes()).hexdigest(),
                'bundle_manifest_sha256':hashlib.sha256(Path(a.bundle).read_bytes()).hexdigest(),
                'result':result,'passed':True}
        with Path(a.output).open('x',encoding='utf-8') as stream:
            json.dump(report,stream,ensure_ascii=False,indent=2)
        print(json.dumps({'passed':True,'guard':guard,'output':a.output},ensure_ascii=False))
    finally:
        api.stop()


if __name__=='__main__':
    main()
