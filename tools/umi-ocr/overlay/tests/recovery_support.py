"""Headless harness: real scheduler, parsers, controllers and exporters.
Only Qt/OS integration and engine inference are replaced in tests.
"""
import importlib
import logging
from pathlib import Path
import sys
import threading
import types
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'UmiOCR-data' / 'py_src'

def module(name, **attrs):
    obj = types.ModuleType(name)
    obj.__dict__.update(attrs)
    return obj

class Mutex:
    def __init__(self):
        self.lock_ = threading.Lock()
    def lock(self):
        self.lock_.acquire()
    def unlock(self):
        self.lock_.release()

class Clipboard:
    pass

for name, path in [('recoverytest', SOURCE), ('recoverytest.mission', SOURCE / 'mission'),
                   ('recoverytest.utils', SOURCE / 'utils'), ('recoverytest.ocr', SOURCE / 'ocr'),
                   ('recoverytest.tag_pages', SOURCE / 'tag_pages')]:
    sys.modules[name] = module(name, __path__=[str(path)])

stubs = {
    'umi_log': module('umi_log', logger=logging.getLogger('recoverytest')),
    'PySide2': module('PySide2'),
    'PySide2.QtCore': module('PySide2.QtCore', QMutex=Mutex, QRunnable=object,
                            QObject=object, QFileInfo=object),
    'PySide2.QtGui': module('PySide2.QtGui', QClipboard=Clipboard),
    'PySide2.QtQml': module('PySide2.QtQml', QJSValue=object),
    'recoverytest.utils.thread_pool': module('recoverytest.utils.thread_pool', threadRun=lambda fn: None),
    'recoverytest.platform': module('recoverytest.platform', Platform=types.SimpleNamespace(startfile=lambda p: None)),
}
previous = {name: sys.modules.get(name) for name in stubs}
sys.modules.update(stubs)
try:
    recovery = importlib.import_module('recoverytest.mission.recovery')
    mission = importlib.import_module('recoverytest.mission.mission')
    ocr = importlib.import_module('recoverytest.mission.mission_ocr')
    doc = importlib.import_module('recoverytest.mission.mission_doc')
    batch_ocr = importlib.import_module('recoverytest.tag_pages.BatchOCR')
    batch_doc = importlib.import_module('recoverytest.tag_pages.BatchDOC')
finally:
    for name, value in previous.items():
        if value is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = value

class Controller:
    def __init__(self):
        self.events = []
    def callFunc(self, fn, *args):
        fn(*args)
    def callQml(self, key, fn, *args):
        self.events.append((fn, args))

class FakeApi:
    def __init__(self):
        self.calls = []
        self.fail = set()
    def start(self, options):
        return '[Success]'
    def runPath(self, path):
        self.calls.append(path)
        if Path(path).name in self.fail:
            return {'code': 500, 'data': 'injected failure'}
        return {'code': 100, 'data': [{'text': Path(path).stem,
                'score': 0.9, 'box': [[0,0],[100,0],[100,20],[0,20]], 'end':'\n'}]}
    def stop(self):
        pass

def options(directory):
    return {'mission.dirType': 'specify', 'mission.dir': str(directory),
            'mission.fileNameFormat': 'result', 'mission.datetimeFormat': '%Y%m%d',
            'mission.ignoreBlank': True, 'mission.filesType.csv': True,
            'mission.resume': True, 'tbpu.parser': 'none'}
