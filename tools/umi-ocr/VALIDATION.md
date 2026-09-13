# 验证记录

2026-09-13，Linux，Python 3.12.14，Pillow 12.3.0，PyMuPDF 1.26.6 / MuPDF 1.26.11。

## 源码与可复现性

上游固定提交：`83173efc4f4453b41223ea96d63d44534bf0505c`。
增强源码提交：`dc73368`，含 CSV、恢复和校对三轮改动。

通过 `bootstrap.py --local-source` 在新的独立目录从固定上游重新恢复完整项目，再检查所有 33 个 overlay 文件的 SHA-256 与 SOURCE.json 完全相同。脚本拒绝已有目标目录，也拒绝摘要不匹配的增强文件。未验证网络下载路径或 Windows 脚本运行。

在该恢复目录执行：

```text
python -m unittest discover -s tests -v
Ran 42 tests
OK

python -m compileall -q UmiOCR-data/py_src/mission UmiOCR-data/py_src/ocr dev-tools/review_cli.py tests
退出状态 0

git diff --check
退出状态 0
```

## 测试范围

| 分组 | 数量 | 覆盖 |
| --- | ---: | --- |
| CSV | 6 | Unicode、转义、逐条写出、空白/错误、写出失败 |
| 恢复基础 | 10 | 输入/模型变化、顺序、并发锁、损坏结果、异常重试、进程退出 |
| 批处理集成 | 15 | 实际调度器/控制器、取消/暂停、导出错误、真实 PDF、部分失败、原始证据缓存恢复 |
| 校对包与修订 | 11 | 原始数据不可覆盖、未知置信度、原图/裁图校验、旋转 PDF、EXIF 回退、错误/空白保留、显式修订 |

测试替代 Qt/OS 接口和引擎推理；没有使用真实 OCR 模型。注入错误的日志是预期的失败路径，不代表测试失败。`overlay/docs/recovery-tests.log` 是上一轮 29 项测试的历史记录，不是此轮测试总数。

## 视觉流程演示

自制三行繁体样张，注入“原註”识别为“原往”的错误，生成含原图和疑字裁图的校对包。在本会话中实际查看整页和裁图，确认“註”的言旁；随后校验、提交建议并显式选择 s1，生成新校订稿。原始错误文本继续保留。未对其他样本开展模型识别或准确率基准。

## 界面验证边界

复用 QML Configs/Widgets 与现有主题。静态设计审计无错误/警告，但该审计不等于运行 QML；没有进行 Qt 桌面布局、键盘/屏幕阅读器、真实 Windows 锁、Excel 打开或发行包启动验收。设计记录见 overlay/DESIGN.md 与 overlay/UX-CONTRACT.md。

## 待完成发布验收

- Windows / Linux 的 Qt 桌面启动与配置开关。
- 安装实际引擎/模型后，截图、中文扫描件、竖排繁体与夹注古籍的对照评测。
- 大文档校对包的渲染、磁盘、内存、页耗时和取消体验。
- 实际 Excel、加密文档、多语言 UI 与打包分发。

本 PR 是可复现源码交付，不是桌面正式发行版；不自动合并或部署 TK-Lab。
