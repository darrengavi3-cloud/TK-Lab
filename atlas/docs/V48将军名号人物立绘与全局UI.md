# V48 将军名号、50 人立绘与全局 UI

## 范围

V48 基于 V47-D 规范源，处理三项独立但相互关联的可见问题：四政权将军名号索引不完整且未稳定排序、人物记缺少统一的 50 人立绘设计基线、全局 UI 的信息层级和移动端行为缺乏持久设计契约。

附件和既有整理材料只作索引；本轮名号数据保留来源层与“待考”状态，未将待考名号写成每一时期的法定编制。

## 将军名号

`data/general-titles.js` 升为 schema 2，新增 `groups` 结构，分为曹魏、季汉、孙吴、西晋四组。每条包含名号、显示序号、制度类别、证据状态、时期和来源提示；页面在“职官谱 → 查阅 → 将军名号分级表（V48）”打开分级抽屉。

- 曹魏与西晋按官品由高到低排序；同品以内按中枢、禁军、方镇、杂号排列。
- 季汉和孙吴不套用魏晋九品，以中枢—方镇—杂号的制度序列显示。
- 四征、四镇、四安、四平等复数名号展开为东、南、西、北四项；中郎将、校尉、都尉作为武官系统单列，具体人物仍回到人物记和州镇表。
- 杂号中缺少统一官品或仅见少数传记者保留“待考”，不把索引条目解释为固定员额。

## 50 人物立绘设计

`data/v48-portrait-board.js` 登记 50 个稳定 `personId`、姓名、政权、角色、代表官职和优先级。Figma 文件 `gvWRC5GHHSgd8QX9b2VJgo` 的页面“V48 人物立绘与 UI”包含 50 张带人脸的可编辑识别稿，以及一张全局 UI 规格板。

立绘设计采用脸部、发饰、衣冠、衣色和政权色作为识别变量，明确标注“非史实肖像复原”；未把 Figma 设计自动伪装成正史画像，也未覆盖原有用户参考图。

## UI 升级

新增 `DESIGN.md` 与 `UX-CONTRACT.md`，将暖纸底色、墨色正文、朱印强调、证据文字优先、焦点状态、移动端单列和减弱动态写成持久契约。`index.html` 的 `v48-premium-ui` 样式只收敛全局表面、工具栏焦点、人物卡片、名号抽屉和移动端断点，不改研究模型和编辑流程。

## 验证

```bash
node scripts/verify-v48.mjs
node scripts/verify-research-model.mjs
node scripts/verify-project.mjs
node scripts/verify-map-data.mjs
node scripts/verify-historical-model.mjs
node scripts/verify-v47-baiguanzhi.mjs
node scripts/build-portable-export.mjs
node scripts/build-asset-manifest.mjs
git diff --check
```

Figma 设计稿完成后仍需在浏览器中进行桌面／移动端验收；当前规范源不在 git，私密镜像同步、提交、推送和部署不在本记录中自动宣称完成。
