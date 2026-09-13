# ===============================================
# =============== OCR - 任务管理器 ===============
# ===============================================

"""
一种任务管理器为全局单例，不同标签页要执行同一种任务，要访问对应的任务管理器。
任务管理器中有一个引擎API实例，所有任务均使用该API。
标签页可以向任务管理器提交一组任务队列，其中包含了每一项任务的信息，及总体的参数和回调。
"""

import os
import inspect
import sys
from copy import deepcopy
from pathlib import Path
from uuid import uuid4

from umi_log import logger
from .mission import Mission
from ..ocr.tbpu import getParser, IgnoreArea
from ..ocr.review import mean_score
from ..ocr.api import getApiOcr, getLocalOptions
from ..utils.utils import argdIntConvert
from .recovery import attach_recovery, digest, tree_digest, file_digest

# 合法文件后缀
ImageSuf = [
    ".jpg",
    ".jpe",
    ".jpeg",
    ".jfif",
    ".png",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
]


class __MissionOcrClass(Mission):
    def __init__(self):
        super().__init__()
        self._apiKey = ""  # 当前api类型
        self._api = None  # 当前引擎api对象
        self._apiGeneration = ""
        self._apiSettingsDigest = ""

    # ========================= 【重载】 =========================

    # msnInfo: { 回调函数"onXX", 参数"argd":{"tbpu.xx", "ocr.xx"} }
    # msnList: [ { "path", "bytes", "base64" } ]
    def addMissionList(self, msnInfo, msnList):  # 添加任务列表
        # 实例化 tbpu 文本后处理模块
        msnInfo["tbpu"] = []
        argd = msnInfo["argd"]
        # 忽略区域
        if "tbpu.ignoreArea" in argd:
            iArea = argd["tbpu.ignoreArea"]
            if isinstance(iArea, list) and len(iArea) > 0:
                msnInfo["tbpu"].append(IgnoreArea(iArea))
        # 获取排版解析器对象
        if "tbpu.parser" in argd:
            msnInfo["tbpu"].append(getParser(argd["tbpu.parser"]))
        # 检查任务合法性
        for i in range(len(msnList) - 1, -1, -1):
            if "path" in msnList[i]:
                p = msnList[i]["path"]
                if os.path.splitext(p)[-1].lower() not in ImageSuf:
                    logger.warning(f"添加OCR任务时，第{i}项的路径path不是图片：{p}")
                    del msnList[i]
            elif "bytes" not in msnList[i] and "base64" not in msnList[i]:
                logger.warning(f"添加OCR任务时，第{i}项不含 path、bytes、base64")
                del msnList[i]
        if msnInfo.get("recoveryDirectory"):
            if not all("path" in item for item in msnList):
                return "[Error] Recovery requires local image files."
            msnInfo["recoveryEngine"] = self._apiGeneration
            msnInfo["recoveryEngineCheck"] = lambda: msnInfo["recoveryEngine"] == self._apiGeneration
            attach_recovery(msnInfo, "image",
                            [{"path": os.path.realpath(item["path"])} for item in msnList],
                            lambda: self.getRecoveryRecipe(argd))
        return super().addMissionList(msnInfo, msnList)

    def msnPreTask(self, msnInfo):  # 用于更新api和参数
        if ("recoveryEngine" in msnInfo
                and msnInfo["recoveryEngine"] != self._apiGeneration):
            return "[Error] OCR engine changed. 引擎已改变，请重新开始任务。"
        # 检查API对象
        if not self._api:
            return "[Error] MissionOCR: API object is None."
        # 检查参数更新
        startInfo = self._dictShortKey(msnInfo["argd"])
        # 恢复int类型
        argdIntConvert(startInfo)
        msg = self._api.start(startInfo)
        if msg.startswith("[Error]"):
            logger.error(f"OCR引擎启动失败： {msg}")
            return msg  # 更新失败，结束该队列
        else:
            return ""  # 更新成功 TODO: continue

    def msnTask(self, msnInfo, msn):  # 执行msn
        capture = msnInfo["argd"].get("review.capture", False)
        source_fingerprint = file_digest(msn["path"]) if capture and "path" in msn else None
        if "path" in msn:
            res = self._api.runPath(msn["path"])
            res["path"] = msn["path"]  # 结果字典中补充参数
        elif "bytes" in msn:
            res = self._api.runBytes(msn["bytes"])
        elif "base64" in msn:
            res = self._api.runBase64(msn["base64"])
        else:
            res = {
                "code": 901,
                "data": f"[Error] Unknown task type.\n【异常】未知的任务类型。\n{str(msn)[:100]}",
            }
        if capture:
            res["rawResult"] = {"code": res["code"], "data": deepcopy(res["data"]),
                                "engine": self._apiKey, "coordinates": "image_pixels"}
            if source_fingerprint:
                if file_digest(msn["path"]) != source_fingerprint:
                    raise RuntimeError("Source changed during recognition")
                res["sourceFingerprint"] = source_fingerprint
        # 任务成功时的后处理
        if res["code"] == 100:
            # 计算平均置信度
            score = mean_score(res["data"])
            # Keep the legacy numeric field; -1 means unavailable, not zero confidence.
            res["score"] = score if score is not None else -1
            res["scoreKnown"] = score is not None
            # 执行 tbpu
            if msnInfo["tbpu"]:
                for tbpu in msnInfo["tbpu"]:
                    res["data"] = tbpu.run(res["data"])
                    # 如果忽略区域等处理将所有文本删除，则结束tbpu
                    if not res["data"]:
                        res["code"] = 101
                        res["data"] = ""
                        break
        return res

    # ========================= 【qml接口】 =========================

    def getStatus(self):  # 返回当前状态
        return {
            "apiKey": self._apiKey,
            "missionListsLength": self.getMissionListsLength(),
        }

    def setApi(self, apiKey, info):  # 设置api
        # 成功返回 [Success] ，失败返回 [Error] 开头的字符串
        self._apiKey = apiKey
        info = self._dictShortKey(info)
        self._apiGeneration = str(uuid4())
        self._apiSettingsDigest = digest(info)
        self._recoveryGlobalOptions = deepcopy(info)
        # 如果api对象已启动，则先停止
        if self._api:
            self._api.stop()
        # 获取新api对象
        res = getApiOcr(apiKey, info)
        # 失败
        if isinstance(res, str):
            self._apiKey = ""
            self._api = None
            return res
        # 成功
        else:
            self._api = res
            return "[Success]"

    # 将字典中配置项的长key转为短key
    # 如： ocr.win32_PaddleOCR-json.path → path
    def _dictShortKey(self, d):
        newD = {}
        key1 = "ocr."
        key2 = key1 + self._apiKey + "."
        for k in d:
            if k.startswith(key2):
                newD[k[len(key2) :]] = d[k]
            elif k.startswith(key1):
                newD[k[len(key1) :]] = d[k]
        return newD

    # ========================= 【qml接口】 =========================

    def getLocalOptions(self):
        if self._apiKey:
            return getLocalOptions(self._apiKey)
        else:
            return {}

    def getRecoveryRecipe(self, argd):
        """Fingerprint the installed plugin, models, settings and pipeline.

        Runs once on the worker per batch; no settings/credentials are persisted.
        A plugin with models outside its package must expose those paths in its
        global/local options so their file contents enter this identity.
        """
        text_only = argd.get("doc.extractionMode") == "textOnly"
        if not self._api and not text_only:
            raise RuntimeError("Recovery requires an initialized OCR engine")
        plugin_files = None
        if not text_only:
            module = sys.modules.get(self._apiKey)
            module_path = getattr(module, "__file__", None) or inspect.getfile(type(self._api))
            plugin_files = tree_digest(Path(module_path).resolve().parent)
        settings = {k: v for k, v in argd.items() if k.startswith(("ocr.", "doc.", "tbpu.", "review."))}
        # Files selected outside the plugin tree also invalidate earlier results.
        external = {}

        def visit(value):
            if isinstance(value, str) and value and os.path.exists(value):
                path = os.path.realpath(value)
                external[path] = tree_digest(path)
            elif isinstance(value, dict):
                for child in value.values():
                    visit(child)
            elif isinstance(value, (list, tuple)):
                for child in value:
                    visit(child)

        visit(settings)
        visit(getattr(self, "_recoveryGlobalOptions", {}))
        source = Path(__file__).resolve().parent.parent
        pipeline = {name: file_digest(source / "mission" / name)
                    for name in ("mission.py", "mission_ocr.py", "mission_doc.py", "recovery.py")}
        pipeline["tbpu"] = tree_digest(source / "ocr" / "tbpu")
        pipeline["review"] = tree_digest(source / "ocr" / "review")
        from PIL import __version__ as pillow_version
        import fitz
        return {"engine": self._apiKey, "settings": digest(settings),
                "globalSettings": self._apiSettingsDigest,
                "pluginFiles": plugin_files, "externalFiles": digest(external),
                "pipeline": pipeline, "python": sys.version,
                "pillow": pillow_version, "fitz": str(fitz.version)}


# 全局 OCR任务管理器
MissionOCR = __MissionOcrClass()
