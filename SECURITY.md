# Security policy

## Supported code

Security fixes target the current `main` branch unless a release note explicitly states that an older branch is still supported.

## Reporting a vulnerability

Do **not** publish exploit details, credentials, tokens, private URLs, or sensitive production data in a public issue.

Use GitHub's private vulnerability-reporting / Security Advisory flow for this repository when it is available. If the private reporting control is not available, open a minimal public issue that contains no exploit details or secrets and asks the maintainer to establish a private reporting channel.

A useful private report includes:

- affected path, component, or dependency;
- reproduction conditions;
- expected and observed behavior;
- security impact;
- whether the issue is reachable in the deployed runtime;
- suggested mitigation, if known.

## Production boundary

The production administration site is owner-only. A repository bug, dependency advisory, CI result, or local proof of concept does not by itself establish production exploitability. Conversely, the absence of a public route does not justify ignoring a vulnerable dependency. Reports should distinguish package presence, code reachability, runtime exposure, and verified production impact.

Never include live secrets or private database contents in a report.
