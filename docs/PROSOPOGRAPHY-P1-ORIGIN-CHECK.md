# P1 固定舊修訂原文一致性補核

基線：`77d7dc4b2754113e524c90cafb3db519ab7c4718`，沿用 PR #20 的研究核心與只讀 API。
本次保留已存在的並行提交，不強制覆寫分支，不另行引入第二套人物誌核心。

## 問題與修正

`inspectPersonResearch` 原先核對 `legacyOrigin` 的人物、原任官 ID、修訂號與摘要，但未把提交圖中的四個原文字段與該修訂逐字比較。因此，舊引用的摘要即使正確，提交圖仍可能帶入被改写的「原官名／原性質／原政權／原轄區」。

新增 `matchesLegacyOriginal`，在原修訂身份校驗後、接受研究圖之前逐字比對四欄。空白、换行、異體字與 Unicode 組合形式均不自動正規化。格式缺失或非文字值不能互相視為相等。校改與研究解釋應另立有依據的說法，不能繼續使用舊修訂為被改寫的原文字段背書。

錯誤使用 `origin-content`，沿用既有研究錯誤處理。此檢查不增加資料寫入、發布能力或身份旁路。

## 實際驗證

```sh
node --test tests/catalogue-prosopography-origin.test.mjs
# 12 passed; 0 failed; 0 skipped

tsc --noEmit --strict --target ES2022 --module ESNext \
  --moduleResolution bundler --skipLibCheck domain/prosopography/origin.ts
# exit 0
```

本地 Node.js 22.16.0／TypeScript 5.8.3。12 項測試包含逐欄改寫、空白、Unicode、空欄、缺失及非文字值、輸入不變，以及服務內呼叫位置的源碼檢查。

這次沒有重新執行基線提交記錄的 76 項核心測試，也沒有完成新 head 的全倉 CI、D1、Worker、視覺、真機或部署驗收。因此不能把「基線紀錄 76 通過」加上本次 12 項，描述成此 head 已實跑 88 項通過。完整結果以新 head 的 CI 為準。

原 `server/research-preview.ts` 讀取後按 Git blob SHA `b025dc517d3f47b31e63cab8b7b3b30a5be682b1` 核對，只追加一個 import 及一條原文字段校驗。其餘既有流程不變。
