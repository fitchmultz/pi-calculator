# Adoption record

This record describes the repository's adoption of the standard in [`POLICY.md`](POLICY.md).
It states the current state of the repository; supporting tests and review artifacts live in
their normal locations.

## Adopted version

| Field        | Value                                                              |
| ------------ | ------------------------------------------------------------------ |
| Repository   | `fitchmultz/pi-calculator` (`@fitchmultz/pi-calculator`)           |
| Version      | 5.1.1                                                              |
| SHA-256      | `41b6d505b36007218ca56b7b3443fcbd96d994715da5a83aaca52b58af47d3d6` |
| Adopted copy | `alto-oxlint/POLICY.md` (formatted by the project formatter)       |

## Runtimes, tools, and package manager

| Item            | Value                                                       |
| --------------- | ----------------------------------------------------------- |
| Node.js         | `>=24.0.0` (`package.json` `engines.node`)                  |
| Package manager | npm, lockfile version 3 (`package-lock.json`, owned by npm) |
| oxlint          | 1.90.0                                                      |
| oxfmt           | 0.75.0                                                      |
| oxlint-tsgolint | 7.0.2005                                                    |
| TypeScript      | 7.0.2                                                       |

## Configuration and acceptance paths

| Path                     | Role                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `.oxlintrc.json`         | Generated from Appendix A by `scripts/lint-baseline.ts`; the recorded baseline is `lint-baseline.json`          |
| `.oxfmtrc.json`          | Formatter configuration; `.oxfmtignore` leaves `package-lock.json` to npm                                       |
| `npm run verify`         | Acceptance: aggregates every gate independently through `scripts/checks.mjs` so one failure cannot hide another |
| `npm run check:compat`   | The same aggregated acceptance, used by hosted verification                                                     |
| `npm run check:quality`  | The quality gates alone, aggregated the same way                                                                |
| `node scripts/policy.ts` | Baseline equality, permitted mappings, suppression scan, and the file coverage report                           |

## Compiler projects, profiles, and ownership

| Owner                        | Covers                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| `tsconfig.json`              | The canonical strict project for maintained source and tests                                    |
| `tsconfig.declarations.json` | The handwritten `expr-eval-fork.d.ts` augmentation and its consumer, with `skipLibCheck: false` |
| Baseline profile             | Every maintained file not covered by a profile below                                            |
| Test profile                 | `*.test.ts` plus the extension entrypoints `check.ts` and `check-extension.ts`                  |
| Declaration profile          | Handwritten declaration files                                                                   |
| Negative type-test profile   | `*.test-d.*`, where a described `@ts-expect-error` is the defined allowance                     |
| Generated scope override     | Lint-scoped files no compiler project covers; written by `node scripts/lint.mjs scope --write`  |
| oxfmt                        | Everything in the repository except `package-lock.json`                                         |
| `lint-baseline.json`         | Generated from the adopted copy of the standard                                                 |

Semantic scope: every maintained TypeScript file is inside a compiler project. The only
maintained handwritten JavaScript is `scripts/lint.mjs` and `scripts/checks.mjs`, which sit in
the generated syntactic-only override; there is no checked-JS project, so the checked-JS row
of the qualification table has nothing to exercise.

Node test registration: `allowForKnownSafeCalls` is empty, so the framework mapping's
registration controls do not apply to this repository. The harness keeps awaited top-level
`node:test` registrations, has no context subtests, and retains `ignoreVoid: false`.

## Migration status

Complete. Configuration, profiles, generated override, verifier, acceptance wiring, probe
harness, and agent instructions all describe the repository as it is now.

## Quality exceptions

None. No rule, option, threshold, or scope is adjusted away from the standard. The single
`@ts-expect-error` in `test/expr-eval-fork.test-d.ts` carries a description and is the
negative type test profile's defined allowance, not an exception.

## Integrated verification

| Revision                                                                                             | Where                        | Result |
| ---------------------------------------------------------------------------------------------------- | ---------------------------- | ------ |
| recorded by `node scripts/policy.ts` and the acceptance run at the head of the adopting pull request | host with the full toolchain | pass   |
