# Sumi-OCR：准确率优先的离线增强

Sumi-OCR 基于 Umi-OCR，继续保留原项目的 MIT 声明、插件体系、截图/图片/文档工作流。本轮交付是 `0.1.0-preview.3` 源码预览版；桌面安装包仍需构建和实机验收。

## 本轮重点

| 改进 | 已实现的行为 | 使用边界 |
| --- | --- | --- |
| 更新识别模型 | 新增独立 `sumi_rapidocr` 插件，以 RapidOCR + ONNX Runtime 运行 Paddle 系列模型；提供 v4-mobile、v5-server、v6-small 三个固定模型包 | 真实样本未显示新版全面更优；按场景比较候选 |
| 减少小字损失 | 可选更高检测/输入分辨率；桌面框选与命令行均支持局部 2 倍放大重识别 | 放大不保证更准确；耗时、内存会增加 |
| 修正阅读顺序 | 可选“竖排/分栏-从右到左（不合并）” | 适合固定分栏与独立竖行；跨栏标题、夹注和混合版式仍需检查 |
| 保留校对依据 | 不以识别分数过滤非空文字；原始结果记录模型、字典摘要、参数和运行依赖 | 引擎内部仍可能漏检或输出空字符串；高分也可能认错 |
| 避免结果串用 | 模型文件、运行依赖与参数指纹进入任务恢复标识；切换细节选项重启独立工作进程 | 更新模型请准备新目录并重新选择模型包，不支持热替换运行中的权重 |
| 按实测迭代 | 固定图片、逐字真值、字符错误率、逐例原始结果和失败计数 | 新增六类真实资料、1,545 字符；另保留 9 张合成开发图。样本规模仍有限 |

这里使用 **Paddle 模型的 ONNX 版本，由 RapidOCR 推理**。没有把新权重直接塞进旧版 PaddleOCR-json，也没有加入原生 Paddle Inference 运行时。[RapidOCR 官方用法](https://rapidai.github.io/RapidOCRDocs/main/install_usage/rapidocr/usage/)说明了模型版本和本地模型参数；转换模型与摘要来自其固定版本目录，见插件 `catalog.json`。

## 安装独立引擎

以下命令在恢复后的完整 Sumi-OCR 源码根目录运行。测试环境是 Linux、Python 3.12.14；桌面 Qt 使用自己的上游环境，两个解释器分开管理。

```bash
python3.12 -m venv ../sumi-engine
../sumi-engine/bin/python -m pip install -r dev-tools/requirements-sumi-engine.txt
```

Windows 对应的解释器路径是 `..\sumi-engine\Scripts\python.exe`。本轮尚未验证 Windows 桌面，以上路径只是虚拟环境位置示例。

在联网的准备环境中，明确允许下载固定版本模型：

```bash
python dev-tools/prepare_models.py --profile v6-small --output ../sumi-models/v6-small --download
```

脚本校验检测、识别和方向模型的 SHA-256，并生成 `bundle.json`。识别字典嵌在识别 ONNX 内，受同一摘要校验。已有模型文件时可以完全离线准备：

```bash
python dev-tools/prepare_models.py --profile v6-small --output ../sumi-models/v6-small --cache /path/to/cached-onnx-files
```

没有 `--download` 时不会联网获取模型。文件缺失、摘要不符或运行时版本不符时明确报错。离线机器还需提前备齐 Python 依赖；可以在相同平台、Python 版本的准备机器上下载 wheel，再使用 `pip --no-index --find-links` 安装。仓库不携带模型、字体文件或 Python 运行环境。

启动桌面源码后，在全局 OCR 引擎设置中选择 **Sumi-OCR · Paddle 模型 / RapidOCR**，填写独立 Python 可执行文件和 `bundle.json` 的绝对路径。按需启用“保留更多小字细节”。固定竖排或右起分栏文档可选择新增排版方案。既有默认排版方案保持不变。

工作进程显式禁止模型下载和 Python socket 连接。另提供 Linux `--kernel-offline` 验证：用 libseccomp 拒绝网络系统调用，再启动引擎、执行识别，已验证 IPv4/IPv6 建连失败和本地识别成功。普通启动不宣称操作系统隔离；尚未验证 Windows 的系统断网。识别阶段不会调用 Codex/OpenAI API。

## 图片与局部重识别

完整图片：

```bash
python dev-tools/sumi_ocr.py --python ../sumi-engine/bin/python --bundle ../sumi-models/v6-small/bundle.json --image page.png --output page-result.json
```

局部小字，矩形使用原图像素坐标 `左 上 右 下`：

```bash
python dev-tools/sumi_ocr.py --python ../sumi-engine/bin/python --bundle ../sumi-models/v6-small/bundle.json --image page.png --region 100 200 600 800 --scale 2 --output region-result.json
```

坐标映射回原图，结果附带源图 SHA-256、模型指纹和 `unreviewed` 状态。输出必须使用新文件名；不会覆盖原结果或自动采纳新文字。源图在识别期间变化、矩形越界时拒绝保存。桌面也可从新标签页进入“区域校对”，打开图片或 PDF 页，拖拽框选或填写坐标。详见下节。

## 完整离线模型包与本地导入

除兼容原有 `bundle.json` 目录外，新增版本 2 `.sumimodel` 压缩包：三份固定 ONNX、明确的模型版本路径、独立 `dictionary.json`、字典条目数和 SHA-256、运行后端与版本、Apache-2.0 许可及来源说明。模型包不包含平台专用 Python 运行环境，后者必须预先准备。

在已备齐环境的机器导出，然后复制到离线机器导入：

```bash
python dev-tools/model_bundle.py export --bundle ../sumi-models/v6-small/bundle.json --python ../sumi-engine/bin/python --output ../Sumi-OCR-v6-small.sumimodel
python dev-tools/model_bundle.py import --archive ../Sumi-OCR-v6-small.sumimodel --directory ../imported-models
```

桌面“区域校对 → 导入模型包”走同一校验流程。解压前检查文件白名单、重复条目、路径、链接与大小；在临时目录验证所有模型和字典，成功后发布新目录，不覆盖旧包。缺文件、错误摘要、运行版本不符均明确失败。旧 PaddleOCR/RapidOCR 插件继续可选，用户可以显式切回已有插件；新引擎不静默替换旧插件结果。

Linux 安装 libseccomp 后，可在系统调用被禁用的进程中复验导入包：

```bash
python dev-tools/validate_offline.py --python ../sumi-engine/bin/python --bundle /path/to/imported/bundle.json --image docs/accuracy/samples/traditional.png --output ../offline-check.json
```

本轮交付模型包 SHA-256：`403d75da0c7f082d8e2ae4ff21e130dc38f1cfc9e410702beb55664adda28695`。实际导入后的系统断网记录见 [offline-import-validation.json](accuracy/offline-import-validation.json)。

## 桌面区域校对与分歧

1. 打开图片或文档，选择页码；加密文档需要密码，密码不写入候选记录。
2. 拖拽框选小字、模糊字或夹注。坐标输入是拖拽的键盘替代；取消“框选”后可以平移图像，滚轮缩放。
3. 选择独立环境与模型，按需使用 2 倍放大或更多细节，再点“识别选区”。可取消正在运行的引擎。
4. 切换模型/配置重复识别，同页同选区追加候选。显示“结果有分歧”或“候选一致，仍未校对”；从不按高分自动选出赢家。Paddle 系列模型可能同源，一致不算独立证明。
5. 页图、源文件摘要、候选、配置和文字框保存在页面显示的本地目录。识别框映射回原图像素，PDF 则映射到原 PDF 旋转后页坐标（点），同时保留渲染像素框。原始候选只追加、不覆盖，源图变化后必须重新打开。

界面显示当前选区最近 50 条候选，所有历史记录仍保存在目录内。已有批处理结果和原文不会被区域候选自动替换。目录包含明文页图和文字；可在任务停止后自行备份或清理。交互与截图验证见 [桌面记录](desktop/README.md)。

## 京华老宋体

全局设置中的字体面板已支持本地导入并优先列出京华老宋体。具体入口、测试字库版本和使用范围见 [字体说明](JINGHUA_FONT_ZH.md)。不修改字形文件，也不因切换字体而改写识别文字。

## 怎样判断有没有变准

六类真实样本与实测结果见 [真实验收集](acceptance/README.md)。本轮 v4-mobile 分区域 CER 为 8.16%，v6-small 为 10.23%；复杂古籍仍有严重漏字与顺序问题，不能用模型新旧作保证。

此前固定合成图、字级真值和报告保留在 [accuracy/](accuracy/README.md)。运行同一组开发样本：

```bash
python dev-tools/accuracy_benchmark.py --suite docs/accuracy/samples/suite.json --python ../sumi-engine/bin/python --bundle ../sumi-models/v6-small/bundle.json --reading-order right_columns --output ../v6-my-report.json
```

`--reading-order raw` 保留引擎顺序；`right_columns` 报告同时保留原始文字、原始文字框与排序后的文字。字符错误率 CER 计算替换、删除、插入次数，只去除空白，保留繁简、异体、标点差异。空白页的误识别仍计插入；失败页计删除并单列失败数量，不能跳过后宣称准确。

在本轮合成集上，使用同样的右起分栏排序时，v4-mobile 为 **26/288 个编辑错误（9.03% CER）**，v6-small 为 **4/288（1.39% CER）**。这是合成回归结果，不是“真实扫描件准确率 98.61%”。基线是本插件中的 v4 ONNX 模型，而非所有上游 Umi-OCR 发行版的统一基线。

四处剩余差异是小字“刪→删”及罕见字“𠮷→吉、𡈽→土、㠯→吕”；局部放大仍未纠正前者。软件不自动繁简转换、不用常见字覆盖异体字，也不以语言模型猜测替代看图核实。

后续模型选择应使用有代表性的真实扫描件，覆盖实际字体、分辨率、污损、正文与夹注、印刷与手写。将标注样本与保留验证集分开，对错字、漏行、顺序、注释完整性分别计分；不要凭这一小组合成图决定全部文档的最佳模型。

## 与 Codex 校对结合

继续使用已有[校对包工作流](CODEX_REVIEW_ZH.md)：保留全页原图、局部证据、原始 OCR 和单独校订稿；Codex 看图后提出建议，人工明确采纳。新增引擎身份随原始证据保存，便于复核。Codex 不是本项目内嵌的离线 OCR 引擎。

## 验证和许可

76 项后端测试覆盖旧功能、完整模型包与字典校验、导入异常、进程超时/崩溃/重启、候选保留/分歧、旋转 PDF 坐标、阅读顺序与 CER 漏页计数。测试日志见 [sumi-tests.log](sumi-tests.log)。原生 Qt 页面与字体已完成独立测试壳验证；六类真实资料的准确率、耗时与内存另见 acceptance 报告。完整主程序、Windows、手写与大规模性能尚未验收，复杂古籍质量并未通过免校对标准。

保留 [Umi-OCR 的 MIT 许可](https://github.com/hiroi-sora/Umi-OCR/blob/main/LICENSE)。[RapidOCR](https://github.com/RapidAI/RapidOCR)、[PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) 的 Apache-2.0 及模型、依赖各自许可仍适用；主项目 MIT 不替代它们。模型包随附 Apache-2.0 与来源声明；仓库只保存代码/模型清单，不放模型权重。Python 依赖和字体不随模型包分发。真实资料遵守其独立研究用途限制，不随 MIT 应用分发。

macOS 的独立运行环境、Finder 启动器、本地依赖安装、系统权限和断网诊断见 [Mac 适配](MACOS_ZH.md)。Mac 界面使用 Intel Qt 5（M 系列经 Rosetta），OCR 可原生 arm64；实机验收尚未完成。
