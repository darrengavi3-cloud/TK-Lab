# Sumi-OCR

以 [hiroi-sora/Umi-OCR](https://github.com/hiroi-sora/Umi-OCR) 为主干的离线识别工具，重点提升识别准确率，并保留可恢复任务和原图校对。当前为 **0.1.0-preview.1 源码预览版**，尚无 Sumi-OCR 安装包。

本目录保存所有改动文件的完整源码 `overlay/`、上游固定提交和每个文件的 SHA-256 `SOURCE.json`，由脚本恢复完整项目。未改动的源码从固定上游取得；不用把上游附带的二进制工具重复加入 TK-Lab。独立目录不接入 TK-Lab 网站、数据库、atlas/reader 数据或发布流程。

## 本轮：真实模型与准确率回归

新增独立 RapidOCR + ONNX Runtime 插件，运行 Paddle 系列 v4-mobile、v5-server、v6-small 模型。模型/字典摘要、参数、依赖身份写入结果和恢复指纹；缺失或不符明确失败，识别阶段禁止自动下载。增加可选高分辨率、命令行局部 2 倍重识别、显式右起分栏/竖排排序。

在 **9 张合成图、288 个非空白字符**上，使用相同右起分栏排序：

| 模型包 | 编辑错误 | 字符错误率 CER |
| --- | ---: | ---: |
| v4-mobile | 26 | 9.03% |
| v5-server | 10 | 3.47% |
| v6-small | 4 | 1.39% |

本轮优先试用 v6-small。以上是开发回归集，排序规则开发使用过这组图片，**不能代表真实扫描件准确率或普遍模型排名**。基线是本适配器中的 v4 ONNX 模型。安装方法见 [Sumi 使用说明](overlay/docs/SUMI_ACCURACY_ZH.md)，输入图片、逐字真值和完整报告见 [准确率记录](overlay/docs/accuracy/README.md)。

目录名 `tools/umi-ocr` 保持既有链接兼容，产品名称为 Sumi-OCR。

## 已有增强与后续方向

| 方向 | 本次交付 | 后续 |
| --- | --- | --- |
| 导出可靠性 | CSV Unicode/BOM、逐结果落盘、错误可见 | Excel 与大批次实机验收 |
| 长任务 | 可选 SQLite 恢复、输入/模型/参数指纹、只重跑失败或未完成项 | 桌面历史任务入口、缓存配额 |
| 结果保留 | 引擎原始结果、处理后结果、校订稿分层 | 联动校对编辑器、阅读顺序编辑 |
| 疑字发现 | 低分/未知分数、完整页图、局部裁图、空白/失败状态、CLI 区域重识别 | 校准阈值、桌面框选复核 |
| Codex 协作 | 本地证据包、逐页建议协议、显式采纳另存新版本 | 可选模型服务适配器，需另行设计 |
| 古籍与文档 | 繁简异体差异计入 CER、原文不自动改写、固定模型/合成样本评测 | 真实独立验证集、夹注、表格/版面插件 |

设计取舍和同类工具参考：[优化方案](overlay/docs/OPTIMIZATION_PLAN_ZH.md)。使用方法：[任务恢复](overlay/docs/RECOVERY_ZH.md)、[Codex 校对](overlay/docs/CODEX_REVIEW_ZH.md)。

## 恢复完整改进源码

要求 Git 和 Python 3.8+。在 TK-Lab 仓库根目录运行，目标必须是尚不存在的新目录：

```bash
python tools/umi-ocr/bootstrap.py ../Sumi-OCR
```

脚本校验增强文件，获取固定上游提交，写入全部增强源码。没有安装依赖、下载模型或启动应用。源码中的上游运行/打包说明仍适用；上游发布的现成安装包不包含这些增强。

已有上游 Git 克隆时可以离线恢复，原克隆不修改：

```bash
python tools/umi-ocr/bootstrap.py ../Sumi-OCR --local-source /path/to/Umi-OCR
```

生成目录保留上游 Git 信息，修改作为未提交的工作区差异，便于 `git diff` / `git status` 检查。以后拆分为独立仓库时，可直接提交完整改进源码。

## 运行测试

后端测试使用 Python 3.12，不要求 Qt 或 OCR 模型；测试依赖版本与本次环境一致。请与桌面运行环境分开安装：

```bash
python -m venv ../umi-tests-env
# Linux/macOS: source ../umi-tests-env/bin/activate
# Windows: ..\umi-tests-env\Scripts\activate
python -m pip install -r tools/umi-ocr/requirements-test.txt
cd ../Sumi-OCR
python -m unittest discover -s tests -v
```

**54 项测试通过**：CSV、恢复/重试/取消/锁、真实 PDF、原始证据和显式修订，另含模型包校验、工作进程超时/崩溃/重启、坐标逆变换、排序与 CER 失败计数。单元测试替代 Qt/OS 包装和引擎推理；另完成三组真实模型的离线评测。验证摘要见 [VALIDATION.md](VALIDATION.md)。

## Codex 工作流

在改进程序的批量图片/文档输出设置中启用“校对包（原图与疑字）”。将包内 `PROMPT.md`、清单、页证据 JSON、整页图与需要的裁图交给支持看图的 Codex 会话。先看全页，再检查疑字，输出建议 JSON。人工检查后，明确选中建议导入：

```bash
python dev-tools/review_cli.py inspect "/path/to/result.review-xxxx"
python dev-tools/review_cli.py apply "/path/to/result.review-xxxx" --page p000001 --proposal proposal.json --accept s1
```

以上命令在**恢复后的完整 Sumi-OCR 源码目录**运行。新校订稿保存在包内 `editions/`，原始证据不覆盖。程序不自动上传文件、不调用 Codex/OpenAI API；Codex 是看图辅助校对工作流。真实扫描件的准确率仍待独立样本验证。

Qt 桌面、Windows、真实古籍、手写、复杂表格与大文档性能仍待验收。因此以源码分支/草稿 PR 交付，尚非可直接发布的桌面发行版。

## 来源与许可

上游固定提交：`83173efc4f4453b41223ea96d63d44534bf0505c`。所有修改文件及摘要在 [SOURCE.json](SOURCE.json)。上游 MIT 版权声明完整保留于 [LICENSE](LICENSE)，增强代码同按 MIT 提供。依赖、模型与字体各自遵循其许可证，主项目 MIT 不替代依赖许可。
