# V87 dependency, reader visibility, and verification record

Date: 2026-09-10  
Baseline: `main` at `b01a2bc3f2f0a61a62ce7663f7430b01420fe2fc`  
Change PR: #14

## Completed in the repository

- Upgraded `vinext` from `0.0.50` to `1.0.0-beta.9`.
- Upgraded `@vitejs/plugin-rsc` from `0.5.26` to `0.5.34`, satisfying the beta peer range without force or legacy-peer dependency resolution.
- Regenerated `package-lock.json`; the resolved dependency graph no longer contains `image-size`.
- `npm ci` audit completed with zero reported vulnerabilities in the reviewed workflow.
- The reader now defaults to including both verified and pending state/office records. Each record retains its existing verification status; no candidate was promoted to verified.
- The reader projection reports 523 state/office records: 45 verified and 478 candidate.
- Updated the canonical source lock and reader-bundle manifest from the deterministic build output.

## Automated evidence

The restored, unmodified integrity workflow passed in run [#31](https://github.com/darrengavi3-cloud/TK-Lab/actions/runs/34515122601):

- locked dependency install;
- offline release build;
- built Worker probe;
- committed canonical-projection gate;
- Chromium reader visual gate;
- historical consistency audit;
- citation parser tests.

The source lock aggregate is `96f0ef41c78c57864a7967e8c1b48aa67a012ae7bbe85bdb25f38cbf464e5cb3`.  
The reader-bundle aggregate is `66f6ab5b555aaf220d52b41dce55ca582806caa70a7d15c2118756d18d4aebb7`.

## Historical-review posture

The 14 source/identity-review candidates remain candidates in the audit ledger. Per product decision, they are directly visible in the reader with their existing status rather than being hidden by the default filter. This change is visibility-only and does not claim new primary-source or identity corroboration.

## Still unverified: real-device or human acceptance

The following items cannot be established by repository automation and remain **unverified**:

- real iPhone Safari touch, safe-area, orientation, and back-gesture behaviour;
- IME/keyboard obstruction and long-scroll behaviour on actual devices;
- system large-text / browser zoom acceptance on physical devices;
- human visual and accessibility sign-off;
- live-site performance observation and rollback exercise.

No Sites access, deployment, or permissions were changed by this work.
