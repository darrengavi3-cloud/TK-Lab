# Sumi-OCR 在 Mac 上运行

0.1.0-preview.3 增加 macOS 源码适配和本地 Finder 启动器。**这是源码预览版，尚无自包含、签名、公证的 DMG；本次没有 Mac 实机验收结果。** 离线模型、区域校对、候选分歧和京华老宋体本地加载沿用同一桌面功能。

## 运行方式

| Mac | 界面进程 | 独立 OCR 进程 | 系统要求 |
| --- | --- | --- | --- |
| Apple Silicon（M 系列） | Python 3.10 x86_64 + PySide2 5.15.2.1，经 Rosetta | Python 3.12 arm64，CPU 原生运行 | macOS 13+，预先安装 Rosetta；限仍支持通用 Rosetta 的系统 |
| Intel | Python 3.10 x86_64 + 相同 Qt 5 | Python 3.12 x86_64 | macOS 13+ |

两个解释器分离；不要把 OCR 依赖装进 Qt 环境。引擎仍为 RapidOCR 3.9.2 / ONNX Runtime 1.23.2，复用原 `.sumimodel`，模型和字典 SHA-256 校验不变。候选记录新增实际进程架构、平台和 Python 版本。

[PySide2 官方包](https://pypi.org/project/PySide2/5.15.2.1/#files)只提供 Intel Mac wheel，要求 Python < 3.11；[ONNX Runtime 1.23.2](https://pypi.org/project/onnxruntime/1.23.2/#files)有 macOS 13 arm64 / x86_64 wheel。[Apple](https://support.apple.com/en-us/102527)表示通用 Rosetta 保留至 macOS 27，macOS 28 起范围收窄。本版不能称为 Apple Silicon 原生界面，也不承诺支持 macOS 28；长期原生界面需单独迁移 Qt 6。

## 首次准备（明确联网）

恢复完整 Sumi-OCR 源码后，在源码根目录执行命令。预先安装 **x86_64 Python 3.10** 和本机架构的 **Python 3.12**，不要用系统自带 Python。可用已有解释器或按 [uv 官方说明](https://docs.astral.sh/uv/guides/install-python/)管理指定版本和架构。Rosetta 和解释器必须在断网前装好；本程序不替用户安装或接受系统许可。

将命令中的 Python 路径换成你的绝对路径。中文或空格路径保留引号。即使 Python 3.10 是 universal2，启动器仍明确选择 x86_64；M 系列 OCR 明确选择 arm64。

```bash
python3 dev-tools/macos.py prepare --download \
  --gui-python "/完整路径/Python3.10/bin/python3.10" \
  --engine-python "/完整路径/Python3.12/bin/python3.12" \
  --output "$HOME/Sumi-OCR-wheelhouse"
```

这是允许联网的依赖准备：在临时构建环境下载固定依赖，生成 `gui/`、`engine/` 和 `wheelhouse.json`，记录文件 SHA-256、目标架构、requirements 摘要。antlr4 的纯 Python wheel 也在此步构建。两种 Mac 架构需分别准备 engine wheelhouse。

同时准备已有的完整 `.sumimodel`，或按 [模型说明](SUMI_ACCURACY_ZH.md)显式下载、导出。日常启动器和识别进程没有依赖安装或模型下载步骤。

## 本地安装与启动（可断网）

保留两个基础解释器，将 wheelhouse 和模型包拷到目标 Mac，断网后执行：

```bash
python3 dev-tools/macos.py setup \
  --gui-python "/完整路径/Python3.10/bin/python3.10" \
  --engine-python "/完整路径/Python3.12/bin/python3.12" \
  --wheelhouse "$HOME/Sumi-OCR-wheelhouse" \
  --bundle "$HOME/Downloads/Sumi-OCR-v6-small.sumimodel"
```

`setup` 校验依赖文件、版本和架构，仅用 `pip --no-index --only-binary` 安装，然后配置本地模型。也可传入已验证的 `bundle.json` 或目录。默认安装到 `~/Library/Application Support/Sumi-OCR`；已有环境不覆盖，升级请用 `--data-dir` 选择新目录。

完成后双击该目录的 `Sumi-OCR.command`。如需 Finder / Launchpad 入口：

```bash
python3 dev-tools/macos.py app --output "$HOME/Applications/Sumi-OCR.app"
```

这是引用本地源码和虚拟环境的 `.app` **启动器**，不能单独拷走。保留源码、基础 Python、`runtime/` 和 `macos-launch.json` 的位置。脚本不移除隔离属性、不修改 Gatekeeper 或系统权限。首次 Mac 运行及不同启动方式的权限归属仍须实机确认。

“区域校对”自动填入配置好的引擎和模型；截图/批量功能使用全局 OCR 设置。可再导入其他 `.sumimodel`，逐配置保存候选，不按高分覆盖原文，也不把同源模型的一致当成独立证明。

界面默认苹方。全局设置 → 字体可导入自己的京华老宋体 TTF/OTF/TTC，再选择“内容”。字库不随应用分发，显示字体不改变模型或输出 Unicode。

## 平台行为

- 配置、主题、日志、临时图片、HTTP 文档缓存写入用户数据目录，不写源码/应用资源目录。校对结果仍写页面显示的输出目录。
- 打开结果/日志使用 Mac 默认应用，CLI `--clip` 使用 `pbcopy`。文件选择保留中文、空格和字面 `%20`，不重复 URL 解码。
- 点击截图时才检查、请求屏幕录制权限；拒绝后说明如何恢复。仍可打开本地文件或使用系统截图后粘贴。
- 全局热键缺少“辅助功能 / 输入监控”权限时返回警告，不阻止文件 OCR；授权后重启。默认截图 `Command+Shift+X`、粘贴图片 `Command+Shift+V`；截图覆盖窗有本地 Escape 退出。
- Retina 框选按实际截图像素/窗口逻辑尺寸分别计算 X/Y 比例；覆盖窗不进入 Mac 全屏 Space。区域重识别继续映射回原页坐标。
- 若显卡驱动导致空窗，可显式设置 `QT_QUICK_BACKEND=software` 后启动 `.command`；软件模式不使用依赖 GPU 的主窗口圆角遮罩。
- 桌面/应用目录快捷方式只创建链接，不覆盖现有文件；登录项由用户在系统设置中管理。旧 Windows/Linux 二进制插件不能直接在 Mac 运行，Mac 默认使用独立 Sumi 引擎。

## 本机诊断与离线验收

```bash
python3 dev-tools/macos.py doctor \
  --image "/完整路径/你的截图.png" \
  --output "$HOME/sumi-mac-doctor.json"

python3 dev-tools/macos.py doctor --offline \
  --image "/完整路径/你的截图.png" \
  --output "$HOME/sumi-mac-offline.json"
```

第一条检查架构、Qt 依赖、完整模型和真实推理，不证明系统断网。第二条通过系统 `/usr/bin/sandbox-exec` 的 `deny network*` 限制工作进程；在导入 OCR 前直接用 libc 验证 IPv4 / IPv6 连接被系统拒绝，再识别图片。普通连接拒绝/网络不可达不算沙箱证明；工具缺失或规则无效时报错，不降级。此系统工具已废弃，**Mac 机制尚未实机验证**。

`validate_offline.py` 和 `acceptance_benchmark.py` 也走该 Mac 工作进程封装；Linux 保留已验证的 libseccomp。真实六类验收的固定资料、CER、漏区、阅读顺序、时间和 RSS 统计见 [验收说明](acceptance/README.md)。Mac 报告应另存，不能覆盖 Linux 基线。

## 验证范围

Linux 已验证：76 项测试；真实 Qt 完整窗口及区域页；生产截图组件 2× 坐标计算；用户目录配置；百分号文件名；软件渲染非空画面；Mac 依赖图及两种架构 wheel 文件；Mac 固定推理依赖在 Linux 的真实模型断网识别。见 [validation.json](macos/validation.json)、[wheels.json](macos/wheels.json)。

仍待 Intel / Apple Silicon 实机验证：Finder、Rosetta/原生进程、屏幕录制及热键授权/拒绝、Retina/混合 DPI 多屏、Command 键、剪贴板/原生文件选择器、Mac 系统断网、六类真实资料的质量/速度/内存。未完成签名、公证、安装包发布；现有古籍识别仍须人工校对。
