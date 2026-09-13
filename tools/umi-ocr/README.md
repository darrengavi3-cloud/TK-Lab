# Umi-OCR：可恢复任务与 Codex 辅助校对

以 [hiroi-sora/Umi-OCR](https://github.com/hiroi-sora/Umi-OCR) 为主干的源码增强。保留现有 Qt 桌面与离线引擎，重点改进批处理可靠性、原始结果保留、疑字检查和修订可追溯。未打包为安装程序。

本目录保存所有改动文件的完整源码 `overlay/`、上游固定提交和每个文件的 SHA-256 `SOURCE.json`，由脚本恢复完整项目。未改动的源码从固定上游取得；不用把上游附带的二进制工具重复加入 TK-Lab。独立目录不接入 TK-Lab 网站、数据库、atlas/reader 数据或发布流程。

## 可以改进什么，以及已经完成什么

| 方向 | 本次交付 | 后续 |
| --- | --- | --- |
| 导出可靠性 | CSV Unicode/BOM、逐结果落盘、错误可见 | Excel 与大批次实机验收 |
| 长任务 | 可选 SQLite 恢复、输入/模型/参数指纹、只重跑失败或未完成项 | 桌面历史任务入口、缓存配额 |
| 结果保留 | 引擎原始结果、处理后结果、校订稿分层 | 联动校对编辑器、阅读顺序编辑 |
| 疑字发现 | 低分/未知分数、完整页图、局部裁图、空白/失败状态 | 校准阈值、区域重识别、多引擎比较 |
| Codex 协作 | 本地证据包、逐页建议协议、显式采纳另存新版本 | 可选模型服务适配器，需另行设计 |
| 古籍与文档 | 保留繁体/异体字和原注的校对约束 | 固定样本评估、夹注、表格/版面插件 |

设计取舍和同类工具参考：[优化方案](overlay/docs/OPTIMIZATION_PLAN_ZH.md)。使用方法：[任务恢复](overlay/docs/RECOVERY_ZH.md)、[Codex 校对](overlay/docs/CODEX_REVIEW_ZH.md)。

## 恢复完整改进源码

要求 Git 和 Python 3.8+。在 TK-Lab 仓库根目录运行，目标必须是尚不存在的新目录：

```bash
python tools/umi-ocr/bootstrap.py ../Umi-OCR-enhanced
```

脚本校验增强文件，获取固定上游提交，写入全部增强源码。没有安装依赖、下载模型或启动应用。源码中的上游运行/打包说明仍适用；上游发布的现成安装包不包含这些增强。

已有上游 Git 克隆时可以离线恢复，原克隆不修改：

```bash
python tools/umi-ocr/bootstrap.py ../Umi-OCR-enhanced --local-source /path/to/Umi-OCR
```

生成目录保留上游 Git 信息，修改作为未提交的工作区差异，便于 `git diff` / `git status` 检查。以后拆分为独立仓库时，可直接提交完整改进源码。

## 运行测试

后端测试使用 Python 3.12，不要求 Qt 或 OCR 模型；测试依赖版本与本次环境一致。请与桌面运行环境分开安装：

```bash
python -m venv ../umi-tests-env
# Linux/macOS: source ../umi-tests-env/bin/activate
# Windows: ..\umi-tests-env\Scripts\activate
python -m pip install -r tools/umi-ocr/requirements-test.txt
cd ../Umi-OCR-enhanced
python -m unittest discover -s tests -v
```

**42 项测试通过**：CSV、恢复/重试/取消/锁、源文件和模型变更、真实 PDF 导出、原始文字不覆盖、图片裁图/旋转坐标、缺失置信度、证据摘要验证和显式修订。后端使用真实调度器、SQLite、Pillow、PyMuPDF，替代 Qt/OS 包装和引擎推理。验证摘要见 [VALIDATION.md](VALIDATION.md)。

## Codex 工作流

在改进程序的批量图片/文档输出设置中启用“校对包（原图与疑字）”。将包内 `PROMPT.md`、清单、页证据 JSON、整页图与需要的裁图交给支持看图的 Codex 会话。先看全页，再检查疑字，输出建议 JSON。人工检查后，明确选中建议导入：

```bash
python dev-tools/review_cli.py inspect "/path/to/result.review-xxxx"
python dev-tools/review_cli.py apply "/path/to/result.review-xxxx" --page p000001 --proposal proposal.json --accept s1
```

以上命令在**恢复后的完整 Umi-OCR 源码目录**运行。新校订稿保存在包内 `editions/`，原始证据不覆盖。程序不自动上传文件，不调用 Codex/OpenAI API，也没有所谓本地 Codex OCR 引擎。模型建议仍需核对；本次没有测出真实识别准确率提升。

Qt 桌面、Windows、真实 OCR 模型、复杂古籍与大文档性能仍待实机验收。因此以源码分支/草稿 PR 交付，尚非可直接发布的桌面发行版。

## 来源与许可

上游固定提交：`83173efc4f4453b41223ea96d63d44534bf0505c`。所有修改文件及摘要在 [SOURCE.json](SOURCE.json)。上游 MIT 版权声明完整保留于 [LICENSE](LICENSE)，增强代码同按 MIT 提供。依赖、模型与字体各自遵循其许可证，主项目 MIT 不替代依赖许可。
