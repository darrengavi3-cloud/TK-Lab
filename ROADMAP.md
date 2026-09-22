# TK-Lab open-source roadmap

This roadmap describes the public research-engineering direction of TK-Lab. It does not replace [CURRENT-STATE.md](CURRENT-STATE.md), which remains the authoritative record for the current Guanshitai product, data, deployment, and acceptance state.

## P0 — Public project identity and governance

- [x] Reframe the README around the reusable research platform.
- [x] Add a source-code license and explicit non-code licensing boundaries.
- [x] Add contribution and security policies.
- [x] Add issue and pull-request templates.
- [ ] Add concise repository topics and an external-facing GitHub description.
- [ ] Publish a maintainer-facing release note for the first explicitly OSS-oriented baseline.

## P1 — Reusable research core

- [ ] Document the canonical entity model: person, identity, office, appointment, place, source, citation, revision, and publication projection.
- [ ] Publish a small, rights-cleared sample dataset for local development and demonstrations.
- [ ] Define stable import/export contracts that do not depend on the owner-only production database.
- [ ] Separate reusable research packages from product-specific site code where doing so reduces coupling.

## P2 — Provenance and source-critical workflows

- [ ] Normalize citation/provenance metadata across migrated domains.
- [ ] Make uncertainty, review status, correction history, and supersession explicit in shared schemas.
- [ ] Add validation fixtures for identity conflicts, disputed appointments, chronology, and source variants.
- [ ] Document how research-layer decisions project into reader-visible facts.

## P3 — Contributor experience

- [ ] Add architecture and data-model diagrams.
- [ ] Label a small number of reproducible `good first issue` tasks.
- [ ] Provide development fixtures that do not require production credentials.
- [ ] Add contributor-focused CI documentation and local troubleshooting.
- [ ] Define a lightweight release/changelog convention for public engineering changes.

## P4 — Public demonstration layer

- [ ] Evaluate a sanitized public demo or static example that is technically separate from the owner-only administration environment.
- [ ] Keep production credentials, private work data, and owner controls outside the public demonstration path.
- [ ] Measure accessibility, mobile behavior, performance, and reproducibility independently of production access.

## Out of scope for OSS enablement

The following are not prerequisites for making the engineering repository useful to outside contributors:

- exposing the owner-only administration site;
- publishing production credentials or production database contents;
- weakening research/reader boundaries;
- treating unreviewed historical claims as verified;
- relicensing third-party texts, images, maps, fonts, or data without provenance review.
