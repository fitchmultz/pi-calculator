# Project instructions

## Dependency maintenance

- Frequently and proactively check releases and make appropriate upgrades across maintained packages and all runtime, development, build, test, and tool dependencies, prioritizing the latest stable official Pi and the intended maintained Pi fork. Routine in-scope maintenance needs no repeated approval; delivery remains subject to existing authority and gates.
- Review crossed release notes, changelogs, migration guidance, and security advisories before upgrading. Verify real APIs and contracts across supported hosts and platforms using each target's exact SDK/CLI and compatible, consistently locked dependency cohort, including host-supplied companions. Preserve lockfile policies, peer contracts, and support floors; a matching version string or locked snapshot alone is not latest-host qualification.
- Adopt beneficial current conventions, patterns, APIs, and functionality instead of extending deprecated or obsolete approaches. Preserve supported behavior and independent use; align affected callers, documentation, generated surfaces, and fixtures through their canonical owners.
- Follow [development, host-cohort, and release rules](docs/development.md). Run all applicable required lint, format, type, test, build, package, native, CI, and review gates; report exact targets, commands, results, skips, and unverified limits honestly. Documentation checks alone do not qualify runtime behavior. Never weaken safety, checkers, fixture contracts, or supported-target requirements to make an update pass.
- Roll out updates controllably with a rollback path through existing review, approval, and release gates; honor every explicit hold. This authorization is not blanket permission to publish, install into or restart an active runtime, disclose private data, or change global model or authentication settings.

## Quality policy and enforcement

Formatting and linting follow the committed quality policy baseline. Configuration is the
generated baseline in [`lint-baseline.json`](lint-baseline.json), regenerated from
[`alto-oxlint/POLICY.md`](alto-oxlint/POLICY.md); edit the policy document and regenerate,
never the generated file by hand. Current state: oxlint with six plugins and one override
profile per source class, oxfmt with default options, and the pinned versions recorded in
`package.json` dev dependencies.

- `npm run verify` is the acceptance command. It composes `npm run check:quality` (lint,
  format check, both compiler projects, baseline drift, policy verifier) and then the test,
  behaviour, and extension-load checks. `npm run lint` runs the two composed passes: the
  semantic pass over the tree, then compiler diagnostics over the files a compiler project
  owns. `npm run lint:fix` is a writer and is never an acceptance gate.
- `scripts/policy.ts` verifies the checked-in configuration against the committed baseline:
  it compares plugins, categories, options, and rule settings exactly, permits only the
  recorded test-profile mappings (`**/check.ts`, `**/check-extension.ts`), rejects warn
  severities, nonempty allowance lists, added rules, and drift from the policy document's
  recorded digest, and reports which profile, lint scope, compiler project, and formatter
  own every maintained file. `scripts/scope-override.ts` owns the generated scope override:
  maintained sources that no compiler project covers keep syntactic checks only, and the
  override is regenerated whole from the baseline.
- Suppressions are not permitted in ordinary sources; the single exception is a described
  `@ts-expect-error` in a `*.test-d.ts` negative type test, which is how the handwritten
  `expr-eval-fork.d.ts` augmentation stays checked.
- `test/policy.test.ts`, `test/scope.test.ts`, and `test/acceptance.test.ts` are the
  committed harness: each protection is probed with a failing fixture and a valid passing
  counterpart, asserting diagnostic identifiers and locations for lint and compiler probes
  and the failed gate plus exit status for the rest. Probes whose toolchain cannot run on
  the host report an explicit skip rather than passing quietly.
- Governance reconciliation: every category mechanism the policy defines is enforced by the
  configuration named above. Two toolchain behaviours are recorded rather than worked around:
  oxlint applies type-aware rules to maintained sources that sit outside every compiler
  project, which is why those files carry the generated override; and an override matches on
  globs only, so the permitted mappings use `**/`-prefixed paths instead of bare filenames.
- Policy document: version 4.5, release id `strict-quality-4.5`, SHA-256
  `35f61b737646d1e7d796bcefde921fa6bd44b93f3ed7b242dd56c4251298ce77`.
