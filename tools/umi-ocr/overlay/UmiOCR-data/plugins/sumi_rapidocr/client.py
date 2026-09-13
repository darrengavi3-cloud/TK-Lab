"""Umi-compatible OCR API. Standard library only; inference runs in a worker."""
import base64
import json
import os
from pathlib import Path
import queue
import subprocess
import sys
import threading
from .process import worker_command, worker_environment


class Api:
    def __init__(self, globalArgd):
        self.python = str(globalArgd.get('python_executable') or os.environ.get('SUMI_ENGINE_PYTHON') or sys.executable)
        self.bundle = str(globalArgd.get('bundle_manifest') or os.environ.get('SUMI_MODEL_BUNDLE') or '')
        self.kernel_offline = bool(globalArgd.get('kernel_offline', False))
        self.timeout = 120
        self.process = None
        self.settings = None
        self.lock = threading.RLock()
        self.reader = None
        self.engineInfo = None

    def start(self, argd):
        with self.lock:
            settings = bool(argd.get('detail',False))
            if self.process and self.process.poll() is None and settings==self.settings:
                return '[Success]'
            self.stop()
            if not self.bundle or not Path(self.bundle).is_file():
                return '[Error] 请先准备本地模型包，并设置 bundle.json 路径。'
            try:
                command = worker_command(self.python, self.bundle, settings, self.kernel_offline)
                self.process=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL, encoding='utf-8', errors='strict',bufsize=1,
                    creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0), env=worker_environment())
                replies=queue.Queue()
                self.replies=replies
                output=self.process.stdout
                def read():
                    try:
                        for line in output:
                            replies.put(json.loads(line))
                    except Exception as exc:
                        replies.put({'event':'error','message':str(exc)})
                    finally:
                        replies.put({'event':'error','message':'OCR worker exited'})
                self.reader=threading.Thread(target=read,daemon=True)
                self.reader.start()
                ready=replies.get(timeout=self.timeout)
                if ready.get('event')!='ready':
                    raise RuntimeError(ready.get('message','Invalid worker greeting'))
                self.engineInfo=ready['engineInfo']
                self.settings=settings
                return '[Success]'
            except Exception as exc:
                self.stop()
                return '[Error] Sumi 引擎启动失败，请检查独立 Python 环境和模型包：'+str(exc)

    def stop(self):
        with self.lock:
            process=self.process
            self.process=None
            if process:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=2)
                if self.reader:
                    self.reader.join(timeout=2)
                for stream in (process.stdin,process.stdout):
                    if stream:
                        stream.close()
            self.reader=None
            self.settings=None
            self.engineInfo=None

    def _run(self, request):
        with self.lock:
            try:
                if not self.process or self.process.poll() is not None:
                    raise RuntimeError('OCR worker is not running')
                self.process.stdin.write(json.dumps(request,ensure_ascii=False)+'\n')
                self.process.stdin.flush()
                response=self.replies.get(timeout=self.timeout)
                if 'code' not in response:
                    raise RuntimeError(response.get('message','Invalid worker response'))
                return response
            except Exception as exc:
                self.stop()  # discard any late response before another task starts
                return {'code':902,'data':'Sumi 引擎通信失败或超时：'+str(exc)}

    def runPath(self, path):
        return self._run({'path':str(path)})

    def runBytes(self, data):
        return self.runBase64(base64.b64encode(data).decode('ascii'))

    def runBase64(self, data):
        return self._run({'base64':data})

    def runRegion(self, path, region, scale=2):
        return self._run({'path':str(path),'region':list(region),'scale':scale})

    def getDictionary(self):
        return self._run({'operation':'dictionary'})

    def cancel(self):
        # Do not acquire the request lock: terminating unblocks a waiting request.
        process = self.process
        if process and process.poll() is None:
            try:
                process.terminate()
            except ProcessLookupError:
                pass
