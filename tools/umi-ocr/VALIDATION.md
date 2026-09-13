# Sumi-OCR 验证记录

2026-09-13，Linux x86_64，源版本 0.1.0-preview.2。

上游 `83173efc4f4453b41223ea96d63d44534bf0505c`；增强提交 `d049e884309f9e9f77653ef4304fa78e549fa576`。本包包含 **108 个 overlay 文件**，均在 SOURCE.json 中记录 SHA-256。

- `bootstrap.py --local-source` 在全新目录重建成功，108 个 overlay 文件摘要逐一一致；恢复目录再次运行 64 项测试通过。
- 64 项后端测试通过：CSV、恢复、进程异常、原始证据、完整模型与字典校验、恶意归档/重复条目、候选分歧/只追加、源文件变化、旋转 PDF 坐标、真实验收错误与阅读顺序计分。
- 独立 v6 模型包导出并在新目录导入，Linux libseccomp 拒绝 socket/connect/send 等系统调用后成功启动并识别，验证 IPv4/IPv6 不可建连。
- 原生 Qt 5 页面测试通过拖拽、缩放坐标、键盘 Tab、两种真实模型分歧、取消和失败保留；浅/深色及 820×600 画面已检查。
- 京华老宋体实际文件加载、家族名与内容字体选择通过；测试副本版本 1.007，未把字体文件放入仓库。
- 六类真实资料 6 例、1,545 字符，完整记录替换/删除/插入、阅读顺序、失败、耗时与峰值内存。复杂古籍仍有严重错误，质量未达到免校对使用要求。
- 编译检查、git diff --check、设计 lint 和 strict 静态审计通过。

日志：[后端测试](overlay/docs/sumi-tests.log)、[断网识别](overlay/docs/accuracy/offline-import-validation.json)、[桌面与字体](overlay/docs/desktop/README.md)、[真实验收](overlay/docs/acceptance/README.md)。

Qt 使用 Python 3.10.21 / PySide2 5.15.2.1；独立引擎为 Python 3.12.14 / RapidOCR 3.9.2 / ONNX Runtime 1.23.2。Qt 测试壳替代主窗口与平台服务，不能代表完整应用或 Windows。未覆盖屏幕阅读器、系统截图/剪贴板、原生文件对话框、Windows 打包、手写及大规模性能。

发布形态继续为源码预览与草稿 PR。模型权重和研究图像不进入 Git 仓库，分别以本地导入包/显式下载验收资料提供。
