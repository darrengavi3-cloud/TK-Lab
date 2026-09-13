from .tbpu import Tbpu
from ..review import right_columns


class RightColumns(Tbpu):
    def __init__(self):
        self.tbpuName = "竖排/分栏-从右到左（不合并）"

    def run(self, textBlocks):
        result = right_columns(textBlocks)
        for block in result:
            block.setdefault('end', '\n')
        return result
