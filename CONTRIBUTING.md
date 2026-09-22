# Contributing to TK-Lab

TK-Lab welcomes contributions that improve the reusable research platform while preserving source traceability and the separation between research state and published reader state.

## What to contribute

Useful contributions include:

- fixes and tests for the web application, data pipeline, validation, import/export, and build tooling;
- documentation and architecture clarifications;
- accessibility and reader-interface improvements;
- data-model improvements for prosopography, offices, appointments, geography, citations, and revisions;
- historical-data corrections backed by a source that another reviewer can locate;
- reproducible bug reports and regression cases.

## Research-data changes

A historical claim should not be changed only because a different value "looks right." Include enough evidence for review:

1. the affected entity or record ID when available;
2. the proposed correction;
3. a bibliographic or stable source reference;
4. a short explanation of how the source supports the change;
5. whether the change affects identity, appointment, office, geography, citation, or reader projection.

Preserve uncertainty when the evidence is uncertain. Do not upgrade review status merely to make a record appear in the reader layer.

## Generated and protected areas

Do not hand-edit generated artifacts when a source generator exists. In particular, follow repository notes for `public/legacy`, reader bundles, manifests, and generated data files.

Do not request, commit, or expose:

- production credentials or tokens;
- owner-only site access;
- private database contents;
- secrets from Cloudflare, Sites, GitHub, or other providers;
- personal information that is not already intentionally public.

## Development setup

Node.js `>=22.13.0` is required.

```bash
npm ci
npm run test:source
npm run typecheck
```

For changes that affect the built reader or runtime, run the relevant additional checks when possible:

```bash
npm run build
npm test
```

The full `npm run release:check` includes a fresh owner-only access-policy check and is therefore a maintainer release gate, not a requirement that outside contributors gain access to production systems.

## Pull requests

Keep pull requests focused. Explain:

- what changed;
- why it changed;
- what data or behavior is affected;
- which checks were run;
- what remains unverified, especially real-device or production-only behavior.

Do not describe CI success as proof of real-device, visual, production, or source-critical verification when those checks were not actually performed.

## Licensing

Original source-code contributions are accepted under the repository's [MIT License](LICENSE). For data, transcriptions, images, maps, or other non-code material, only submit content you have the right to contribute and preserve all required provenance and license information. See [LICENSING.md](LICENSING.md).
