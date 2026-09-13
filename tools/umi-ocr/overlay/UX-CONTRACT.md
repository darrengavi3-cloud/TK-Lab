# Batch recovery and review UX contract

Sources: `docs/OPTIMIZATION_PLAN_ZH.md`, `docs/RECOVERY_ZH.md`, `docs/CODEX_REVIEW_ZH.md`, existing BatchOCR/BatchDOC controllers and QML configurations. This iteration follows the authorized recovery and review plan; it introduces no external service or transmission.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Form | qt_res/qml/Configs/ConfigItemComp.qml | Existing configuration schema; UtilsConfigDicts.getMissionResume/getReviewOutput | Shared boolean setting in image/document batch groups | Controller integration tests; Qt keyboard/layout pending |
| Toast | qt_res/qml/Popup_/PopupManager.qml | Existing popup.message/popup.simple | Success, warning and error | Callback integration tests; rendered accessibility pending |

All source paths above are under UmiOCR-data. Theme ownership is documented in DESIGN.md.

## Flow ledger

| Trigger | Pending | Result | Failure recovery |
| --- | --- | --- | --- |
| Start with recovery disabled | Existing queue | Every input processed; no journal | Existing reimport/retry |
| Start with recovery enabled | Fingerprint code/models and acquire job lock before opening exporters | Matching complete results replayed in original order; all other items run once | On errors retain local journal; fix cause and resubmit |
| Cancel | Current inference may finish and persist before the worker observes cancellation | Queued work stopped; completed records retained | Reimport same ordered files/range and enable recovery |
| Resume a paused in-process queue | Existing pause/resume controls | Continue with the same item position | Cached current result avoids repeated inference if pause arrived during inference |
| Input/model/parameter changes | New fingerprint or new job identity | Relevant earlier results not reused | New recognition |
| Review output enabled | Preserve raw results and render evidence | Unique local bundle; no model call; never label recognition as reviewed | Inspect evidence and explicitly accept selected suggestions into a separate edition |
| Disk/output error | Stop queue; retain successful recognition | Visible failure notification; no successful batch claim | Restore writable output and resubmit |

Recovery is opt-in local plaintext data in output-directory/.umi-recovery. The setting explains this before use and describes manual cleanup after all tasks stop. Journal state describes recognition; an output-finalization failure is reported separately and can be retried from successful recognition records.

No automated deletion, cloud synchronization, or credentials persistence. Document passwords are still required when reimporting encrypted documents. A full task-history/reopen UI, automatic input-list restoration, retention quotas, and translated new copy are future work. Current restoration requires reimporting the same ordered image list or document page range.

## Verification boundaries

Unit/integration evidence covers actual scheduler, batch controllers, parsers, SQLite, CSV and PyMuPDF; Qt wrappers and inference are substituted. OS process-exit recovery and locking are tested on Linux. Native Qt rendering, screen-reader/keyboard interactions, translation and Windows locking remain unverified.
