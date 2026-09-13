# Sumi-OCR accuracy, recovery and review UX contract

Sources: `docs/OPTIMIZATION_PLAN_ZH.md`, `docs/RECOVERY_ZH.md`, `docs/CODEX_REVIEW_ZH.md`, existing BatchOCR/BatchDOC controllers and QML configurations. This iteration follows the authorized recovery and review plan; it introduces no external service or transmission.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Form | qt_res/qml/Configs/ConfigItemComp.qml | Existing configuration schema; UtilsConfigDicts.getMissionResume/getReviewOutput | Shared boolean setting in image/document batch groups | Controller integration tests; Qt keyboard/layout pending |
| Toast | qt_res/qml/Popup_/PopupManager.qml | Existing popup.message/popup.simple | Success, warning and error | Callback integration tests; rendered accessibility pending |
| Select/Listbox | qt_res/qml/Configs/Configs.qml compEnum / QtQuick.Controls ComboBox | UtilsConfigDicts.getTbpuParser | Existing popup/keyboard/theme; additional explicit right_columns option | Parser regression tests; native popup and keyboard verification pending |

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
| Select Sumi engine | Enter independent Python path and local bundle.json through shared settings | Worker validates model/dictionary checksums and pinned runtime; model identity enters recovery and raw evidence | Explicit startup error; prepare a complete bundle and retry |
| Enable more small-text detail | Restart worker with larger resolution limits | New parameter identity, more compute; no accuracy guarantee | Turn setting off and rerun if results degrade |
| Select right-to-left columns | Explicit layout selection; existing default remains unchanged | Preserve every text block; order columns right to left and each column top to bottom | Invalid coordinates preserve original sequence; spanning headings and interlinear notes require review |
| Desktop and CLI region recognition | Run selected pixel rectangle at 1x or 2x | Separate unreviewed JSON, original-coordinate boxes and source hash | Bounds/input-change/output-conflict errors; choose a valid region or new output |

Recovery is opt-in local plaintext data in output-directory/.umi-recovery. The setting explains this before use and describes manual cleanup after all tasks stop. Journal state describes recognition; an output-finalization failure is reported separately and can be retried from successful recognition records.

No automated deletion, cloud synchronization, or credentials persistence. Document passwords are still required when reimporting encrypted documents. A full task-history/reopen UI, automatic input-list restoration, retention quotas, and translated new copy are future work. Current restoration requires reimporting the same ordered image list or document page range.

## Verification boundaries

Unit/integration evidence covers actual scheduler, batch controllers, parsers, SQLite, CSV and PyMuPDF; Qt wrappers and inference are substituted. OS process-exit recovery and locking are tested on Linux. Native Qt region/font pages, drag, keyboard Tab, cancellation, and narrow/dark rendering are verified in a test shell (docs/desktop/README.md). Full application/platform integration, screen readers, translation and Windows locking remain unverified.

Separate accuracy experiments run real RapidOCR/ONNX models on frozen synthetic images. They remain separate from the new six-category real-document pilot and native Qt page checks. Desktop region selection and append-only candidates are implemented in RegionOCR with the shared ImageScale component; native Qt validation is recorded separately. Normal workers block Python connections and model downloads. Optional Linux --kernel-offline validation additionally denies network syscalls with libseccomp; this does not assert a Windows network sandbox. OCR runs offline after dependencies and model files are prepared.

## Region review and font flow

| Trigger | Pending | Result | Failure recovery |
| --- | --- | --- | --- |
| Open image/document page | Disable conflicting controls; render in background | Immutable local page snapshot and original-coordinate metadata | Visible error; previous candidates remain on disk |
| Drag selection or enter coordinates | Validate preview-pixel bounds | Load candidates for the exact page and rectangle | Reject invalid rectangle and retain last valid selection |
| Recognize selected region | Independent worker; busy state and cancel | Append unreviewed candidate and mapped boxes; compare all configurations | Preserve failures and earlier candidates; retry explicitly |
| Import offline model | Validate allowlisted archive and hashes in staging directory | Publish a new local bundle; no network | Reject corrupt/incomplete archives without replacing existing bundle |
| Candidate disagreement | Compare literal text ignoring whitespace only | Explicit disagreement; show all texts without a confidence-based winner | Review against page image; agreement remains unverified |
| Load Jinghua Old Song | Choose local TTF/OTF/TTC or installed family | Preview and explicitly select content font; persist local file URL | Visible loading error; retain previous content font |

RegionSelection owns drag geometry as a shared ImageScale extension. TextField_, CheckButton, Button_, TextEdit_ and FileDialog_ remain canonical owners. Candidates are selectable read-only plain text. Password fields mask input and do not persist passwords. Local snapshots/candidates are plaintext in the displayed directory. Font files are never downloaded at app startup; font display does not change recognition models or Unicode output.
