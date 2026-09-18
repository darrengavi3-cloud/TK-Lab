# 人物誌 P1 驗證紀錄

## 基線與實際執行範圍

基線提交：`c2cef1ce3a21eb503ae0c5c7e5415173810cc39e`。

GitHub 連接器完成基線原始碼讀取。執行環境不能解析 github.com，因此沒有完成完整 git clone 或 npm ci；本地使用讀取所得的相關源碼子集。既有核心與授權依賴按 Git blob SHA 核對，並未修改：

| 原檔 | Git blob SHA |
|---|---|
| `domain/catalogue.ts` | `2244726eead99b8f3688721531286e89195ab17e` |
| `domain/revisions.ts` | `be0fc27850710865d8b0bc58d8639be8d46790e7` |
| `server/authorization.ts` | `580665c369d02ec3f8f25c5c3f94ad1c81cabb37` |
| `server/storage.ts` | `7cb0c56b69d9d59f539174bcd6c9ca04d73ab2fa` |
| 修改前 `server/admin-router.ts` | `f81503ff8e417cbc3618856fa61ab6695077f1a3` |

## 已執行

環境：Node.js **22.16.0**，本地可用 TypeScript **5.8.3**。本地版本不是倉庫鎖定的 TypeScript 5.9.3，不能替代鎖定依賴的 CI。

```sh
node --test tests/catalogue-prosopography.test.mjs
# tests 76; pass 76; fail 0; skipped 0; cancelled 0

tsc --noEmit --strict --target es2022 --module esnext \
  --moduleResolution bundler --lib es2022,dom \
  domain/prosopography/*.ts server/research-preview.ts
# exit 0
```

型別檢查限於新研究核心及研究服務，包括它們的原有領域依賴，**不是全倉 typecheck**。`admin-router.ts` 在測試中轉譯並實際執行，但未在本地執行其完整 Worker 型別環境檢查。

測試採用合成的測試人物、官名和原文，沒有新增或重審真實歷史人物資料。覆蓋年代上下限與公元前／零年、未知終點、事件和任期分離、見任與連續性、反證及相左說法、原文空白及異體字摘要、舊來源不可回填最新版、同名隔離、並任及相對次序成環、舊記錄保守預覽、水位固定、非同步驗證的輸入隔離及來源讀取上限。

## HTTP 與資料存取的界線

測試執行真實 `catalogueRouter`、`owner`、`mutationGuard` 及新研究服務，檢查未登入 401、非 owner 403、跨源 POST 403、原文摘要及結構錯誤、壞 JSON 400、研究驗證錯誤 422、owner 預覽成功及 no-store。資料適配器、無關服務、HTML、D1/R2 使用測試替身；意外 SQL 或發布寫入令測試失敗。

這證明測試條件下的程式分支，不代表真實 Sites 身份轉發、D1 SQL、R2 權限、真實流量或正式站部署已驗證。測試 helper 不提供任何生產旁路。

## 尚未執行／本批次沒有完成

- 完整鎖定依賴安裝、全倉 lint/typecheck/build、`release:offline`、Worker runtime、視覺與真實裝置驗收。
- 真實 D1/R2 整合測試、研究資料持久化、資料遷移、備份恢復及大資料量效能測試。
- 管理表單、閱讀端新投影、owner 發布、main 合併、正式部署及部署回執。

GitHub Actions 的狀態應以該 PR 的實際 head SHA 與檢查結果為準；本檔不預先宣稱 CI 成功。現有 `tests/catalogue-*.test.mjs` 與 `tests/*.test.mjs` glob 會收錄新增測試，沒有新增自動部署 workflow，也未修改鎖檔。
