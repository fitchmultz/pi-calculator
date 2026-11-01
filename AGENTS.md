# Project instructions

## Dependency maintenance

- Frequently and proactively check releases and make appropriate upgrades across maintained packages and all runtime, development, build, test, and tool dependencies, prioritizing the latest stable official Pi and the intended maintained Pi fork. Routine in-scope maintenance needs no repeated approval; delivery remains subject to existing authority and gates.
- Review crossed release notes, changelogs, migration guidance, and security advisories before upgrading. Verify real APIs and contracts across supported hosts and platforms using each target's exact SDK/CLI and compatible, consistently locked dependency cohort, including host-supplied companions. Preserve lockfile policies, peer contracts, and support floors; a matching version string or locked snapshot alone is not latest-host qualification.
- Adopt beneficial current conventions, patterns, APIs, and functionality instead of extending deprecated or obsolete approaches. Preserve supported behavior and independent use; align affected callers, documentation, generated surfaces, and fixtures through their canonical owners.
- Follow [development, host-cohort, and release rules](docs/development.md). Run all applicable required lint, format, type, test, build, package, native, CI, and review gates; report exact targets, commands, results, skips, and unverified limits honestly. Documentation checks alone do not qualify runtime behavior. Never weaken safety, checkers, fixture contracts, or supported-target requirements to make an update pass.
- Roll out updates controllably with a rollback path through existing review, approval, and release gates; honor every explicit hold. This authorization is not blanket permission to publish, install into or restart an active runtime, disclose private data, or change global model or authentication settings.

## Quality policy and enforcement

Lint and formatting follow the adopted standard in
[`alto-oxlint/POLICY.md`](alto-oxlint/POLICY.md) (version 5.1.2, SHA-256
`41b6d505b36007218ca56b7b3443fcbd96d994715da5a83aaca52b58af47d3d6`).
[`alto-oxlint/ADOPTION.md`](alto-oxlint/ADOPTION.md) records the adopted configuration, the
owners for every maintained file, and the verification result.

- Acceptance is `npm run verify`. It runs each gate independently and aggregates the results,
  so one failure cannot hide another.
- `.oxlintrc.json` and `lint-baseline.json` are generated from the adopted standard, and the
  generated scope override is rewritten by `node scripts/lint.mjs scope --write`. Change the
  standard and regenerate; do not edit generated files by hand.
- Suppressions are not used in ordinary source. A deviation from the standard needs a quality
  exception recorded in `alto-oxlint/ADOPTION.md` with the evidence the standard asks for.
- `tsgolint` and `tsc` have no `android-arm64` build, so the type-aware lint pass and the
  compiler projects run on a host that has them, including `npm run check:compat` in CI.
