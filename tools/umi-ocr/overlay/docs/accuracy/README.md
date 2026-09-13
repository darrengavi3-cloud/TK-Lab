# 准确率开发回归记录

这是此前的合成开发回归记录。新增的六类真实样本、逐场景指标和模型选择限制见 [真实验收集](../acceptance/README.md)。

2026-09-13，Linux / Python 3.12.14，RapidOCR 3.9.2 + ONNX Runtime 1.23.2，CPU 推理，每引擎 intra-op 2 / inter-op 1 线程；detail 关闭。依赖完整快照见 [engine-environment.lock](engine-environment.lock)。

9 张固定合成 PNG，288 个非空白 Unicode 码点，使用 BabelStone Han 字体渲染。正文由本项目编写，竖排使用公版短句。原始字体不分发，字体 SHA-256 记录于 [suite.json](samples/suite.json)。直接使用仓库内 PNG 复测，无需安装该字体；另有 `dev-tools/make_accuracy_samples.py` 可生成新样本。重新生成时应比较图片摘要，不能假设跨平台渲染完全一致。

**这是开发回归集。排序规则在观察本组图片的输出后实现；没有独立保留测试集。** 图片与参考文字在模型推理前固定。它用于验证接入、度量和特定错误修复，不能用于宣称真实古籍准确率或各模型的普遍排名。

## 同输入、同排序的比较

CER =（替换 + 删除 + 插入）/ 参考字符数，越低越好。只排除空白，保留标点、繁简、异体字差异。原始顺序与排序后两列来自同一次推理；原始顺序列依据各报告的 raw_hypothesis 计算。各模型采用相同的固定分栏算法、分辨率和低分保留参数。

| 模型包 | 原始顺序错误 / CER | 右起分栏错误 / CER | 排序后完全匹配页 | 失败页 |
| --- | --- | --- | --- | --- |
| v4-mobile | 60 / 288（20.83%） | 26 / 288（9.03%） | 2 / 9 | 0 |
| v5-server | 44 / 288（15.28%） | 10 / 288（3.47%） | 3 / 9 | 0 |
| v6-small | 40 / 288（13.89%） | 4 / 288（1.39%） | 7 / 9 | 0 |

基线 v4-mobile 是本适配器中的固定 ONNX 模型，不代表 Umi-OCR 所有平台/发行版的原有配置。排序改善与模型改善必须分开看：v4 的 60 → 26、新版 v6 的 40 → 4 属于排序收益；相同排序下 26 → 4 才是这组数据上的模型比较。

## 每张图片的排序后编辑错误数

| 样本 | 参考字符数 | v4-mobile | v5-server | v6-small |
| --- | --- | --- | --- | --- |
| simplified | 49 | 0 | 0 | 0 |
| traditional | 30 | 3 | 0 | 0 |
| small_text | 40 | 6 | 2 | 1 |
| blur | 33 | 2 | 1 | 0 |
| low_contrast | 36 | 3 | 2 | 0 |
| vertical | 24 | 2 | 1 | 0 |
| two_columns | 40 | 5 | 1 | 0 |
| rare_characters | 36 | 5 | 3 | 3 |
| blank | 0 | 0 | 0 | 0 |

完整逐例报告：[v4-mobile](reports/v4-mobile.json)、[v5-server](reports/v5-server.json)、[v6-small](reports/v6-small.json)。每份报告包含输入摘要、参考文字、原始文字和框、排序后文字、模型/字典摘要、运行参数、依赖身份、逐例错误和失败状态。报告中的耗时只是运行记录；这些任务在共享机器上有并发，不能作为可比较的性能基准。

v6 的残余错误为“刪→删、𠮷→吉、𡈽→土、㠯→吕”。[局部 2 倍重识别](reports/region-v6.json)保留了原图坐标，但“刪→删”依然存在。该记录在补充依赖/参数身份字段前生成，仍含模型摘要；没有因此自动替换正文。

[真实离线 smoke 记录](reports/offline-smoke.json)验证了本地路径与 base64 输入的文字/框一致、越界拒绝，以及 Python socket 连接被禁用。常规单元测试中的推理替身另用于验证进程生命周期和坐标数学，两类证据不可混同。

## 复现

从完整项目根目录按 [引擎说明](../SUMI_ACCURACY_ZH.md)准备依赖与所需模型，然后运行：

```bash
python dev-tools/accuracy_benchmark.py --suite docs/accuracy/samples/suite.json --python ../sumi-engine/bin/python --bundle ../sumi-models/v6-small/bundle.json --reading-order right_columns --output ../sumi-v6-report.json
```

对另外两个配置分别准备模型包并更换 `--bundle` 与输出名。`--reading-order raw` 可直接测试引擎原始顺序。需要新文件名以保留既有实验。空白页的误识别计插入；失败页不从分母移除，并计入 failed_cases；全部样本失败时不能报告通过。

后续须使用真实扫描图建立独立验证集，分别统计正文/夹注、繁简异体、漏行、阅读顺序及页面级完整性；本轮没有验证手写、复杂表格或训练新模型。
