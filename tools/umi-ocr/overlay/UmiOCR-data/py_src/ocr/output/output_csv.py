# 输出到csv表格文件

import csv

from .output import Output
from .tools import getDataText


class OutputCsv(Output):
    def __init__(self, argd):
        self.dir = argd["outputDir"]  # 输出路径（文件夹）
        self.fileName = argd["outputFileName"]  # 文件名
        self.outputPath = f"{self.dir}/{self.fileName}.csv"  # 输出路径
        self.ignoreBlank = argd["ignoreBlank"]  # 忽略空白文件
        # UTF-8 BOM lets Excel recognize multilingual text and filenames.
        # Commit each result immediately instead of retaining the whole batch.
        try:
            with open(self.outputPath, "w", encoding="utf-8-sig", newline="") as f:
                csv.writer(f).writerow(["Name", "OCR", "Path"])
        except Exception as e:
            raise Exception(f"Failed to create csv file. {e}\n创建csv文件失败。")

    def print(self, res):  # 输出图片结果
        if res["code"] == 101 and self.ignoreBlank:
            return  # 忽略空白图片
        name = res["fileName"]
        path = res["path"]
        if res["code"] == 100:
            textOut = getDataText(res["data"])  # 获取拼接结果
        elif res["code"] == 101:
            textOut = ""
        else:
            textOut = f'[Error] OCR failed. Code: {res["code"]}, Msg: {res["data"]} .\n'
        try:
            with open(self.outputPath, "a", encoding="utf-8", newline="") as f:
                csv.writer(f).writerow([name, textOut, path])
        except Exception as e:
            raise Exception(f"Failed to write csv file. {e}\n写入csv文件失败。")
