# Sumi-OCR

基于 [Umi-OCR](https://github.com/hiroi-sora/Umi-OCR) 的离线 OCR 与原图校对增强，当前为 **0.1.0-preview.2 源码预览版**，尚无安装包。

本轮完成独立引擎适配、完整离线模型包、本地导入、桌面框选区域重识别、候选分歧提示和六类真实样本评测；新增 **京华老宋体本地加载与内容字体选择**。保留旧插件、恢复任务与原始结果，不按高分自动覆盖原文。

| 功能 | 使用与验证 |
| --- | --- |
| 独立进程 / 离线模型包 | [使用说明](overlay/docs/SUMI_ACCURACY_ZH.md)：Qt 与现代推理环境分离，模型/字典摘要与运行后端固定，Linux 系统断网下导入包可启动识别 |
| 框选重识别 / 分歧候选 | [桌面记录](overlay/docs/desktop/README.md)：图片/PDF 坐标映射、配置候选只追加、模型同源提示、取消与失败恢复 |
| 京华老宋体 | [字体支持](overlay/docs/JINGHUA_FONT_ZH.md)：本地导入，不捆绑或修改字库文件 |
| 六类真实验收 | [逐场景结果](overlay/docs/acceptance/README.md)：截图、繁体竖排、双栏、夹注、倾斜扫描、表格；错漏字、顺序、时间、内存 |

真实试验集为 **6 例、1,545 字符**：v4-mobile 分区域 CER **8.16%**，v6-small **10.23%**。两版在复杂古籍上都有明显失败，不能把新模型或一致结果当成正确性保证。此前九张合成图的回归记录仍保留，不用于替代真实验收。

## 恢复完整源码

本目录通过 `SOURCE.json` 固定上游、增强提交与每个 overlay 文件的 SHA-256。未改动的上游代码由脚本取得，避免重复提交原项目的二进制环境。

在 TK-Lab 根目录运行（目标必须是新目录）：

```bash
python tools/umi-ocr/bootstrap.py ../Sumi-OCR
```

已有上游克隆可完全离线恢复：

```bash
python tools/umi-ocr/bootstrap.py ../Sumi-OCR --local-source /path/to/Umi-OCR
```

然后在新源码目录按使用说明准备独立引擎、模型包和原有 Qt 桌面环境。模型包不包含 Python 运行环境，Windows 桌面仍待验收。

```bash
python -m pip install -r tools/umi-ocr/requirements-test.txt
# 切换到恢复后的 Sumi-OCR 目录
python -m unittest discover -s tests -v
```

**64 项后端测试通过**；另完成真实模型推理、原生 Qt 页面/字体、内核断网验证。证据与范围见 [VALIDATION.md](VALIDATION.md)。

## 来源与范围

改动限定在 `tools/umi-ocr`，不接入 TK-Lab 网站、数据库、atlas/reader 或发布流程。保留 Umi-OCR MIT；RapidOCR/PaddleOCR 模型的 Apache-2.0 和依赖各自许可仍适用。第三方真实文档仅在独立研究资料包/本地缓存中使用，不放进 MIT 应用发行包。字体通过用户本地文件加载。

Codex 看图校对与显式采纳仍见 [校对工作流](overlay/docs/CODEX_REVIEW_ZH.md)。程序不自动上传原图或调用 Codex/OpenAI API。
