# ========================================
# =============== 批量OCR页 ===============
# ========================================

import os
import time
from copy import deepcopy

from umi_log import logger
from .page import Page  # 页基类
from ..mission.mission_ocr import MissionOCR  # 任务管理器
from ..utils.utils import allowedFileName
from ..ocr.output import Output  # 输出器


class BatchOCR(Page):
    def __init__(self, *args):
        super().__init__(*args)
        self.argd = None
        self.msnID = ""
        self.outputList = []  # 输出器列表
        self._batchRunning = False

    # ========================= 【qml调用python】 =========================

    def msnPaths(self, paths, argd):  # 接收路径列表和配置参数字典，开始OCR任务
        if self._batchRunning:
            return "[Error] A batch task is already running."
        if not paths:
            return "[Error] No images supplied."
        argd = deepcopy(argd)
        argd["review.capture"] = bool(argd.get("mission.filesType.review"))
        argd["review.expectedItems"] = len(paths)
        self.outputList = []
        # 任务信息
        msnInfo = {
            "onStart": self._onStart,
            "onReady": self._onReady,
            "onGet": self._onGet,
            "onEnd": self._onEnd,
            "argd": argd,
            "onQueued": self._onQueued,
        }
        # 预处理参数字典
        if not self._preprocessArgd(argd, paths[0]):
            return ""
        if argd.get("mission.resume"):
            msnInfo["recoveryDirectory"] = os.path.join(argd["mission.dir"], ".umi-recovery")
        # 路径转为任务列表格式，加载进任务管理器
        msnList = [{"path": x} for x in paths]
        task_id = MissionOCR.addMissionList(msnInfo, msnList)
        if task_id.startswith("[Error]"):  # 添加任务失败
            self._onEnd(None, f"{task_id}\n添加任务失败。")
        else:  # 添加成功，通知前端刷新UI
            logger.debug(f"添加任务成功 {task_id}")
        return task_id

    def _onQueued(self, task_id):
        self.msnID = task_id
        self._batchRunning = True

    def _preprocessArgd(self, argd, path0):  # 预处理参数字典，无异常返回True
        self.argd = None
        if argd["mission.dirType"] == "source":  # 若保存到原目录
            # 则保存路径设为第1张图片的目录
            argd["mission.dir"] = os.path.dirname(path0)
        else:  # 若保存到用户指定目录
            d = os.path.abspath(argd["mission.dir"])  # 转绝对地址
            if not os.path.exists(d):  # 检查地址是否存在
                try:  # 不存在，尝试创建地址
                    os.makedirs(d)
                except OSError:  # 创建地址失败，报错
                    logger.warning(f"批量OCR无法创建目录： {d}", exc_info=True)
                    self._onEnd(
                        None,
                        f'[Error] Failed to create directory: "{d}"\n【异常】无法创建目录。',
                    )
                    return False
            argd["mission.dir"] = d  # 写回字典
        startTimestamp = time.time()  # 开始时间戳
        argd["startTimestamp"] = startTimestamp
        # 格式化日期时间（标准格式）
        argd["startDatetime"] = time.strftime(
            r"%Y-%m-%d %H:%M:%S", time.localtime(startTimestamp)
        )
        # 添加格式化日期时间（用户指定格式）：先替换时间戳，再strftime
        startDatetimeUser = argd["mission.datetimeFormat"].replace(
            r"%unix", str(startTimestamp)
        )
        startDatetimeUser = time.strftime(
            startDatetimeUser, time.localtime(startTimestamp)
        )
        # 处理文件名
        fileName = argd["mission.fileNameFormat"]
        fileName = fileName.replace(r"%date", startDatetimeUser)  # 替换时间
        fileNameEle = os.path.basename(os.path.dirname(path0))
        fileName = fileName.replace("%name", fileNameEle)  # 替换名称元素
        if not allowedFileName(fileName):  # 文件名不合法
            self._onEnd(
                None,
                f'[Error] The file name is illegal.\n【错误】文件名【{fileName}】含有不允许的字符。\n不允许含有下列字符： \\  /  :  *  ?  "  <  >  |',
            )
            return False
        argd["mission.fileName"] = fileName  # 回填文件名
        self.argd = argd
        return True

    def _initOutputList(self, argd):  # 初始化输出器列表，无异常返回True
        self.outputList = []
        outputArgd = {  # 数据转换，封装有需要的值
            "outputDir": argd["mission.dir"],  # 输出目录
            # 输出目录类型，"source" 为原文件目录
            "outputDirType": argd["mission.dirType"],
            "outputFileName": argd["mission.fileName"],  # 输出文件名（前缀）
            "startDatetime": argd["startDatetime"],  # 开始日期
            "ignoreBlank": argd["mission.ignoreBlank"],  # 忽略空白文件
            "expectedItems": argd.get("review.expectedItems"),
        }
        try:
            for key in argd.keys():
                if "mission.filesType" in key and argd[key]:
                    self.outputList.append(Output[key[18:]](outputArgd))
        except Exception as e:
            raise RuntimeError(f"Failed to initialize output file. 初始化输出文件失败。{e}") from e
        return True

    def msnStop(self):  # 任务停止
        MissionOCR.stopMissionList(self.msnID)

    def msnPause(self):  # 任务暂停
        MissionOCR.pauseMissionList(self.msnID)

    def msnResume(self):  # 任务恢复
        MissionOCR.resumeMissionList(self.msnID)

    def msnPreview(self, path, argd):  # 快速进行一次任务，主要用于预览
        msnInfo = {
            "onGet": self._onPreview,
            "argd": argd,
        }
        msnList = [{"path": path}]
        self.msnID = MissionOCR.addMissionList(msnInfo, msnList)

    # ========================= 【任务控制器的异步回调】 =========================

    def _onStart(self, msnInfo):  # 任务队列开始
        # Recovery lock/identity validation has completed before touching outputs.
        self._initOutputList(msnInfo["argd"])

    def _onReady(self, msnInfo, msn):  # 单个任务准备
        msnID = msnInfo["msnID"]
        if msnID != self.msnID:
            logger.warning(f"_onReady 任务ID未在记录。{msnID}")
            return
        self.callQmlInMain("onOcrReady", msn["path"])

    def _onGet(self, msnInfo, msn, res):  # 单个任务完成
        msnID = msnInfo["msnID"]
        if msnID != self.msnID:
            logger.warning(f"_onGet 任务ID未在记录。{msnID}")
            return
        # 补充参数
        res["path"] = msn["path"]
        res["fileName"] = os.path.basename(msn["path"])
        res["dir"] = os.path.dirname(msn["path"])
        # 输出器输出
        for o in self.outputList:
            try:
                o.print(res)
            except Exception as exc:
                logger.error(f"结果输出失败：{o}", exc_info=True, stack_info=True)
                raise RuntimeError("结果输出失败，请检查输出目录后重新开始任务。") from exc
        # 通知qml更新UI
        self.callQmlInMain("onOcrGet", msn["path"], res)  # 在主线程中调用qml

    def _onEnd(self, msnInfo, msg):  # 任务队列完成或失败
        if msnInfo:
            msnID = msnInfo["msnID"]
            if msnID != self.msnID:
                logger.warning(f"_onEnd 任务ID未在记录。{msnID}")
                return
        else:
            msnID = ""
        # 结束输出器，保存文件。
        for o in self.outputList:
            try:
                o.onEnd()
            except Exception as e:
                msg = f"[Error] 输出器异常：{e}" + msg
        # msg: [Success] [Warning] [Error]
        self.msnID = ""
        self._batchRunning = False
        self.callQmlInMain("onOcrEnd", msg, msnID)

    def _onPreview(self, msnInfo, msn, res):
        self.callQmlInMain("onPreview", msn["path"], res)
