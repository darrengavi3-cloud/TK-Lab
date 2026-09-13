"""Desktop region review controller; OCR dependencies stay in the worker."""
from pathlib import Path
import threading
import os

from PySide2.QtCore import Signal, Slot, Qt
from .page import Page
from ..ocr.review.region_session import RegionSession
from ..ocr.review.candidates import text_of


def variant(value):
    return value.toVariant() if hasattr(value,'toVariant') else value


class RegionOCR(Page):
    finished = Signal(object)

    def __init__(self, ctrlKey, controller):
        super().__init__(ctrlKey,controller)
        self.session = None
        self.running = False
        self.api = None
        self.cancelled = threading.Event()
        self.finished.connect(self._finish,Qt.QueuedConnection)

    def defaults(self):
        return {'model_directory':str(Path(os.environ.get('SUMI_DATA_DIR', str(Path.home()/'Sumi-OCR')))/'models'),
                'python':os.environ.get('SUMI_ENGINE_PYTHON',''),
                'bundle':os.environ.get('SUMI_MODEL_BUNDLE','')}

    def _start(self, operation):
        if self.running:
            return {'error':'任务仍在处理中。'}
        self.running = True
        self.cancelled.clear()
        def run():
            try:
                result = operation()
            except Exception as exc:
                result = {'error':str(exc)}
            if self.cancelled.is_set():
                result = dict(result,error='已取消；已保存的候选仍保留。')
            self.finished.emit(result)
        threading.Thread(target=run,daemon=True).start()
        return {'started':True}

    @Slot(object)
    def _finish(self, result):
        self.running = False
        self.callQml('operationFinished',result)

    def openSource(self, path, output, page=1, password=''):
        if not output:
            output = str(Path(path).resolve().parent/'Sumi-OCR-review')
        def operation():
            session = RegionSession(path,output,int(page),password)
            self.session = session
            return {'source':session.info()}
        return self._start(operation)

    def importModel(self, archive, directory):
        def operation():
            from sumi_rapidocr.package import import_bundle
            return {'bundle':import_bundle(archive,directory)}
        return self._start(operation)

    def recognize(self, python, bundle, region, scale=2, detail=False):
        if not self.session:
            return {'error':'请先打开图片或文档。'}
        session = self.session
        region = variant(region)
        def operation():
            from sumi_rapidocr.client import Api
            api = Api({'python_executable':python,'bundle_manifest':bundle})
            self.api = api
            try:
                if self.cancelled.is_set():
                    return {}
                message = api.start({'detail':detail})
                if message.startswith('[Error]'):
                    raise RuntimeError(message)
                if self.cancelled.is_set():
                    return {}
                history = session.recognize(api,region,int(scale),bool(detail))
                return {'history':self._present(history)}
            finally:
                api.stop()
                self.api = None
        return self._start(operation)

    def history(self, region):
        try:
            return self._present(self.session.history(variant(region))) if self.session else {}
        except Exception as exc:
            return {'error':str(exc)}

    @staticmethod
    def _present(history):
        for candidate in history['candidates']:
            result = candidate['result']
            candidate['display_text'] = (text_of(result) if result.get('code')==100 else
                                         '未检出文字' if result.get('code')==101 else str(result.get('data','识别失败')))
            info = result.get('engineInfo',{})
            candidate['display_label'] = '{} · {} 倍 · {} · 未校对'.format(
                info.get('profile','未知模型'), candidate['settings']['scale'],
                '增强细节' if candidate['settings']['detail'] else '标准细节')
        return history

    def cancel(self):
        self.cancelled.set()
        api = self.api
        if api:
            api.cancel()
