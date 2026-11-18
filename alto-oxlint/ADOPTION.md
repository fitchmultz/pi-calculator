# Adoption record

This record describes the repository's adoption of the standard in [`POLICY.md`](POLICY.md).
It states the current state of the repository; supporting tests and review artifacts live in
their normal locations.

## Adopted version

| Field        | Value                                                              |
| ------------ | ------------------------------------------------------------------ |
| Repository   | `fitchmultz/pi-calculator` (`@fitchmultz/pi-calculator`)           |
| Version      | 5.1.2                                                              |
| SHA-256      | `41b6d505b36007218ca56b7b3443fcbd96d994715da5a83aaca52b58af47d3d6` |
| Adopted copy | `alto-oxlint/POLICY.md` (formatted by the project formatter)       |

## Runtimes, tools, and package manager

| Item            | Value                                                       |
| --------------- | ----------------------------------------------------------- |
| Node.js         | 24.22.3+ (24.x) or 26.13.1+ (`package.json` `engines.node`) |
| Package manager | npm, lockfile version 3 (`package-lock.json`, owned by npm) |
| oxlint          | 1.94.0                                                      |
| oxfmt           | 0.79.0                                                      |
| tsrs            | 7.1.0-beta.tsrs2                                            |
| TypeScript      | 7.0.2                                                       |

The standard prescribes no package version numbers; it asks for the current stable releases,
resolved reproducibly (`oxlint` and `oxfmt` above are current stable releases as of 2026-11-18,
while prerelease `tsrs@7.1.0-beta.tsrs2` is documented under `QX-001` below). Renovate owns keeping them current, and the
lockfile records the resolution for reproducibility without slowing updates.

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
registration controls do not apply to this repository, and the suite retains
`ignoreVoid: false`.

## Migration status

Complete. Configuration, profiles, generated override, verifier, and agent instructions all
describe the repository as it is now.

## Quality exceptions

The single `@ts-expect-error` in `test/expr-eval-fork.test-d.ts` carries a description and is the
negative type test profile's defined allowance, not an exception. No lint rule, threshold, or
source directive is relaxed.

### QX-001 — Prerelease `tsrs` type-aware backend in place of stable `oxlint-tsgolint`

- **ID and title:** `QX-001` — adopt prerelease `tsrs@7.1.0-beta.tsrs2` as the type-aware lint backend instead of stable `oxlint-tsgolint`.
- **Rule, installed tools:** Standard §5.1 ("latest stable published releases of Oxlint, `oxlint-tsgolint`, Oxfmt"); `oxlint 1.94.0` (`2026-11-16T12:26Z`), `tsrs 7.1.0-beta.tsrs2` (`2026-11-16T11:59Z`), `oxfmt 0.79.0` (`2026-11-16T12:27Z`), TypeScript `7.0.2`.
- **Scope:** `package.json` / `package-lock.json` `devDependencies` and type-aware lint execution (`oxlint` discovers `node_modules/.bin/tsrs-lint` automatically).
- **Contract and alternative:** `tsrs` publishes prereleases only (`dist-tags.latest` is `0.25.0-ts7.1.0-beta`; `7.1.0-beta.tsrs2` is an untagged newer prerelease; stable `oxlint-tsgolint@7.0.2007` remains published on npm). In a matched A/B benchmark on `mitchs-m5-mbp` (Darwin arm64, `oxlint 1.94.0` running `oxlint --deny-warnings .`, median of 3 warm runs each via `OXLINT_TSGOLINT_PATH`), `oxlint-tsgolint@7.0.2007` took `0.40s` wall time and `519.7 MiB` maximum RSS vs `0.15s` wall time and `215.9 MiB` maximum RSS with `tsrs@7.1.0-beta.tsrs2` (`2.67x` slower, `2.41x` / `303.8 MiB` higher peak RSS; both exited `0`).
- **Adjustment and verification:** Owner-approved backend substitution; `oxlint 1.94.0` discovers `tsrs-lint` natively and fails closed if missing. Verified `2026-11-18` via `npm run check:compat` (`lint`, `format:check`, `typecheck`, `typecheck:declarations`, `lint:baseline`, `policy`, `test` including `test/scope.test.ts` and `test/policy.test.ts` `typescript(no-floating-promises)` diagnostic probes, `check`, `check:load`; all nine gates exit `0`) while keeping `alto-oxlint/POLICY.md` and `lint-baseline.json` verbatim `v5.1.2`.
- **Revisit trigger:** First stable `tsrs` release, any `oxlint` release changing backend discovery, or any type-aware diagnostic regression.

## Integrated verification

Local runs and hosted runs are reported separately, with the revision each one ran on.

| Revision                            | Scope                                                                                                                                                                              | Host                             | Result                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------- |
| `f5fe15e` (PR #48, standard v5.1.1) | full aggregate: lint, format:check, both compiler projects, baseline, policy, tests, behaviour checks                                                                              | `mitchs-m5-mbp` (full toolchain) | pass, exit 0                                               |
| `f5fe15e` (PR #48, standard v5.1.1) | hosted: resolve, compatibility (runs `check:compat`), Cursor, Pi Durable                                                                                                           | GitHub                           | pass                                                       |
| `dfb0384` (PR #52, standard v5.1.2) | the same nine gates                                                                                                                                                                | `m1-mbp` (full toolchain)        | pass, exit 0; also pass at `fdf7bb0`, `3ec5391`, `dbc722f` |
| `dfb0384` (PR #52, standard v5.1.2) | hosted: resolve, compatibility, Cursor, Pi Durable                                                                                                                                 | GitHub                           | pass                                                       |
| `50e0e33`, published as `4.1.7`     | registry artifact: manifest, tarball contents, gallery preview URL, fresh consumer install                                                                                         | npm registry                     | pass                                                       |
| `a395ff7`, published as `4.1.8`     | registry artifact: manifest, tarball contents (`docs/`, `statistics.ts`), gallery preview URL, fresh consumer install; hosted compatibility and release jobs on the release commit | npm registry and GitHub          | pass                                                       |
| `tsrs` rollout (`2026-11-18`)       | `npm run check:compat` (`oxlint 1.94.0`, `tsrs 7.1.0-beta.tsrs2`, `oxfmt 0.79.0`, `tsc`, baseline, policy, tests, behaviour checks)                                                | `mitchs-m5-mbp` (full toolchain) | pass, exit 0                                               |

The published artifact ships runtime sources only, so the repository's own gate scripts cannot
be executed from the tarball alone; the host-load evidence for a published release is the
hosted compatibility job run on its release commit, plus the registry and install checks above.
