# Sumi-OCR 验证记录

2026-09-13，Linux，Python 3.12.14，Pillow 12.3.0，PyMuPDF 1.26.6 / MuPDF 1.26.11。

## 源码与可复现性

上游固定提交：`83173efc4f4453b41223ea96d63d44534bf0505c`。
增强源码提交：`83c71727ceb138b7a17984b7427532e227cff1e1`。在上一轮 CSV、恢复和校对基础上，新增 Sumi-OCR 名称、离线模型插件、局部重识别、右起分栏排序和准确率开发回归。

通过 `bootstrap.py --local-source` 在新的独立目录从固定上游重新恢复完整项目，再检查所有 73 个 overlay 文件的 SHA-256 与 SOURCE.json 完全相同。脚本拒绝已有目标目录，也拒绝摘要不匹配的增强文件。未验证 bootstrap 的网络下载路径或 Windows 脚本运行。

在该恢复目录执行：

```text
python -m unittest discover -s tests -v
Ran 54 tests
OK

python -m compileall -q UmiOCR-data/py_src/mission UmiOCR-data/py_src/ocr UmiOCR-data/plugins/sumi_rapidocr dev-tools/accuracy_benchmark.py dev-tools/prepare_models.py dev-tools/sumi_ocr.py dev-tools/make_accuracy_samples.py tests
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
| Sumi 准确率与引擎 | 12 | Unicode CER、失败/空白计数、排序不丢字、模型/运行身份校验、局部坐标、真实子进程的超时/崩溃/重启、恢复指纹 |

这些单元/集成测试替代 Qt/OS 接口和引擎推理；工作进程生命周期测试使用真实 Python 子进程。注入错误日志是预期失败路径。`overlay/docs/sumi-tests.log` 为本轮 54 项记录；`overlay/docs/recovery-tests.log` 是早期 29 项测试的历史记录。

## 真实模型验证

独立 Python 3.12.14 环境安装 RapidOCR 3.9.2 / ONNX Runtime 1.23.2，实际准备并校验 v4-mobile、v5-server、v6-small 三个模型包，运行全部 9 张固定合成 PNG。每组 288 个非空白参考字符，失败页均为 0。同样右起分栏排序下，编辑错误分别为 26、10、4，对应 CER 9.03%、3.47%、1.39%。各组报告同时保存原始文字/框和排序结果，参见 [完整准确率记录](overlay/docs/accuracy/README.md)。

排序规则开发使用过这组合成图，因此是开发回归集，不是独立验收集；不代表真实扫描件准确率。v4 基线是本插件的 ONNX 配置，不是所有 Umi-OCR 发行版。没有训练或微调模型。

真实 v6 引擎还验证了路径/base64 输入一致、越界区域拒绝、Python socket 连接拒绝和局部 2 倍识别的原图坐标。放大后“刪→删”仍未纠正，结果单独保存。Python socket 拦截不是 OS 网络沙箱。模型缺失/篡改、运行版本不同和进程错误的拒绝路径另由单元测试覆盖。

## 上一轮视觉校对流程演示

上一轮使用自制繁体样张，注入“原註→原往”错误，查看整页和裁图、提出并显式采纳 s1，生成独立校订稿，原始证据保留。这个演示用于验证修订流程，不计入本轮真实模型 CER。

## 界面验证边界

复用 QML Configs/Widgets 与现有主题。静态设计审计无错误/警告，但该审计不等于运行 QML；没有进行 Qt 桌面布局、键盘/屏幕阅读器、真实 Windows 锁、Excel 打开或发行包启动验收。设计记录见 overlay/DESIGN.md 与 overlay/UX-CONTRACT.md。

## 待完成发布验收

- Windows / Linux 的 Qt 桌面启动与配置开关。
- 真实截图、中文扫描件、竖排繁体与夹注古籍的独立对照评测。
- 大文档校对包的渲染、磁盘、内存、页耗时和取消体验。
- 实际 Excel、加密文档、多语言 UI 与打包分发。

本 PR 是可复现源码交付，不是桌面正式发行版；不自动合并或部署 TK-Lab。
