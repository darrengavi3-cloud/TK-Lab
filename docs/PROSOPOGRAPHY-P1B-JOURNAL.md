# 人物誌 P1b：私有研究修訂保存

基線為 PR #20 的 `1235ab286db559d9d910336ed77c0d5fe4ef2a4c`。沿用既有 ResearchGraph，不另建候選分支，也不宣稱已整合 #21／#22。

## 已實作

新增三張私有表：`catalogue_research_revisions` 保存按人物递增的不可變版本；`catalogue_research_members` 保存任職、事件、說法、證據、異說與異文的逐項版本索引；`catalogue_research_pins` 外鍵綁定人物、任官及史料的原修訂。
完整研究圖、固定目錄水位、引用清單、摘要、操作者、時間與修訂理由一併保存。實體索引以人物／修訂／種類為範圍，不按相同 ID 跨人物合併。這是可用的研究修訂保存層，不是五大維度最終正規化資料庫。

D1 batch 內重新檢查基礎修訂和固定來源摘要，再原子插入修訂及兩種索引。任何一步失敗則全部回滾。相同 requestId／內容／操作者重試返回原版本，換內容重用識別碼則拒絕。資料庫觸發器拒絕 UPDATE／DELETE；撤回内容須新增修訂。

保存前重新校驗來源，原官名及原紀年不可借舊 pin 改寫；校改另立 Claim。採擇及新增核定說法须確認精確內容摘要，結構校驗不等於史實核定。一般待考草稿可保存。原人物、任官、史料、閱讀投影、active-release 及 owner 設定均不由研究保存修改。

## 接口與前端邊界

```text
POST /api/admin/research/dossiers
GET  /api/admin/research/dossiers/:encodedPersonId
GET  /api/admin/research/dossiers/:encodedPersonId?revision=N
GET  /api/admin/research/dossiers/:encodedPersonId/history?before=N
```

POST 接收 requestId、baseRevision（首次 0）、watermark、graph、inspectedGraphDigest、reason；有採擇或新增核定時另給 reviewedContentDigest。先透過原 inspect 接口校驗，保存時服務端再次驗證。
全部端點沿用 owner 身份檢查，POST 同源、請求標記及 1 MiB 限制。返回 persisted:true、published:false 與精確版本；讀取 no-store，HEAD 無正文。歷史每頁 40 筆，nextBefore 取下一頁。原 people 預覽仍呈現目錄原資料，不被草稿覆蓋。

**本輪前端仍是預覽、JSON 校驗與匯出；尚未加入保存按鈕、一般編輯表單、衝突比較畫面或批次遷移。**

## 遷移、備份與回退

0003_research_journal.sql 是已登記的自訂增量 SQL migration；舊 migration 不修改。研究表與不可變觸發器由該 SQL 管理，不加入舊 CatalogueRecord kind。不得以無差別 drizzle-kit push／schema 重建刪除自訂表；後續 ORM 接管必須先對照真實 schema。
**沒有對生產資料庫執行遷移。** 未遷移時保存／歷史接口明確失敗，API 不自動建表；舊預覽與備份仍可用。

備份服務有完整三表時產生 guanshitai-backup-4，同一 D1 讀取交易固定全部資料；未遷移時仍產生 v3，部分遷移則拒絕，避免漏資料。還原接受 v2／v3／v4，檢查研究圖、manifest、原修訂摘要、版本連續性及索引完整性。授權設定仍不進備份；還原只輸出至新目錄，不寫生產。

正式接入順序：驗證舊備份、在隔離資料庫遷移與還原驗證，再由擁有者安排正式遷移及部署。已有研究資料後，回退程式仍須保留 v4 備份能力，不可直接刪表或回到會忽略研究表的舊備份程式。

## 可追溯驗證

父提交 1235ab2 修復測試載入器漏載 origin.ts／research.html。Reader validation run **35381886577** 已成功：offline-validation、reader-visual、Worker probe、canonical projection check。這不能代替新 head 的 CI，也不是正式部署或真機驗收。

本地 Node 22.16.0／TypeScript 5.8.3：

```sh
node --test tests/catalogue-prosopography.test.mjs tests/catalogue-research-journal.test.mjs
# tests 103; pass 103; fail 0; skipped 0
```

76 個核心測試與 27 個新保存／SQL／HTTP／備份測試在同一次執行中通過。限定範圍 strict TypeScript 檢查通過，Worker 型別使用測試用最小宣告；不是鎖定 5.9.3 的全倉型別檢查。
SQL 測試使用實際 SQLite 引擎和 D1 形狀適配器，執行交易、外鍵、唯一約束和不可變觸發器，不是 Map 模擬儲存。本地舊 Catalogue 表是欄位及關鍵外鍵對照 fixture；該 fixture 不提交。GitHub CI 的測試直接讀取倉庫真實的三份原 migration 和新 0003。新保存服務、校驗器、SQL、備份及還原器使用實際待提交檔案。人物與引文全部為合成測試材料。

覆蓋保存讀回、重試、併發 CAS、末條 SQL 失敗回滾、交易內來源變更、原文保護、非同步輸入隔離、缺少遷移、42 版分頁、v4 空庫還原、v2/v3 相容、漏索引、部分遷移及 owner／同源 HTTP 防護。
尚未完成新保存流程的 Cloudflare D1／Sites 端到端、大資料量、真實史學遷移、正式部署與真機驗收。新 head 的 CI 應按實際 run 另行記錄。
