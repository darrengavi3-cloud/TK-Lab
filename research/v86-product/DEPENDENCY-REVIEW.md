# V86 依赖与运行路径复核（2026-09-10）

基线：PR #13 / 1d0dc6c；npm 11.9.0、Node 24.19.0。完整锁文件审计由24个告警包降为2个（high 2，critical/moderate/low 0）；生产依赖审计为0。计数按依赖包，不等于漏洞数量，也不能仅凭 omit=dev 推断构建后的 Worker 安全。

|层级|修改与验证|
|---|---|
|Next / React / RSC|Next与eslint-config-next 16.3.4；React、React DOM、react-server-dom-webpack 19.2.8；通过安装、类型检查与实际构建验证。|
|Cloudflare / Vite|@cloudflare/vite-plugin 1.54.6、Wrangler 4.130.0、Vite 8.0.16。保留 Vinext 0.0.50 与现有部署架构。|
|图像处理|Sharp 0.35.4，统一传递 Sharp；关闭 next.config 图片优化并移除 Worker 的图片转换处理器。已有本地立绘由构建程序处理并作为静态资源提供。|
|开发工具|Wrangler 的 esbuild 固定0.28.1；@esbuild-kit/core-utils 的 esbuild固定0.25.12。后者超出其旧依赖范围，已测试实际同步／异步 TypeScript 转换及 Drizzle 空配置导出，保留兼容性回归测试。|
|运行入口|Worker仅接受普通GET/HEAD；图片优化路径（含编码／重复斜线）、非读取方法及两类Server Action请求在框架消费请求体前拒绝。|

Next修复依据：[Windows RCE公告](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)、[AVIF公告](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)。esbuild修复依据：[开发服务器跨源读取公告](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99)。本次未用 npm audit fix --force，也没有降级 Drizzle。

## 未清除的依赖告警

`vinext → image-size@2.0.2` 是剩余一条依赖链，audit将image-size与Vinext分别计为2个high告警包，关联[ICNS无限循环](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr)和[JXL/HEIF无限循环](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq)。查询到的image-size发布版本最高为2.0.2，不能假设2.0.3补丁存在；audit给出的替代路线是Vinext 1.0.0-beta.9，不属于本轮最小兼容补丁。

已安装Vinext的`dist/index.js`仅在构建插件解析静态图像导入元数据时调用image-size。构建后服务器JS未见image-size、ICNS/HEIF解析器或旧图像处理器标识。更关键的实际验证由`npm run test:runtime`使用生成的Worker配置（包括assets优先级、兼容日期）执行：主页与静态读者页200；四类图像请求404；POST及Action头请求405，共10项。此证据覆盖当前构建的请求路径，不代表所有未来框架路径均安全。测试没有接入真实云部署或真实iPhone。

**残余风险：** 构建工具链仍含有漏洞的图像元数据解析器；未来引入不可信的静态图像导入时风险会扩大。生产读取端点已隔离，告警本身未消失，不能将其标记“已修复”。商用发布前仍需兼容升级或明确接受这一有边界的风险。

原始结果：[全量审计](dependency-audit-2026-09-10.json)、[生产依赖审计](dependency-audit-production-2026-09-10.json)。历史24项报告继续保留。
