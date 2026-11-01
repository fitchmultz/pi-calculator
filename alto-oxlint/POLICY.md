# Strict Oxlint and Oxfmt Engineering Policy

**Version:** 4.5  
**Release ID:** strict-quality-4.5  
**Status:** Final  
**Issued (local date):** 2026-10-22 (America/Boise)  
**Baseline source:** `strict-oxlint-oxfmt-policy-v4.1(1).md`  
**Purpose:** Correctness, organization, long-term maintainability, and reliable verification for TypeScript and JavaScript repositories maintained by AI agents.

This document is the authoritative implementation standard. It combines native lint, compiler, formatter, and test capabilities with focused verification of configuration, suppressions, and source coverage. It does not require a new typechecker or policy platform.

The policy is self-contained: all requirements and baseline configurations are embedded below. The optional v4.1 reference bundle contains historical configurations and qualification evidence; it is not required to begin adoption and does not qualify a repository for v4.5. The current requirements, embedded settings, and explicitly permitted mappings take precedence over earlier reference copies or instructions.

Version 4.5 carries forward v4.4 with one owner-approved option change: `typescript/prefer-promise-reject-errors` permits unknown-type rejection values. Preserve existing failure behavior; known non-Error values, empty rejection calls, and `any` values remain checked. No other rule, option, limit, source profile, or acceptance requirement changes.

### How to use this document

- **Implementers:** Read the current requirements in Sections 1–18. Use the kickoff prompt with the complete policy, not as a replacement for it.
- **Reviewers:** Use Section 5 for fixed decisions, Section 16 for verification, Section 17 for maintainability, and Section 18 for reporting and completion.
- **Repository owners:** Apply a compatibility supplement only to its named repository and matching core release, as specified in Section 6.
- **All readers:** Historical evidence and the changelog provide traceability, not additional requirements or exceptions. No document-formatting or configuration-comparison result establishes repository acceptance.

### Key terms

- **Semantic lint:** Type-aware lint checks. These are separate from the canonical compiler or framework typecheck.
- **Published tools (stock tools):** Standard upstream releases rather than custom lint-engine forks.
- **Toolchain qualification:** Evidence that the installed tools handle the required valid and invalid cases through the actual supported execution paths.
- **Required gate:** A check required by the repository's acceptance workflow. Failed, skipped, and unrun gates are not passing results.
- **Repository mapping:** An adaptation expressly permitted by this policy, such as actual source paths or runtime settings—not permission to weaken a rule.
- **Compatibility provision:** A bounded, owner-authorized allowance in a matching repository supplement.

### Contents

- [Kickoff prompt](#kickoff-prompt)
- [1. Authority and repository integration](#1-authority-and-repository-integration)
- [2. Source profiles and coverage](#2-source-profiles-and-coverage)
- [3. Language and compiler requirements](#3-language-and-compiler-requirements)
- [4. Required Oxlint configuration](#4-required-oxlint-configuration)
- [5. Fixed decisions and enforcement boundaries](#5-fixed-decisions-and-enforcement-boundaries)
- [6. Contracts, mutation, and state ownership](#6-contracts-mutation-and-state-ownership)
- [7. Structural limits and decomposition](#7-structural-limits-and-decomposition)
- [8. Promise ownership and asynchronous behavior](#8-promise-ownership-and-asynchronous-behavior)
- [9. Validation, lifecycle guards, and errors](#9-validation-lifecycle-guards-and-errors)
- [10. Frameworks, assertions, and fixtures](#10-frameworks-assertions-and-fixtures)
- [11. Focused policy-integrity verification](#11-focused-policy-integrity-verification)
- [12. Published tools, qualification, and known limits](#12-published-tools-qualification-and-known-limits)
- [13. Oxfmt and file ownership](#13-oxfmt-and-file-ownership)
- [14. Configuration and dependency maintenance](#14-configuration-and-dependency-maintenance)
- [15. Commands and CI execution](#15-commands-and-ci-execution)
- [16. Verification and adoption](#16-verification-and-adoption)
- [17. Maintainability review](#17-maintainability-review)
- [18. Agent instructions, reporting, and completion](#18-agent-instructions-reporting-and-completion)
- [References](#references)
- [Historical qualification evidence](#historical-qualification-evidence)
- [Changelog](#changelog)

## Kickoff prompt

Supply the following prompt with the complete policy. Attaching this document as the authoritative instruction is also sufficient.

```text
Implement the supplied Strict Oxlint and Oxfmt Engineering Policy in this
repository. The policy is fixed during implementation. Implement its
requirements; do not redefine them to obtain a passing result.

Inspect the repository, effective configuration, and uncommitted work
before editing. Preserve unrelated changes and useful existing work.
Use the existing package manager, lockfile, runtime, workspace structure,
framework, compiler, test runner, build system, and CI conventions.

First record the existing verification baseline and qualify the tooling
with a clean case and representative violations. Then complete the
integration and source refactoring. Preflight is an implementation phase,
not a reason to stop and ask whether to continue.

Apply the exact rules, severities, options, limits, and source profiles.
Keep the readonly-parameter rule off and keep accurate readonly types.
Only the policy's enumerated mappings and closed compatibility provisions
are permitted. Do not add other exemptions, suppressions, safe-Promise
identities, mutation allowances, higher thresholds, or coverage reductions.
Existing exceptions are not automatically approved. Do not request waivers.

Check all maintained handwritten JavaScript as well as TypeScript.
Use native capabilities and a small policy-integrity verifier. Do not
create custom readonly/JSDoc analysis engines or a generic policy framework.
Type-only contract utilities follow Section 6. Use published lint tools;
qualify actual paths and document stock-tool limitations under Section 12.
Do not maintain custom stricter lint forks or their native build machinery.
JavaScript may be converted to TypeScript when this improves the design
and preserves execution contracts and full checking coverage.

Substantial cleanup is expected. A maintainability requirement does not
become optional because the code currently works or the cleanup is large.
Decompose along responsibilities and establish clear state ownership.

Preserve intended behavior, public contracts, security boundaries,
ordering, cancellation, errors, resource lifecycles, and meaningful tests.
Do not evade diagnostics through casts, aliases, artificial wrappers,
weaker assertions, file reclassification, or distorted control flow.

Reconcile existing configuration with the policy's explicit settings.
Preserve additional nonconflicting protections and useful source
improvements. Remove obsolete suppressions without reverting good code.

Verify valid cases pass and intended violations fail through the actual
acceptance commands. Keep compiler checking independent of semantic lint.
Use the policy's verification cadence and preserve process exit status.

Diagnose suspected tool defects; a diagnostic is not automatically right
or wrong. Use qualified published releases and retire custom lint forks
under Section 12. Preserve meaningful application/runtime/compiler tests;
record accepted complex-case detection gaps without calling them passing
regressions. Do not filter diagnostics or add unapproved rule exclusions.

If a sound compliant resolution is unavailable, preserve correct behavior,
retain the required check, complete independent work, and report the exact
blocker with evidence. Do not request a waiver or report success without evidence.

Review source changes and enforcement changes separately. Use a separate
reviewer agent when available and address its findings. Preserve existing
required review and branch-protection rules.

Use focused preparatory PRs when useful, followed by final adoption,
under Section 16. Preserve current required gates at every stage. Open
the PRs, run actual CI, and address implementation and review findings.
Report the exact checked revision, results, coverage, and maintainability
improvements. Preparatory work is not completed policy adoption.
A blocked or unrun gate must remain visible.

Do not merge, enable auto-merge, bypass required checks, change branch
protection, or introduce new external approval infrastructure.
```

## 1. Authority and repository integration

### Practical value

Correctness, maintainability, and trustworthy enforcement are equal requirements. A finding does not need to expose an existing runtime bug to justify fixing it.

Choose implementations for practical correctness, performance, readability, and maintenance value, not diagnostic count alone. Do not add high-effort work or compile/CI cost with no benefit beyond style, or introduce types, wrappers, or abstractions with no useful contract.

Formatting remains required. These cost/value principles do not authorize weakening or omitting fixed requirements. If a fixed requirement appears to impose that cost without benefit, report the concrete trade-off and continue independent work; only the owner may approve a policy change.

### Authority and change control

The supplied policy is authoritative. Repository configuration, agent instructions, manifests, and verification scripts implement it. Their agreement does not authorize changing it. Only an explicit owner-directed policy revision changes the standard.

An owner instruction to adopt this version authorizes replacing conflicting earlier settings and exceptions for the checks it specifies, including conflicting repository agent instructions. Record that governance reconciliation and the adopted revision in the PR. Preserve nonconflicting protections and useful source improvements. Adoption does not authorize changing supported public APIs, frozen integration contracts, required behavior, or security boundaries.

Future policy changes require explicit owner approval, including while adoption or a PR is still in progress. Record decisions made on the owner's behalf and their rationale; a recorded proposal is not approval to change the policy.

A delivered revision is fixed during implementation. Publish owner-directed corrections or clarifications as a separately identified revision with a change record; do not silently overwrite a delivered version or relabel its evidence. Distinct revisions may share an issue date. Identify the adopted revision and content digest in the adoption record; hashing a self-editable policy is traceability, not independent assurance.

A high diagnostic count, a difficult integration, or working runtime behavior does not establish that a rule is defective or optional. Distinguish a faithful contract finding, a genuine checker defect, and an unresolved integration conflict using actual code and reproducible evidence. An instruction to adopt this version authorizes its required migrations; do not request a second approval for its stated settings or checked-JavaScript scope.

### Repository preflight and integration

Oxlint owns the required lint checks. Oxfmt owns its assigned formatting. Canonical compiler/framework checking, tests, builds, and policy verification remain separate automated gates. Preserve additional compatible checks, including security, accessibility, or architecture checks without native Oxlint equivalents. Remove an existing checker only after demonstrating that its required coverage is preserved.

Before refactoring, inventory effective rules, nested configuration, ignores, compiler projects, scripts, required CI jobs, and uncommitted changes. Run the available existing compiler, test, and build commands. Distinguish pre-existing failures and missing prerequisites from introduced regressions.

Install or retain compatible, lockfile-resolved `oxlint`, `oxlint-tsgolint`, and `oxfmt` releases. Use the same resolved implementations locally and in CI. Preserve runtime targets, module semantics, package boundaries, and useful source improvements.

### Permitted repository mappings

Allowed mappings are limited to actual source-profile paths, runtime globals, framework settings, assertion-helper identities, the qualified `node:test` registration mapping defined in Section 8, the matching owner-authorized repository supplements governed by Section 6, equivalent scoped invocations, and established formatting conventions. They do not permit different rule thresholds, disabled rules outside those exact provisions, or additional allowed type/call identities. Section 12 governs published-tool qualification, known limitations, and custom-fork retirement; it does not authorize additional policy changes.

## 2. Source profiles and coverage

Classify by actual contents, consumers, and execution role. Names alone never establish eligibility. Ambiguous handwritten executable code is production code.

| Profile                         | Definition                                                                            | Treatment                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Production                      | Application, library, adapter, administrative, build, and quality-tool implementation | All applicable native checks and production structural limits                                                |
| Tests and test-only support     | Test entrypoints and helpers consumed exclusively by tests                            | Safety and applicable assertion checks; test branching and parameter limits                                  |
| Handwritten declarations        | Maintained declaration surfaces without implementation bodies                         | Applicable lint, actual declaration checking, and consumer contract tests; no implementation-size metrics    |
| Static data                     | Literal data without executable behavior                                              | Parsing, formatting, schema/consumer verification; no implementation-size metrics                            |
| Negative type tests             | Dedicated compiler-contract assertions                                                | Compiler-verified expected errors and valid cases; prescribed directive treatment and test structural limits |
| Diagnostic inputs               | Deliberately invalid source consumed by a diagnostic harness                          | Exact expected diagnostics; no runtime dependency use                                                        |
| Generated or vendored artifacts | Reproducible outputs or externally maintained dependency copies                       | Provenance, freshness, build, and applicable compatibility verification                                      |

Production code used by tests remains production code. A helper consumed by both production and tests is production. A data module containing factories, calls, side effects, or orchestration is implementation. An identifiable generator or external source is required for generated/vendor treatment. Maintained generators and behavioral templates retain their implementation obligations.

Maintain a compact file-coverage report showing maintained source, profile, lint scope, compiler/framework project, and formatter ownership. Compare against actual repository files and resolved project membership, not merely a second copy of the same include globs. New maintained files must receive the required treatment automatically or fail coverage verification.

Preserve architectural checks and use existing tooling or supported native restrictions to verify production/test boundaries. Production dependencies on diagnostic inputs are prohibited. Production consumers of test helpers require production reclassification. Do not create a general dynamic-dependency analyzer to implement this policy; inspect actual runtime registration paths where static tooling cannot establish the role.

### Negative type tests

Dedicated `*.test-d.ts`, `*.test-d.mts`, and `*.test-d.cts` files may use `@ts-expect-error` with a description of at least ten characters identifying the expected contract failure. An established dedicated type-test convention may map to this same profile.

The canonical compiler must reject unused directives. When a specific diagnostic identifier is the assertion, use source-text fixtures and assert that identifier and relevant location; `@ts-expect-error` alone does not identify which error occurred. Keep negative inputs out of runtime dependencies. Test harnesses and fixture generators receive their actual production or test profile.

## 3. Language and compiler requirements

Every maintained handwritten TypeScript and JavaScript implementation, test, and tooling file receives non-type-aware lint, applicable type-aware lint, and canonical compiler/framework checking. This includes `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, and `.cjs`. Prescribed diagnostic/generated profiles retain their defined treatment.

TypeScript is the default for new implementation. Intentional JavaScript remains permitted, but it must be checked. Use effective `allowJs: true` and `checkJs: true` in appropriate projects, or equivalent effective per-file checking with complete verified membership. Add a small no-emit checking project where the existing build project does not cover maintained scripts or tests.

There is no legacy unchecked-JavaScript profile or changed-files-only enforcement in this version. A real integration conflict is a reported blocker, not permission to fall back to syntax-only lint.

Checked JavaScript receives native semantic analysis and compiler diagnostics. TypeScript-syntax rules retain their actual language coverage; do not claim identical JSDoc enforcement. Do not exploit that difference through JSDoc casts, unverified declarations, or language changes. This policy does not require implementing a custom JSDoc typechecker.

Apply these options through the typed-project configuration hierarchy:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedSideEffectImports": true,
    "forceConsistentCasingInFileNames": true,
    "noCheck": false
  }
}
```

For projects containing maintained JavaScript, add the effective checking settings without changing intended emit behavior:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true
  }
}
```

Verify every checked leaf project. `strict: true` must not be undermined by explicit strict-family opt-outs, including supported `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`, and `strictBuiltinIteratorReturn`. Preserve stronger nonconflicting options. Do not pass unsupported options to an older compiler merely for textual conformity; qualify a compatible toolchain.

Keep framework typechecks, runtime targets, resolution behavior, references, and legitimate asset declarations. Do not add catch-all declaration stubs to conceal missing implementation imports. Verify asset existence through the build or the existing asset check.

Handwritten declarations, including handwritten module/global augmentations, must receive an actual check with `skipLibCheck: false`. The main application may retain `skipLibCheck` when a focused declaration project checks these declarations and their required dependency closure. Do not stub away that closure. Add consumer type tests for significant changes to public generics, overloads, exports, optional properties, and supported signatures.

Generated/runtime/vendor declarations retain their predefined provenance, freshness, and compatibility treatment. A generated filename does not establish a profile, and a generated profile does not authorize hiding diagnostics from a required compiler project or its dependency closure. Diagnose declaration origin, generation settings, runtime compatibility, duplicate libraries, and project membership before attributing a failure to the handwritten-declaration requirement. An unresolved required-project failure remains a blocker.

### JavaScript-to-TypeScript conversion

Keeping existing JavaScript as checked JavaScript is permitted, not mandatory. Convert selected maintained files to TypeScript when that improves contracts and reduces unnecessary JSDoc scaffolding without breaking supported execution paths. This is an implementation choice already consistent with TypeScript as the default for new implementation, not a coverage exemption.

Verify actual runtime versions, module semantics, entrypoints, import extensions, subprocess invocations, test discovery, packaging, and deployment behavior. Update package scripts, CI, agent instructions, fixtures, and references together. Preserve meaningful validation and assertions rather than deleting them with annotation scaffolding. Do not blanket-convert files whose consumers require JavaScript.

Node's native TypeScript execution performs type stripping, not typechecking, and does not implement arbitrary `tsconfig.json` transformations. Qualify supported syntax and module resolution against the actual runtime. Use the existing supported compiler or loader where required. Direct execution does not replace canonical checking, semantic lint, or declaration verification.

### Semantic lint and compiler diagnostics

The fixed Oxlint baseline uses `typeAware: true` and `typeCheck: false`. The first enables semantic lint; the second leaves compiler-diagnostic reporting to the mandatory canonical compiler/framework gate. Disabling duplicate compiler reporting does not disable semantic rules or excuse unsupported project assignment.

Verify actual semantic coverage. Oxlint's `--tsconfig` option concerns import resolution; it is not proof of semantic membership. Root-level options, nested configs, CLI arguments, editor settings, and separately composed passes must preserve the required coverage. Missing declarations and stale generated types are integration defects.

## 4. Required Oxlint configuration

Use the repository's supported configuration format. For a new setup, `.oxlintrc.json` is suitable. This is the complete common baseline before actual-path and applicable framework mappings:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["eslint", "typescript", "unicorn", "oxc", "import", "promise"],
  "categories": {
    "correctness": "error",
    "suspicious": "error",
    "perf": "error",
    "pedantic": "off",
    "style": "off",
    "restriction": "off",
    "nursery": "off"
  },
  "options": {
    "typeAware": true,
    "typeCheck": false,
    "denyWarnings": true,
    "reportUnusedDisableDirectives": "error",
    "respectEslintDisableDirectives": false
  },
  "rules": {
    "typescript/no-explicit-any": [
      "error",
      {
        "fixToUnknown": false,
        "ignoreRestArgs": false
      }
    ],
    "typescript/no-non-null-assertion": "error",
    "typescript/no-unsafe-type-assertion": "error",
    "typescript/no-unnecessary-type-assertion": [
      "error",
      {
        "checkLiteralConstAssertions": true
      }
    ],
    "typescript/consistent-type-assertions": [
      "error",
      {
        "assertionStyle": "as",
        "objectLiteralTypeAssertions": "never",
        "arrayLiteralTypeAssertions": "never"
      }
    ],
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/no-empty-object-type": "error",
    "typescript/no-unsafe-function-type": "error",
    "typescript/no-wrapper-object-types": "error",
    "typescript/no-invalid-void-type": [
      "error",
      {
        "allowAsThisParameter": true,
        "allowInGenericTypeArguments": true
      }
    ],
    "typescript/no-unnecessary-type-parameters": "error",
    "typescript/no-deprecated": "error",
    "typescript/no-duplicate-type-constituents": "error",
    "typescript/no-redundant-type-constituents": "error",
    "typescript/unbound-method": "error",
    "typescript/no-misused-spread": "error",
    "typescript/no-for-in-array": "error",
    "typescript/require-array-sort-compare": "error",
    "typescript/ban-ts-comment": [
      "error",
      {
        "ts-check": false,
        "ts-expect-error": true,
        "ts-ignore": true,
        "ts-nocheck": true
      }
    ],
    "typescript/strict-boolean-expressions": [
      "error",
      {
        "allowAny": false,
        "allowNullableBoolean": false,
        "allowNullableEnum": false,
        "allowNullableNumber": false,
        "allowNullableObject": true,
        "allowNullableString": false,
        "allowNumber": false,
        "allowString": false
      }
    ],
    "typescript/no-unnecessary-condition": [
      "error",
      {
        "checkTypePredicates": false,
        "allowConstantLoopConditions": "only-allowed-literals"
      }
    ],
    "typescript/switch-exhaustiveness-check": [
      "error",
      {
        "considerDefaultExhaustiveForUnions": false
      }
    ],
    "eqeqeq": ["error", "always"],
    "no-implicit-coercion": "error",
    "typescript/restrict-plus-operands": [
      "error",
      {
        "allowAny": false,
        "allowBoolean": false,
        "allowNullish": false,
        "allowNumberAndString": false,
        "allowRegExp": false,
        "skipCompoundAssignments": false
      }
    ],
    "typescript/restrict-template-expressions": [
      "error",
      {
        "allowAny": false,
        "allowArray": false,
        "allowBoolean": true,
        "allowNever": false,
        "allowNullish": false,
        "allowNumber": true,
        "allowRegExp": false
      }
    ],
    "typescript/no-base-to-string": [
      "error",
      {
        "checkUnknown": false
      }
    ],
    "typescript/no-floating-promises": [
      "error",
      {
        "checkThenables": true,
        "ignoreIIFE": false,
        "ignoreVoid": false,
        "allowForKnownSafeCalls": [],
        "allowForKnownSafePromises": []
      }
    ],
    "typescript/no-misused-promises": "error",
    "typescript/await-thenable": "error",
    "typescript/return-await": ["error", "error-handling-correctness-only"],
    "typescript/strict-void-return": "off",
    "jsx-a11y/no-noninteractive-element-interactions": "off",
    "jsx-a11y/no-noninteractive-tabindex": "off",
    "jsx-a11y/prefer-tag-over-role": "off",
    "typescript/no-confusing-void-expression": [
      "error",
      {
        "ignoreArrowShorthand": true,
        "ignoreVoidOperator": false,
        "ignoreVoidReturningFunctions": false
      }
    ],
    "typescript/no-meaningless-void-operator": "error",
    "promise/always-return": [
      "error",
      {
        "ignoreLastCallback": true,
        "ignoreAssignmentVariable": []
      }
    ],
    "promise/catch-or-return": "error",
    "no-async-promise-executor": "error",
    "no-promise-executor-return": "error",
    "typescript/only-throw-error": [
      "error",
      {
        "allowThrowingAny": false,
        "allowThrowingUnknown": false,
        "allowRethrowing": true
      }
    ],
    "typescript/use-unknown-in-catch-callback-variable": "error",
    "typescript/prefer-promise-reject-errors": [
      "error",
      {
        "allowEmptyReject": false,
        "allowThrowingAny": false,
        "allowThrowingUnknown": true
      }
    ],
    "no-useless-catch": "error",
    "no-param-reassign": [
      "error",
      {
        "props": true,
        "ignorePropertyModificationsFor": [],
        "ignorePropertyModificationsForRegex": []
      }
    ],
    "typescript/prefer-readonly": "error",
    "typescript/explicit-module-boundary-types": "error",
    "typescript/method-signature-style": ["error", "property"],
    "typescript/consistent-type-imports": [
      "error",
      {
        "prefer": "type-imports",
        "fixStyle": "inline-type-imports",
        "disallowTypeAnnotations": true
      }
    ],
    "typescript/consistent-type-exports": "error",
    "typescript/no-import-type-side-effects": "error",
    "import/no-cycle": [
      "error",
      {
        "ignoreTypes": false,
        "ignoreExternal": false,
        "allowUnsafeDynamicCyclicDependency": false
      }
    ],
    "import/no-self-import": "error",
    "import/no-duplicates": [
      "error",
      {
        "preferInline": true
      }
    ],
    "import/no-mutable-exports": "error",
    "complexity": [
      "error",
      {
        "max": 10,
        "variant": "modified"
      }
    ],
    "max-depth": [
      "error",
      {
        "max": 3
      }
    ],
    "max-params": [
      "error",
      {
        "max": 4
      }
    ],
    "max-statements": [
      "error",
      {
        "max": 40
      }
    ],
    "max-lines-per-function": [
      "error",
      {
        "max": 80,
        "skipBlankLines": true,
        "skipComments": true,
        "IIFEs": true
      }
    ],
    "max-lines": [
      "error",
      {
        "max": 500,
        "skipBlankLines": true,
        "skipComments": true
      }
    ],
    "curly": ["error", "all"],
    "no-var": "error",
    "prefer-const": "error",
    "no-nested-ternary": "error",
    "no-return-assign": ["error", "always"],
    "no-sequences": "error",
    "no-multi-assign": "error",
    "no-else-return": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-with": "error",
    "no-debugger": "error",
    "no-control-regex": "off",
    "no-empty": [
      "error",
      {
        "allowEmptyCatch": false
      }
    ],
    "no-empty-function": "error",
    "unicorn/no-useless-undefined": [
      "error",
      {
        "checkArguments": true,
        "checkArrowFunctionBody": true
      }
    ],
    "unicorn/no-abusive-eslint-disable": "error",
    "typescript/prefer-readonly-parameter-types": "off",
    "no-await-in-loop": "off",
    "require-await": "off",
    "typescript/require-await": "off",
    "typescript/consistent-return": "off",
    "no-underscore-dangle": "off",
    "unicorn/consistent-function-scoping": "off",
    "unicorn/no-array-sort": "off",
    "unicorn/no-array-reverse": "off"
  },
  "overrides": [
    {
      "files": [
        "**/*.test.{js,jsx,ts,tsx,mjs,cjs,mts,cts}",
        "**/*.spec.{js,jsx,ts,tsx,mjs,cjs,mts,cts}",
        "**/__tests__/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"
      ],
      "rules": {
        "complexity": [
          "error",
          {
            "max": 15,
            "variant": "modified"
          }
        ],
        "max-depth": [
          "error",
          {
            "max": 4
          }
        ],
        "max-params": [
          "error",
          {
            "max": 6
          }
        ],
        "max-statements": "off",
        "max-lines-per-function": "off",
        "max-lines": "off"
      }
    },
    {
      "files": ["**/*.d.ts", "**/*.d.mts", "**/*.d.cts"],
      "rules": {
        "complexity": "off",
        "max-depth": "off",
        "max-params": "off",
        "max-statements": "off",
        "max-lines-per-function": "off",
        "max-lines": "off"
      }
    },
    {
      "files": ["**/*.test-d.{ts,mts,cts}"],
      "rules": {
        "typescript/ban-ts-comment": [
          "error",
          {
            "ts-check": false,
            "ts-expect-error": "allow-with-description",
            "ts-ignore": true,
            "ts-nocheck": true,
            "minimumDescriptionLength": 10
          }
        ],
        "complexity": [
          "error",
          {
            "max": 15,
            "variant": "modified"
          }
        ],
        "max-depth": [
          "error",
          {
            "max": 4
          }
        ],
        "max-params": [
          "error",
          {
            "max": 6
          }
        ],
        "max-statements": "off",
        "max-lines-per-function": "off",
        "max-lines": "off"
      }
    }
  ]
}
```

### Applying the baseline

`typescript/no-base-to-string` remains an error with `checkUnknown: false`: it does not add a stringification finding solely because a value is typed `unknown`. This does not disable the rule for known base objects, authorize unsafe propagation, or relax the separate string-expression, compiler, and real-boundary validation requirements.

The configured active categories remain enabled at `error`. Explicit rule settings, including fixed exclusions, take precedence. Preserve the expanded category coverage of the qualified toolchain, rather than replacing it with a smaller handpicked list. Additional established protections may remain only when they do not conflict with explicit settings.

Every effective rule severity is `error` or `off`; no rule or category is set to `warn` (numeric `1`). This covers explicit rules and categories, overrides, nested and separately composed configurations, category defaults, plugin rules, and CLI flags such as `-W`/`--warn`.

Turn off each `warn` value on a rule this policy does not require; that is not a disabled required rule. A required rule, including a category-enabled rule, keeps `error`; restore it rather than turning it off.

Oxlint assigns `warn` to correctness rules in a configuration that omits `categories`; such a configuration must still yield `error` or `off` for every rule. Keep `denyWarnings: true` and `--deny-warnings` as the backstop.

Example globs implement profiles; they do not decide eligibility. Correct mappings when a test-looking name contains production code. Map actual test helpers, static data, declarations, diagnostic inputs, and generated artifacts to their fixed treatments. Do not introduce an exemption for a difficult file, function, SDK, or subsystem.

## 5. Fixed decisions and enforcement boundaries

The following choices are part of this version, not exceptions available to implementation agents:

| Decision                                                                      | Fixed treatment                                                                                                                         |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Correctness, suspicious, and performance categories                           | Errors, subject to exact explicit rule settings                                                                                         |
| Unsafe values/assertions, strict booleans, deprecations, unnecessary generics | Required applicable native checks                                                                                                       |
| Promise ownership and callback contracts                                      | Promise ownership/misuse checks stay strict; `strict-void-return: off`; safe-call mapping only under Section 8                          |
| Unknown-type Promise rejection values                                         | `prefer-promise-reject-errors: error` with `allowThrowingUnknown: true`; known non-Error, empty, and `any` rejection checks stay active |
| Parameter reassignment and direct property mutation                           | `no-param-reassign` with `props: true` and empty allowance lists                                                                        |
| Readonly parameter types                                                      | `typescript/prefer-readonly-parameter-types: off`; readonly input types are optional and not lint-enforced                              |
| Extra unknown stringification                                                 | `no-base-to-string: error` with `checkUnknown: false`; other string and unsafe checks stay active                                       |
| Temporary accessibility exclusions                                            | Exactly the three Section 4 `jsx-a11y` rules are off; other applicable checks and usability remain                                      |
| Published lint tools                                                          | Stock semantic/Rust engines; documented accepted limits rather than custom forks                                                        |
| Eligible private class members                                                | `typescript/prefer-readonly` remains enabled                                                                                            |
| Awaited loops                                                                 | `no-await-in-loop: off`; preserve required sequencing and resource behavior                                                             |
| Control-character regexes                                                     | `no-control-regex: off`; use visible escapes and validation tests                                                                       |
| Ordinary unnecessary conditions                                               | Enabled with `checkTypePredicates: false` in every profile                                                                              |
| Compiler diagnostics                                                          | Mandatory canonical compiler/framework gate; Oxlint `typeCheck: false`                                                                  |
| Rule severities                                                               | `error` or `off` only; non-required `warn` rules are turned off and required rules stay `error`                                         |
| JavaScript                                                                    | Complete checked-source scope; no unchecked legacy profile                                                                              |

Outside the exact Section 6 compatibility provisions, no additional disabled rules or allowed declarations may be added; turning off a non-required `warn` rule under Section 4 is expressly permitted and does not disable a required rule. Higher limits, mutation allowances, and Promise identities beyond the Section 8 test-registration mapping remain prohibited. Do not re-enable a fixed exclusion as an unrequested stricter setting.

Readonly parameter types are not lint-enforced in this version. `no-param-reassign` rejects parameter reassignment and direct property writes, deletes, and updates; `prefer-readonly` covers eligible private class members. Neither rejects mutating method calls, writes through an alias, or other mutation the declared types allow. A readonly input type lets the compiler reject writes and standard mutators such as `push` or `set`, but no rule requires one. These checks do not prove runtime immutability. Do not build a custom readonly checker or describe review as equivalent automated proof.

A documented native limitation is neither an approved coding pattern nor a claim of automated coverage. Deliberately removing useful annotations or changing language syntax to avoid a check violates the policy even when that particular evasion is not automatically detected. Review supplements the specified gates; it does not close their technical gaps or make their assurances universal.

## 6. Contracts, mutation, and state ownership

Preserve explicit application contracts and existing readonly objects, arrays, tuples, and collection views. Readonly input types are a good fit for application data that the operation does not own; this revision does not require them, and their absence alone is not a maintainability violation. Mutable state and resource implementations may retain accurate mutable types at their actual owner. Ownership is not an exemption from the configured parameter-mutation check. A readonly or focused capability view at a parameter boundary must not change the runtime object, its identity, or its supported behavior. Do not indiscriminately transform SDK types or erase useful annotations.

### Readonly views

Use standard readonly views when they accurately describe the required API. A meaningful `Readonly<T>`, readonly array, or focused capability type is not unnecessary complexity merely because a lint finding prompted it. For example, `Readonly<ReadonlyMap<string, Readonly<Item>>>` can protect method properties and application values while accepting ordinary mutable `Map` callers. Verify affected consumers, generics, overloads, and framework contracts; this compatibility is not universal. Shallow `Readonly<T>` alone does not make nested application data readonly. A readonly view can still expose stateful methods; preserve lifecycle ownership and do not describe it as a frozen or pure resource.

Preserve useful readonly edits made during earlier adoption attempts, including edits made for the now-disabled readonly-parameter rule. Remove a runtime wrapper, proxy, copy, or forwarding layer only after demonstrating that it has no required responsibility or consumer contract. Do not revert accurate readonly views in bulk, or retain unnecessary machinery solely because an earlier rule change introduced it.

### Type-only readonly utilities

A focused repository-local type-only recursive readonly utility is permitted. It is an ordinary TypeScript contract, not a custom analysis engine or an allowance. Prefer an existing suitable utility and standard readonly types; introduce or adapt one only for concrete current data shapes. Do not require a universal SDK transformation or duplicate variants for individual call sites.

Check the features its actual consumers use: nested records, arrays and tuples, optional properties, unions, and callable or constructable members as applicable. Preserve required call signatures, overloads, generics, receiver types, and nominal/private contracts; a naive recursive mapped type can erase callable signatures. Add focused compiler tests showing legitimate callers remain accepted and prohibited writes are rejected. If functions or handles are intentionally terminal leaves, retain their accurate contracts and do not claim their internals or returned data become recursively readonly. The utility remains subject to the normal lint and compiler requirements and the prohibition on diagnostic evasion.

Do not claim that a recursively mapped type provides a readonly collection contract while mutators such as `Map.set` or `Set.add` remain available. For borrowed collection data, use the appropriate standard readonly collection view with accurate readonly element/value types.

### Mutation and ownership

Transform borrowed input by returning values. Establish an explicit owner for mutable state. Do not alias a parameter solely to mutate it through another name, or use mutating utility calls to evade a direct-assignment check.

Review method calls, aliases, externally visible effects, and resource lifetimes. `no-param-reassign` does not reject `array.push`, `map.set`, or other mutating methods; the compiler rejects standard mutators only on readonly types. Copying a reference does not transfer ownership. Unnecessary defensive copies can also break identity, resource semantics, or performance requirements.

Keep `props: true` and both parameter-mutation allowance lists empty. An imposed mutable API that cannot be integrated soundly remains a demonstrated conflict; moving the same prohibited assignment into an adapter does not exempt it.

Treat external data as untrusted at its real boundary. Use accurate unknown types, validation, and narrowing. A handwritten predicate, assertion function, declaration, or augmentation is a claim requiring evidence. Do not fabricate type declarations to replace validation or conceal unsafe values.

### Repository-specific compatibility supplements

This policy is shared across repositories. Project names, application classes, exact source sites, and temporary integration exceptions belong in a separately supplied, explicitly owner-authorized repository supplement. A repository without such a supplement receives no additional compatibility allowances or suppressions. Runtime/framework mappings already enumerated in this core policy remain available only where that runtime/framework is actually used.

#### Scope and authority

A supplement must identify the target repository, compatible core release, exact rule or contract, bounded affected operations, required evidence, and removal conditions. It is part of the fixed owner-issued standard for that repository, not a manifest the implementing agent may author to approve its own exceptions. Do not import another repository's supplement by analogy. Adopting a supplied matching supplement requires no second approval. An uncovered conflict follows Section 12; do not stop independent work or request a waiver.

#### Mapping and evidence

Agents may map a supplied provision to actual paths and verified declaration identities, and may maintain the same mapped operation through evidenced renames or moves. They may not add operations, broaden contracts, replace deleted entries with unrelated cases, or change the authorized rule scope. Existing exceptions are not grandfathered. Record core and supplement release IDs and digests separately.

Preserve runtime-required named exports, framework registrations, generated declaration references, and existing public contracts. Such runtime requirements do not automatically authorize deprecated APIs; when a supplied compatibility provision covers an integration, its mapping must include the necessary runtime entrypoint and generated references without permitting unrestricted new consumers. No general barrel ban may override an established runtime export requirement.

Use supported compiler checking, module-resolution evidence, native semantic lint, and focused valid/invalid probes to establish a supplied declaration-origin claim. A type annotation must check the real initializer or callers; a cast, invented ambient declaration, unchecked loader, or any propagation is not evidence. Private/protected declaration identity may strengthen compatibility evidence where actually present and tested. Do not build a new type-aware origin analyzer or assume a stable programmatic compiler API is required.

One authorized source operation may have several explicitly supported runtime/module-resolution variants. Record and verify each actual variant under that operation. A variant set does not create permission for new operations or unrelated contracts. The supplement determines which operations and variants are authorized; there is no global exception count or reusable budget.

#### Verification and retirement

Implement exactly the supplement's suppression mechanism and limits. Use focused comment/AST-aware checks for source attachment and scope, native checks for the semantic relationship, and behavioral tests for lifecycle claims. Test copied directives, redirected origins, new consumers, and neighboring genuine violations. A syntax-only heuristic does not justify requiring a new type-aware checker architecture before using an already-authorized, site-specific provision.

Keep records and verification small. Compatibility is a visible owner policy decision, separate from a checker defect or source refactor. Report active provisions and remove them when their stated need ends.

## 7. Structural limits and decomposition

| Metric                         | Production          | Tests and test-only support |
| ------------------------------ | ------------------- | --------------------------- |
| Modified cyclomatic complexity | 10                  | 15                          |
| Nesting depth                  | 3                   | 4                           |
| Parameters                     | 4                   | 6                           |
| Statements per function        | 40                  | No size limit               |
| Function length                | 80 effective lines  | No size limit               |
| File length                    | 500 effective lines | No size limit               |

Effective lines exclude blank and comment-only lines according to the configured native rules. Run metrics on normally formatted code. There is no discretionary cohesive-file exemption. Declaration/static-data profiles have no implementation-size metrics.

### Decomposition and public contracts

Identify responsibilities, state ownership, dependencies, failure boundaries, and required ordering before extraction. Keep a readable entrypoint showing the operation's phases. Helpers must perform meaningful operations; modules must own coherent responsibilities. Focused typed options objects are appropriate when they improve the real API.

Do not satisfy metrics through arbitrary `part1` modules, forwarding chains, giant shared mutable contexts, line packing, opaque parameter containers, or production behavior moved into special profiles. Do not introduce casts, wrappers, recursion, or dispatch whose purpose is diagnostic evasion.

Internal ES-module exports are permitted for coherent decomposition. Keep them out of supported package/framework entrypoints where appropriate. Do not expand a supported public API merely to relocate implementation. Give each new dependency and export a concrete reason.

Externally imposed signatures do not authorize different parameter limits. Preserve calling semantics through a sound integration or report a genuine conflict. Type-only dependency cycles remain prohibited by the configured architectural rule; do not report their removal as proof of a runtime bug.

A lint-driven refactor does not authorize breaking a supported public constructor or function signature. Replacing positional arguments with an options object requires evidence that no supported external contract changes, or a separately authorized contract migration. Internal exports are not automatically public APIs. Preserve required framework registrations, persisted identities, and frozen integration contracts; a rule finding does not override them.

### Large test modules

Keep cohesive test lifecycles together. Test/proof modules exceeding 3,000 effective lines require a proportional review of scenarios, fixture ownership, cleanup, and navigation, not another automatic size cap. Test branching and parameter limits remain active.

## 8. Promise ownership and asynchronous behavior

Every asynchronous operation must have a real owner through awaiting, returning, aggregation, or meaningful completion and rejection handling. Background work needs failure handling, lifecycle ownership, applicable cancellation, and shutdown behavior.

Keep strict floating/misused-Promise and Promise-related callback checks. An empty catch, unused assignment, branded safe Promise, or `void` prefix is not ownership. A handler that passes lint may still throw or outlive its resources; test the actual contract.

Choose concurrency from dependencies, resource limits, and latency/throughput requirements. Awaited loops are permitted. Preserve ordering, retries, backpressure, cancellation, failure propagation, and cleanup. Inspect relevant `allSettled` outcomes; failed required work must not silently become success. Account for operations still running after an aggregate rejects or a race settles.

Do not turn a clear loop into recursion or a Promise chain solely to satisfy a stylistic preference. Test affected concurrency bounds and state transitions deterministically.

Use each test runner's supported registration, completion, concurrency, and subtest semantics. Do not mechanically await registrations one by one if that changes execution. Registration Promises receive no allowance except the `node:test` mapping below. Verify an actual failed test and subtest fail the runner and parent completion preserves required work.

### Node test-runner registrations

Node's `test()` returns a Promise that fulfills when a top-level test completes, or immediately when called within a suite; `suite()` and its alias `describe()` return immediately fulfilled Promises. Node documents that a top-level test's return value can usually be discarded, while a subtest's Promise should be used so the parent cannot finish first and cancel it. Awaiting each registration is therefore not required ownership, and it can change module evaluation order and scheduling.

The test-profile `typescript/no-floating-promises` safe-call mapping is limited to the following:

- **Functions:** `node:test`'s `test` and `suite`, their exported aliases `it` and `describe`, and the `skip`, `todo`, and `only` shorthands declared on them.
- **Names:** The declaration name or a distinct local import name bound to one of those functions, such as `nodeIt` for `import { it as nodeIt } from "node:test"`. The probes below determine which spelling qualifies; renaming imports to a mapped local name is an ordinary source change.
- **Origin:** Bind each entry to the installed `node:test` declarations through package or declaration-file origin. Bare-name entries are prohibited.
- **Scope and options:** Apply the mapping only to the test profile. Repeat the rule's other options exactly, keep the safe-Promise list empty, and leave production and every other profile unchanged.

The mapping covers no `TestContext` method, other test runner, same-named or wrapping repository function, or Promise created inside a test body.

Activate the entries only after the installed checker passes all of these probes in the actual test-profile configuration:

1. Unawaited top-level and suite-body registrations pass for every registration function and import form the repository uses.
2. An unawaited `t.test()` subtest fails.
3. An unawaited call to a same-named local function fails.
4. An unawaited call to a same-named function imported from another module fails.
5. A floating Promise inside a test body fails.
6. An unawaited, unrelated Promise-returning call fails.

An entry spelling or checker that accepts the unawaited `t.test()` subtest does not qualify. Use a published release qualified under Section 12. Prefer the permitted distinct local import names when declaration-name entries fail these core probes. Document advanced alias/shadow detection gaps without retaining a custom checker merely to satisfy its historical stronger probes.

Until a checker qualifies, keep the list empty and the findings visible as unfinished work. Do not await registrations, collect their Promises, or make suite callbacks asynchronous to clear the findings; keep or restore the plain registration form.

The declaration check cannot tell when a module-level registration function is called while another test is running. Node then creates a subtest of the running test, but the checker treats the call like a top-level registration. That call is not an approved pattern: create subtests through the test context, such as `await t.test()`, and review affected tests. This is a documented native limitation, not automated coverage, and requires no custom analyzer.

### Callback returns

`typescript/strict-void-return` is off. A caller may intentionally ignore an ordinary synchronous return value when its callback contract supports that behavior; do not add block bodies or type machinery solely for the disabled check. This does not authorize ignoring asynchronous work. Preserve `no-misused-promises`, `no-floating-promises`, and actual callback/result/lifecycle contracts. This example owns the Promise it creates:

```ts
function delay(delayMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
```

Keep the prescribed Promise-plugin rules. `promise/always-return` with `ignoreLastCallback: true` does not exempt every returned or assigned block-bodied `Promise<void>` chain. Use a genuine concise void-returning callback or clear async/await operation where appropriate. Do not invent dummy values, empty handlers, or misleading returns to satisfy the rule.

## 9. Validation, lifecycle guards, and errors

### Validation and lifecycle guards

Keep ordinary unnecessary-condition, deprecation, and unnecessary-type-parameter checks active. Predicate checking remains disabled in every profile. Runtime validation can be meaningful even when a value already has a static type.

For a suspicious condition, distinguish an inaccurate declared contract from control-flow analysis that does not model the actual writer or state change. Correct the contract or read current state from its real owner. Do not delete a required guard, widen an otherwise accurate type, or hide a value behind a cast solely to silence a diagnostic.

For cancellation, deletion, and lifecycle state, identify the owner and possible writers. Test changes while asynchronous work is suspended. Test validators against valid and invalid values at the actual boundary. Use visibly escaped control-character regexes where they express the contract; preserve the accepted whitespace and Unicode behavior. Do not substitute a broader character category without proving equivalent intended behavior.

### Error and API contracts

Create meaningful `Error` objects for new failures. Preserve a caught error's identity when rethrowing it. Creating a distinct contextual error with `cause` is appropriate only at a meaningful translation boundary that preserves the supported external error contract. Wrapping is not identity preservation.

`typescript/prefer-promise-reject-errors` permits unknown-type rejection values through `allowThrowingUnknown: true`. Forward an existing caught failure unchanged when that is the contract; do not add wrappers, extra Promise stages, or distorted control flow solely to satisfy lint. The rule stays at `error`, with `allowEmptyReject: false` and `allowThrowingAny: false`, so known non-Error rejection values, empty rejection calls, and `any` values remain checked. This deliberately removes checking of unknown-type rejection values, not just caught failures. It does not change `typescript/only-throw-error` or authorize new failures with arbitrary non-Error values.

Use canonical `noImplicitReturns` for return completeness. Preserve the configured valid `void` generic/this-parameter contracts, required argument presence, and callback results. Verify public generic and deprecation fixes against affected consumers; runtime tests alone do not prove type compatibility.

When a diagnostic recommends another API, verify that the receiver actually supports it and that the replacement preserves registration, replacement, ordering, cleanup, and failure semantics. Similar property names do not establish interface compatibility. Do not introduce bracket spelling, reflective writes, or a forwarding wrapper solely to hide the diagnostic. A reproduced receiver/API mismatch requires correct diagnosis. Use a qualified published fix under Section 12 or an exact already-authorized compatibility provision under Section 6 when applicable. Otherwise use the blocker procedure if no sound compliant implementation is available; the mismatch alone authorizes no additional exception.

### Intentional no-ops

Keep `no-empty-function` enabled. A genuine no-op must explain its real contract inside the body:

```ts
function flush(): void {
  // This sink has no buffered data, so flushing requires no work.
}
```

An explanation does not justify dropping errors or leaving required functionality unimplemented.

## 10. Frameworks, assertions, and fixtures

Enable the relevant native framework/test plugins only in applicable scopes. Keep base plugins when adding framework plugins; explicitly configured lists replace inherited lists. Verify actual effective composition. Preserve compatible security, accessibility, and architectural checks.

Retain focused existing custom checks that supply a verified, nonconflicting protection, including checks for table-driven assertions. The prohibition on building a new analyzer or generic framework is not permission to delete established protections because their implementation is custom. Replace a check only after positive and negative cases demonstrate preservation of its required protection and scope. Earlier draft-specific scaffolding is not automatically a required permanent subsystem, but classify what it enforces before retiring it.

### Temporarily disabled accessibility rules

The three explicit Section 4 `jsx-a11y` exclusions override category enablement wherever that plugin applies; they do not enable the plugin in unrelated source. They address demonstrated stock false positives for interactive separator and composed image semantics. Keep all other applicable accessibility rules and verify real keyboard navigation, focus, and screen-reader behavior for affected product changes; disabling a heuristic is not proof of usability.

Track `no-noninteractive-element-interactions`, `no-noninteractive-tabindex`, and `prefer-tag-over-role` as temporary exclusions in the adoption record with the observed upstream version and reproductions. Re-enable only after a published upstream fix passes those legitimate cases and meaningful violation controls, affected product behavior is verified, and the owner approves the policy change. Do not promise an upstream fix or silently re-enable them.

### React

Add the React plugin and these explicit checks alongside category enforcement:

```json
{
  "react/rules-of-hooks": "error",
  "react/exhaustive-deps": "error",
  "react/jsx-key": "error",
  "react/jsx-no-duplicate-props": "error",
  "react/jsx-no-undef": "error"
}
```

Correct effect dependencies and synchronization. Test relevant updates, remounts, cancellation, and state transitions. Use stable semantic keys for insertions, deletions, and reordering. Preserve stronger existing key/accessibility checks.

### Vitest

Add the Vitest plugin for its runtime tests and use:

```json
{
  "vitest/no-focused-tests": "error",
  "vitest/valid-expect": [
    "error",
    {
      "minArgs": 1,
      "maxArgs": 2
    }
  ],
  "vitest/expect-expect": [
    "error",
    {
      "assertFunctionNames": ["expect", "expectTypeOf", "assert", "assertType"]
    }
  ],
  "vitest/no-conditional-expect": "error"
}
```

### Jest

Add the Jest plugin for its runtime tests and use:

```json
{
  "jest/no-focused-tests": "error",
  "jest/valid-expect": "error",
  "jest/valid-expect-in-promise": "error",
  "jest/expect-expect": [
    "error",
    {
      "assertFunctionNames": ["expect"]
    }
  ],
  "jest/no-conditional-expect": "error"
}
```

### Assertion helpers and runner coverage

Exact assertion helpers may be registered when they actually verify behavior and propagate failure. No wildcards. Test their behavior and demonstrate a materially defeated assertion is detectable. Matching a helper name is not proof of correctness.

Keep conditional-expectation checks. Narrow by failing immediately when a required test condition is absent, then assert unconditionally. Do not move conditional assertions into helpers to hide them. Every passing path must exercise the required assertions. Type-only assertions do not substitute for runtime assertions in a test claiming runtime behavior.

For other runners, preserve corresponding existing automated checks and verify real failure propagation. Do not invent Jest/Vitest coverage for an unsupported runner or build a new assertion analyzer. Report actual native coverage. Compiler-only negative tests use their compiler assertions; do not fabricate runtime expectations.

### Fixture and failure diagnosis

Diagnose implementation defects, invalid fixtures, and incorrect expectations separately. Preserve test selection, coverage, meaningful assertions, and cleanup. Verify isolated execution and the relevant suite. Skips, swallowed failures, weaker assertions, indiscriminate snapshot updates, and larger timeouts are not substitutes for diagnosis.

## 11. Focused policy-integrity verification

### Suppression controls

Maintained implementation and ordinary test source must contain zero unauthorized lint-disable directives and zero compiler-error suppression directives. Ordinary-source lint suppressions are prohibited unless an explicitly supplied, matching repository supplement authorizes the exact directive and source operation under Section 6. Dedicated negative type tests remain the only compiler-suppression assertion profile.

Use a small deterministic verifier with the existing parser/compiler facilities or a suitable maintained parser dependency. Distinguish actual directives from strings, documentation examples, and classified diagnostic inputs. Do not scan arbitrary source text with a regex and call that comment-aware verification.

Reject all actual native/ESLint disable directives except directives expressly authorized by the matching repository supplement, inline lint configuration that conflicts with the policy, `@ts-ignore`, `@ts-nocheck`, unauthorized `@ts-expect-error`, and formatter-ignore directives used to bypass maintained-source formatting. Used unauthorized suppressions must fail as well as unused ones. Validate each authorized directive's attachment, rule identity, receiver origin, and original site identity, not just an entry count. Oxlint's unused-disable check is insufficient by itself.

### Configuration and coverage

Keep a machine-readable required baseline and finite repository mappings. Check actual effective categories, rules, options, profiles, compiler settings, command coverage, and formatter ownership. Include nested configs, ignore files, CLI flags, and script composition. Verify each controlled field; a hash of a single config file is not proof of complete coverage.

Required integrity failures include a disabled required rule outside an exact authorized supplement provision, a rule at `warn` severity, changed fixed exclusion, raised threshold, nonempty safe-Promise or mutation allowance, safe-call entry beyond the exact Section 8 test-profile mapping, strict-family opt-out, unchecked maintained JavaScript, omitted maintained source, a special profile assigned to production behavior, or an expanded/redirected/unapproved compatibility mapping. Verify authorized consumers and source identities even within files containing a permitted use. Editing a manifest alongside code does not itself authorize expansion.

### Verifier design and execution

Use supported configuration resolution and compiler project listing. Do not implement a replacement typechecker, recursive readonly analyzer, JSDoc parity engine, or generic configuration framework. Preserve existing compatible verification and share repeated configuration through straightforward supported composition.

The verifier/generator is production implementation; its tests are test code; eligible literal manifests are static data; deliberately invalid inputs receive the diagnostic profile. Tooling remains subject to its actual source standards.

Repository-wide subprocess checks may run in a standalone policy command instead of inside a lint plugin when this preserves their required assertions, source coverage, exit status, and inclusion in actual acceptance. Verify the new command fails for the same relevant violations before removing the old invocation. Moving work does not authorize dropping it or disguising a resource failure as successful verification.

### Review

Review enforcement changes separately from source changes, using a separate reviewer when available. Preserve existing required reviews. If no independent reviewer is available, perform a distinct review pass and report that limitation. Neither reviewer nor implementer may authorize an exception. Repository-editable checks do not independently prevent an agent from changing their requirements and verifier together.

## 12. Published tools, qualification, and known limits

Use compatible standard published Oxlint and semantic-checker packages resolved by the lockfile. Do not maintain custom semantic or Rust linter forks, stronger patched lint engines, or native build/packaging machinery solely to extend their detection. This supersedes the earlier permission to introduce, port, or retain bespoke checker corrections. Application-library fixes, compiler/runtime tests, and resource settings have separate responsibilities and are not automatically retired.

Before mass refactoring, verify installed rule/option availability, valid-source behavior, semantic membership, and canonical compiler compatibility. Schema acceptance alone is insufficient. Capture effective rule identities, options, categories, and scopes; a rule count is not a coverage contract. Use the same resolved published implementation locally, in agent commands, CI, and editor integration. Verify clean reproducible installation and actual supported execution paths; do not build an unnecessary cross-platform compiler pipeline for published packages or rely on hand-edited dependencies.

The historical qualification versions are reference evidence, not a universal version floor or a substitute for current repository qualification. Upgrade when required capabilities or compatibility are absent. A tool is fallible: distinguish a source defect, declaration/configuration problem, and native-tool limitation. Do not downgrade tools, filter diagnostics, or add path/symbol allowlists to hide findings. An unchanged-source comparison alone cannot establish detection of meaningful invalid cases.

Oxlint's semantic engine has its own TypeScript compatibility requirements. Keeping the canonical compiler separate does not make incompatible semantic projects valid. Resolve module/configuration compatibility without changing intended runtime semantics, or report the exact blocker.

### Published-tool limitations and preserved safeguards

Keep `typescript/no-unsafe-return`, `typescript/no-floating-promises` including tests, `typescript/no-misused-promises`, and `typescript/no-deprecated` enabled. Qualify ordinary valid/invalid controls and the applicable core registration and compatibility probes. The owner accepts documented complex-case stock limitations instead of a bespoke engine. Generic/TypeBox unsafe-return gaps and advanced safe-call alias/shadow gaps are known limitations, not passing regressions, code-bug waivers, or permission to expand Promise allowances. A real application defect remains a defect even when the linter misses it.

Record precise missed cases and relevant upstream versions, retaining historical evidence and meaningful application/compiler/runtime guards. Do not demand custom-checker-only detection as a prerequisite for this approved stock policy or rebuild that detection in a repository-local analyzer. A newly encountered trade-off not covered by this version's decisions requires owner direction before changing settings; continue independent useful work. The only newly disabled rules are the exact Section 4 exclusions. No blanket unsafe-return, test-profile floating-Promise, accessibility, or deprecation disablement is authorized.

### Retiring custom lint machinery

Inventory mixed patches by responsibility before removal. Retire custom semantic/Rust checker sources, fork launchers, native build pipelines, packaging and obsolete custom-checker-only probes once the published installation and actual required paths work. Preserve their historical results as known-limit evidence rather than silently reporting stronger coverage. Remove probes that enforce now-disabled settings; preserve every remaining meaningful policy/runtime/compiler control. Rename ordinary test imports to a qualified Section 8 local-name mapping where needed, without changing registration ownership or hiding test-body work.

Classify Linux thread defaults, launcher behavior, allocator workarounds, and CI overcommit separately from semantic corrections. Prefer supported native flags and environment variables, verify actual CLI/editor/CI behavior, and document unresolved platform limits. Retiring a custom engine does not prove a stock allocator bug fixed or authorize unsafe resource changes. Keep independently needed resource handling until evidence supports its replacement or removal.

### Blocker reports

When a sound compliant resolution is unavailable, preserve behavior and the required check, continue independent work, and report:

1. Exact diagnostic or unavailable gate, affected versions/scope, and a minimal reproduction.
2. Required runtime behavior, public contract, or integration capability.
3. Attempted compliant implementations and why they would be incorrect or materially worse.
4. Completed work, exact revision, and gates still failing, blocked, or unrun.

This is a blocker report, not a waiver request. A tool defect does not authorize additional rule disablement, changing expectations to unrelated failures, or marking an unverified PR complete. Documenting the stock limitations expressly accepted above is not an unresolved demand to rebuild custom lint coverage. A blocker is an honest incomplete outcome, not an alternative passing state. There is no budget of unresolved final gates and no implied permission for a public-contract migration. A blocker does not itself require an owner policy revision or an approval question; continue independent useful work and report what remains incomplete.

## 13. Oxfmt and file ownership

Use Oxfmt for supported assigned files. Preserve established conventions, `.editorconfig` behavior, and deliberate formatting choices. For a repository without established choices, use:

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "endOfLine": "lf",
  "insertFinalNewline": true,
  "sortImports": false,
  "sortPackageJson": false,
  "sortTailwindcss": false,
  "jsdoc": false
}
```

Assign one formatter to each file type. Preserve required tooling for unsupported formats/features. Keep lockfiles under the package manager, generated output under its generator, and byte-sensitive fixtures exact. These role mappings do not permit blanket maintained-source ignores.

Sorting and JSDoc transformations are separate choices; do not introduce them as supposed quality strictness. Verify formatting idempotence and convergence with supported lint fixes. Review automatic edits. Line packing is not structural compliance.

### Formatting and digest order for the policy document

The policy author formats the complete release before delivery with its recorded formatter version and configuration, verifies a clean non-writing check and an unchanged second formatting pass, and computes the final content digest afterward. Implementers must not exclude a formatter-owned policy file solely to preserve an unformatted delivery digest. Remove any formatter exclusion retained only for the unformatted r2 release.

For a repository with different established formatter settings, keep those settings and coverage. An exact, repeatable formatter-only normalization of the delivered policy is permitted: record both the upstream release digest and normalized repository digest, retain the release ID, verify parsed embedded configurations are unchanged, and verify prose/code content differs only in formatter-produced presentation. Hashes identify their respective bytes; do not claim the two digests are identical or silently change requirements. If formatting would change content or embedded configuration semantics, report that concrete conflict instead of adding an ignore. This narrow presentation mapping grants no authority to edit policy meaning.

## 14. Configuration and dependency maintenance

Use the existing package manager and reproducible installation. Record exact resolved tool versions and effective rule coverage. Test checker/toolchain changes before accepting new results. New category findings must be resolved; an upgrade does not authorize discarding them.

Use one authoritative input for genuinely generated configuration, deterministic output, and a drift check. Verify option and array merging. Prefer direct config and a small verifier in small repositories; reuse an existing shared implementation when available. Do not make a new hosted service or published policy package a prerequisite.

Run dependency builds and code generation before checks that consume their outputs. Diagnose missing/stale prerequisites clearly. Do not hand-edit generated artifacts while leaving their generator inconsistent.

### Generated declaration freshness

Use the project's actual generator and supported non-writing freshness mechanism. Repositories without generated declarations do not need these checks. For Cloudflare Worker packages specifically, include the installed Wrangler's supported non-writing `types --check` invocation in its actual typecheck/acceptance workflow. Use the same configuration paths, environment/interface options, and runtime inputs as generation, and verify an input-changing negative probe fails. Run it without credentials or remote access when supported by the qualified version; do not assume an offline run in one environment proves every generation mode is offline.

Wrangler's check compares recorded configuration/environment hashes and runtime headers with current inputs. It does not regenerate, compare, or validate the declaration body. A passing check establishes the recorded input freshness that it checks, not that a generated file has never been hand-edited.

Preserve a reproducible generation command and establish generated-body integrity at adoption and after generator/input/output changes by regenerating in an isolated worktree or equivalent temporary environment and comparing the actual declaration content at its canonical relative path. Use the repository's existing regeneration/drift check if it already provides this evidence. Preserve relative import semantics; do not hide differences through broad normalization or replace this check with a self-updated hash of the submitted file. Required compiler/declaration checks remain independent. Routine unchanged-source verification may use the qualified native freshness check under the existing cadence; no new generator framework is required.

## 15. Commands and CI execution

Use real repository command names and existing conventions. For a single root Oxlint scope, these native command bodies are suitable:

```json
{
  "scripts": {
    "lint": "oxlint --deny-warnings .",
    "lint:agent": "oxlint --deny-warnings --format=agent .",
    "lint:fix": "oxlint --fix .",
    "format": "oxfmt --write .",
    "format:check": "oxfmt --check ."
  }
}
```

Provide a policy-verification command using the repository's actual runtime; do not add a script pointing to an unimplemented verifier. Compose separately scoped lint passes where needed, preserving complete semantic coverage. Normal lint, agent lint, autofix verification, CI, and editor integration must agree on scopes and settings.

The real acceptance workflow must run non-modifying lint, formatting checks, canonical compiler/framework checks, required declaration checks, policy verification, applicable tests, and builds. Preserve existing required jobs and coverage. Do not use autofix or formatting writes against maintained repository files as acceptance gates. Fixer/formatter regression tests may modify isolated temporary fixtures; repository acceptance checks remain non-modifying.

Preserve child-process exit status through wrappers, pipelines, reporters, and CI. A command named `check` is not a gate if it misses required files, suppresses failures, or succeeds after a failed child command. Review suggested and dangerous autofixes rather than accepting them blindly.

Use authorized local/ephemeral environments for native verification. Beyond expressly requested repository, PR, and CI work, this policy does not authorize production access, unrelated messages, deployment, or other unrelated external side effects.

## 16. Verification and adoption

Keep a small committed regression harness that generates temporary diagnostic files. Use the existing test runner; if none exists, use the smallest compatible runner for the runtime. Do not commit oversized dummy implementation files or discard the only reproducible description of a probe.

### Preparatory PRs and final adoption

Adoption may use focused preparatory PRs followed by final integration. Preparatory work may include source refactors, meaningful tests, and prerequisite repairs while preserving the current acceptance workflow and all of its required protections. Run current required gates and relevant behavior/contract tests on each reported revision. Prefer coherent, independently reviewable changes; staging does not justify throwaway scaffolding or artificial module splits.

Keep behavior changes separate and explicit. For example, changing a backfill from skipping malformed rows to throwing requires its own contract justification and behavioral tests; do not bury it in typing or formatting. Targeted TypeScript conversions may be separate preparatory PRs with execution and discovery evidence.

A preparatory PR with passing existing checks is not completed policy adoption. Report the rollout as incomplete and identify remaining integration work or demonstrated blockers. Pre-existing noncompliance awaiting correction is unfinished work, not an approved exception. Do not introduce temporary suppressions beyond the exact Section 6 provisions, relaxed severities, exclusions, finding baselines, changed-files-only enforcement, or reduced final coverage. Compatibility provisions remain bounded during staging; staging creates no additional authority. Do not remove an already-required gate to make a stage pass.

Final integration must contain the complete required enforcement and pass the full adoption verification on the exact integrated revision. Preparatory source changes follow the ordinary-source cadence; enforcement changes follow the enforcement-change cadence for their actual scope, and never replace the full final-adoption verification. No new rollout framework or permanent debt inventory is required.

Split work into coherent reviewable PRs where appropriate so the owner and team can review it. Use responsibility and behavior boundaries, not arbitrary PR counts or mechanical size-based splitting. Preserve existing work and stacks; this does not authorize force-pushes or history rewriting.

The no-merge, no-auto-merge, no-bypass, and branch-protection restrictions apply to every preparatory and final PR. This delivery option provides no merge authority; any actual landing remains subject to separate owner authorization and existing review requirements. A preparatory PR that passes current gates may be reported as ready under those gates while the policy rollout remains incomplete.

### Verification cadence

| Change                                               | Required verification                                                                                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial adoption or incomplete-policy reconciliation | Toolchain qualification, full conformance probes, actual acceptance-failure probes, final integrated acceptance and CI                                         |
| Enforcement/toolchain change                         | Relevant compatibility regressions, full conformance probes, actual acceptance-failure probes, final integrated acceptance and CI                              |
| Ordinary source change                               | Existing acceptance gates and committed policy checks, relevant behavioral/contract tests, and proportional review; no need to recreate disposable gate faults |

Enforcement changes include rules/options, scope selection, profiles/ignores, compiler coverage, baseline requirements, verifier/probe code, toolchain patches, scripts, and CI.

### Conformance probes

For lint and compiler probes, assert the intended diagnostic identifier and relevant location. For formatter, policy, and acceptance probes, assert the intended failed gate or policy finding, the affected file/setting where applicable, and a nonzero exit status. Every probe must have a valid passing counterpart. Parser crashes, configuration failures, missing dependencies, unrelated errors, and empty selections do not establish the intended enforcement. Exercise actual project membership.

| Protection                              | Required evidence                                                                                                                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production structural limits            | Separate boundary/failing cases for all six metrics: file lines, function lines, statements, parameters, complexity, and depth                                                                                        |
| Test profile                            | A long valid test module passes; separate excessive test parameters, complexity, and depth fail                                                                                                                       |
| Closed compatibility provisions         | Each active authorized supplement case passes only in its prescribed scope; additional consumers, copied directives, redirected identities, and stale mappings fail; neighboring genuine violations remain detectable |
| Published lint tools and known limits   | Meaningful valid/invalid controls qualify stock tools; installation and actual CLI/agent/CI/editor paths use the published implementation; accepted complex gaps are recorded, not relabeled as passing               |
| Parameter mutation and readonly members | Direct parameter-property assignment fails; an eligible unchanged private class member requires readonly                                                                                                              |
| Promise ownership                       | Floating Promise and misused async callback fail independently; genuinely owned async work passes                                                                                                                     |
| Promise rejection values                | Forwarding an unknown-type failure unchanged passes; known non-Error, empty, and `any` rejections fail; existing failure identity and behavior are preserved                                                          |
| Test registrations                      | With the Section 8 mapping active, plain top-level and suite registrations pass for each form in use; unawaited `t.test()`, same-named local or other-module calls, and test-body Promises fail                       |
| Callback contracts                      | Async callback misuse fails independently; intentionally ignored ordinary synchronous returns and owned asynchronous work pass their applicable checks                                                                |
| Conditions and validation               | Ordinary unnecessary condition fails; meaningful predicate validation, sequential awaited loop, and escaped control regex are accepted                                                                                |
| Type quality                            | Separate unsafe assertion/propagation, unnecessary generic, and deprecated API cases fail                                                                                                                             |
| TS and JS semantic scope                | An actual type-dependent defect fails in each present language and project context; checked-JS compiler errors also fail                                                                                              |
| Canonical compiler and declarations     | Compiler error reaches acceptance; handwritten declaration error fails even if the main project uses `skipLibCheck`                                                                                                   |
| Test assertions                         | Missing and conditional expectations fail for supported configured runner rules; a real failed test fails the runner                                                                                                  |
| Suppressions                            | Used and unused forbidden directives fail; the same literal text in a string/documentation example does not                                                                                                           |
| Negative type tests                     | Described expected failure passes; unused directive and suppression in runtime code fail                                                                                                                              |
| Formatting                              | Misformatted maintained source fails; repeated formatting and the supported fix/format sequence converge                                                                                                              |
| Configuration and scope                 | Raised limit, disabled required rule, `warn`-severity rule, changed fixed exclusion, broadened allowance, unchecked JS, and omitted maintained source fail integrity verification                                     |
| Category coverage                       | A category-enabled rule outside the explicit list reports its intended violation                                                                                                                                      |

Probe applicable framework/runtime contexts without claiming unsupported coverage. Keep declaration-identity cases as focused native-tool probes. Do not build a custom readonly analysis engine or JSDoc-parity suite. State which native rule or gate supplies each actual protection and record demonstrated limits separately from passing enforcement cases.

### Actual acceptance failures

At adoption and after enforcement changes, use isolated probes to show the real acceptance command fails independently for a parseable non-type-aware lint violation, semantic lint violation, canonical compiler error, formatting error, forbidden suppression, and policy downgrade/coverage reduction. Verify failed tests are not swallowed. Include JavaScript and separate declaration gates where present.

Record commands, intended failures, and actual exit status. Remove disposable probes and run final acceptance on the exact integrated revision. Obtain real remote CI evidence; local execution is not evidence a remote job ran.

### Behavioral and architectural evidence

Preserve/add deterministic tests for affected cancellation, deletion, retries, ordering, concurrency bounds, backpressure, shutdown, authorization, validation, persistence, cleanup, framework synchronization, and test isolation. Keep native verification where mocks cannot establish the contract. Public type-contract changes require relevant consumer tests.

### Adoption sequence

For the first adoption trial in a real repository, complete these phases without an intermediate permission checkpoint. Integration and source refactoring may be interleaved or split into the preparatory PRs above; the target requirements do not change:

1. Inventory and record the pre-change baseline.
2. Qualify the native toolchain and source/project coverage. Exercise a small representative cross-section of the actual repository contracts before applying a broad mechanical transformation.
3. Integrate the fixed configuration, profiles, verifier, and commands.
4. Refactor source and add tests for affected contracts. Inspect resulting types, responsibilities, and callers, not just the remaining diagnostic count.
5. Run conformance and actual acceptance-failure probes.
6. Review source and enforcement separately, resolve findings, and run final acceptance/CI on the integrated revision.

Report a concrete unresolved blocker instead of endlessly rearranging correct code around a tool conflict. Continue independent work. Completion still requires the mandatory gates; a trial does not weaken them.

## 17. Maintainability review

For significant refactors, explain the resulting responsibilities and preserved contracts proportionally:

| Question                                                | Evidence                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| Where does the operation begin and what are its phases? | Readable entrypoint and meaningful operations                    |
| Who owns state/resources?                               | Explicit ownership, lifecycle, cancellation, and cleanup         |
| What does each helper need?                             | Focused inputs and accurate contracts                            |
| How do errors/cancellation propagate?                   | Clear boundaries and relevant tests                              |
| Where would a routine change occur?                     | Localized implementation and test responsibilities               |
| What coupling or exports were introduced?               | Concrete reasons and preserved supported public API              |
| Did behavior or type compatibility change?              | Preserved contracts or a separately demonstrated, tested bug fix |

A passing lint result does not excuse worse architecture. A readable architecture does not excuse failing automated requirements. More helpers, files, wrappers, or types do not independently demonstrate improvement.

### Maintainability acceptance

Correct demonstrated violations of these maintainability requirements even when automated checks pass. New abstractions, dependencies, and extension points must serve a current, concrete repository responsibility. Remove scaffolding introduced or made obsolete by the change after verifying that no required consumers depend on it; preserve unrelated supported code. Tests must establish observable behavior, contracts, and failure paths rather than merely mirror implementation steps or incidental helper structure. Use comments to explain useful contracts, invariants, and decisions without narrating obvious syntax.

## 18. Agent instructions, reporting, and completion

Reconcile existing repository agent instructions with Section 1 and add this summary, substituting the real policy path, revision, and acceptance command. Record the removal of conflicting older exception governance; do not leave contradictory agent instructions or alter unrelated owner constraints:

```text
## Strict engineering policy

Follow the repository's authoritative Strict Oxlint and Oxfmt policy.
Configuration and scripts implement it; they do not redefine it.
Use the existing package manager, runtime, lockfile, and tooling.
Preserve useful work and unrelated changes.

Do not add unauthorized suppressions, exceptions, higher limits, safe-Promise
entries, mutation allowances, or reduced source coverage. Apply only the
predefined profiles, mappings, and closed compatibility provisions. All
maintained handwritten JS and TS must be checked. Preserve useful readonly
contracts and explicit state ownership.

Keep the configured categories, structural limits, semantic safety,
Promise/callback, condition, deprecation, and applicable assertion checks.
Keep the readonly-parameter and strict-void-return rules off; preserve useful
readonly and callback contracts and separate Promise ownership/misuse checks.
Keep the three specified accessibility rules off pending qualified upstream
fixes and owner approval; other accessibility and actual usability remain.
Keep no-base-to-string at error with checkUnknown false; other string,
unsafe-value, and compiler checks remain unchanged.
Choose useful contracts and practical correctness, performance, readability,
and maintenance over valueless type machinery or costly style-only work.
Formatting stays enabled. Future policy changes require owner approval,
including during work in progress; log decisions made on the owner's behalf.
These principles do not authorize weakening or omitting fixed requirements.
Apply only separately supplied owner-authorized compatibility
supplements for this repository; do not create or import new exceptions.
Apply fixed exclusions exactly. Do not filter diagnostics. Use published
lint tools and retire custom forks under Section 12; document accepted
stock limits truthfully.
Readonly/capability views and focused type-only utilities follow Section 6.
Node test registrations follow Section 8; do not await them mechanically.
Lint rules are error or off, never warn; required rules stay error.
Useful JS-to-TS conversion is permitted without reducing checking coverage.

Refactor along real responsibilities. Preserve public contracts, behavior,
security, ordering, cancellation, errors, assertions, and resource lifetime.
Do not evade diagnostics with casts, aliases, unnecessary wrappers, weak tests,
or file reclassification. Internal exports may support sound decomposition.
Do not add speculative scaffolding. Correct demonstrated maintainability
violations even when automated checks pass.

Preparatory PRs may keep current required gates passing while rollout remains
incomplete. Final adoption requires the full standard; do not limit compliance
to changed files.
Run the actual acceptance workflow on the integrated revision. Apply the
policy's verification cadence. Review enforcement and source separately;
use a separate reviewer when available and preserve existing required review.

Report exact commands, results, checked revision, CI evidence, coverage,
maintainability improvements, and real blockers. Do not request waivers
or present blocked/unrun checks as passing. Continue independent work.

Open the PR and address findings. Do not merge, enable auto-merge, bypass
checks, change branch protection, or create external approval infrastructure.
```

### Required report

Report the following, using the repository's actual evidence:

- **Policy and toolchain:** Policy version and content digest; actual published tool versions.
- **Baseline and tooling changes:** Pre-existing failures; retired custom lint machinery; documented published-tool limitations; separately retained application/resource patches and their evidence.
- **Authorized mappings:** Active compatibility records and removal conditions; Section 8 registration-mapping status.
- **Verification:** Exact checked revision; commands and results; semantic and file-profile coverage; probe evidence.
- **Delivery status:** Actual PR and CI status; review limitations; remaining blockers.

Distinguish preparatory PR readiness from complete policy adoption.

Separate configuration alignment, formatting, maintainability improvements, fixture repairs, type-contract changes, tool defects, and runtime bugs. Do not count each removed diagnostic as a bug fix or dismiss useful behavior-preserving refactoring as cosmetic.

### Completion criteria

- Oxlint reports zero errors and zero warnings over prescribed ordinary source under the authorized configuration and exact compatibility provisions; diagnostic inputs satisfy their harness expectations.
- Formatting, canonical compiler/framework and required declaration checks, policy verification, applicable tests, and builds pass.
- Required current-policy conformance and acceptance-failure probes pass; custom-checker-only gaps accepted under Section 12 remain documented as limitations, not falsely passing tests.
- No unauthorized suppressions, allowances, higher limits, fixed-setting changes, or coverage reductions remain.
- Intended behavior, supported public contracts, meaningful tests, and maintainable responsibility/ownership boundaries are preserved; the maintainability acceptance requirements are satisfied.
- Implementation/review findings are addressed and the PR has actual CI evidence for the integrated revision.
- The PR remains unmerged without auto-merge or bypassed checks.

Failing, blocked, skipped, and unrun gates remain visible. The implementing agent does not redefine the standard to finish the task.

## References

These sources explain tool behavior. They do not authorize exceptions beyond this version's explicit provisions. Qualify the installed versions when integrating a repository.

- [Oxlint type-aware linting and compiler reporting](https://oxc.rs/docs/guide/usage/linter/type-aware.html)
- [Oxlint configuration reference](https://oxc.rs/docs/guide/usage/linter/config-file-reference.html), [CLI reference](https://oxc.rs/docs/guide/usage/linter/cli.html), and [versioning](https://oxc.rs/docs/guide/usage/linter/versioning.html)
- [Native readonly-parameter rule](https://oxc.rs/docs/guide/usage/linter/rules/typescript/prefer-readonly-parameter-types.html), [upstream readonly contract semantics](https://typescript-eslint.io/rules/prefer-readonly-parameter-types/), and [readonly class-member rule](https://typescript-eslint.io/rules/prefer-readonly/)
- [TypeScript mapped types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html), [readonly property semantics](https://www.typescriptlang.org/docs/handbook/2/objects.html#readonly-properties), [Cloudflare D1 database binding](https://developers.cloudflare.com/d1/worker-api/d1-database/), and [Workers execution context](https://developers.cloudflare.com/workers/runtime-apis/context/)
- [Awaited-loop rule and legitimate sequencing cases](https://eslint.org/docs/latest/rules/no-await-in-loop)
- [Unnecessary conditions and predicate/control-flow limitations](https://typescript-eslint.io/rules/no-unnecessary-condition/)
- [Oxlint control-character regex rule](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-control-regex.html)
- [TypeScript strict](https://www.typescriptlang.org/tsconfig/strict.html), [checkJs](https://www.typescriptlang.org/tsconfig/checkJs.html), and [JSDoc semantics](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [Exact optional properties](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html), [side-effect import checking](https://www.typescriptlang.org/tsconfig/noUncheckedSideEffectImports.html), [noCheck](https://www.typescriptlang.org/tsconfig/noCheck.html), and [skipLibCheck](https://www.typescriptlang.org/tsconfig/skipLibCheck.html)
- [Oxfmt configuration](https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html)
- [Native event-listener rule](https://oxc.rs/docs/guide/usage/linter/rules/unicorn/prefer-add-event-listener), [MCP transport contracts](https://ts.sdk.modelcontextprotocol.io/v2/api/index/@modelcontextprotocol/server/), and [Cloudflare MCP migration](https://developers.cloudflare.com/agents/model-context-protocol/guides/migrate-to-mcp-sdk-v2/)
- [Node 24 TypeScript execution](https://nodejs.org/docs/latest-v24.x/api/typescript.html)
- [Node test runner registration and subtest semantics](https://nodejs.org/docs/latest-v24.x/api/test.html#testname-options-fn) and [floating-Promise safe-call options](https://typescript-eslint.io/rules/no-floating-promises/)
- [Branded primitive issue 1790](https://github.com/typescript-eslint/typescript-eslint/issues/1790) and [merged narrow fix 11660](https://github.com/typescript-eslint/typescript-eslint/pull/11660)
- [Oxlint native ignore-comment syntax](https://oxc.rs/docs/guide/usage/linter/ignore-comments.html)
- [Wrangler types and the limits of --check](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
- [TypeScript private/protected member compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html#private-and-protected-members-in-classes)

## Historical qualification evidence

The following material is retained from v4.1 for traceability. It is historical evidence, not current policy or newly executed v4.5 verification. Sections 1–18 govern implementation.

References here to v4/v4.1 authority, the readonly-parameter rule and its 27-type allowance list, zero suppressions, and checker-correction authority describe those earlier releases. References to a Section 4 configuration or reference mirror identify that historical release's configuration, not the current v4.5 baseline. Original run dates, versions, observations, limitations, and configuration hashes are preserved; the historical byte hash identifies the original reference file, not its formatter-normalized presentation in r3.

### Version 4.1 clarification

All eight embedded configuration blocks are unchanged from delivered version 4.0. The bundle records both document digests, the zero-configuration-change comparison, and an explicit change record. Version 4 results below remain historical runs against the same native configuration; they are not relabeled as newly executed version 4.1 runs.

This revision clarifies parameter views for mutable resource owners, ordinary type-only recursive utilities, preparatory PR status, explicit governance reconciliation, and the bounded procedure for retaining or porting an existing faithful correction. It adds no type allowance, suppression, relaxed threshold, or reduced source profile. The patch-maintenance authority is explicit; it does not authorize a new checker correction.

Focused qualification establishes observed behavior in the tested cases. It does not establish migration effort, refactoring quality, or the net maintainability benefit across a large repository. Those conclusions require actual source changes, preserved-contract evidence, review, and integrated acceptance results. Diagnostic volume alone establishes neither a false-positive rate nor the quality of the resulting refactor.

### Version 4.1 resource and recursive-type qualification

Five focused final commands exercised the unchanged configuration against published, unmodified `@cloudflare/workers-types@5.20261019.1`, Oxlint 1.89.0, oxlint-tsgolint 7.0.2004, and TypeScript 7.0.2. Exact versions, package integrity, declaration/source hashes, commands, diagnostic identifiers, and locations are included in the bundle. Earlier setup and source-correction attempts are separate exploratory records, not successful enforcement probes.

- Direct `D1Database` and `ExecutionContext` parameters failed the readonly rule. `Readonly<D1Database>` and capability views selecting D1 `prepare` or context `waitUntil` passed the complete native lint configuration and canonical checking with ordinary SDK callers.
- Full `Readonly<ExecutionContext>` and a shallow application view with nested mutable data still failed. The working capability example does not qualify an operation that needs additional members.
- A small type-only recursive view passed for the tested nested application data and preserved generic, overloaded, and explicit-`this` callable signatures. Canonical checking accepted mutable callers and rejected a nested write and array mutation with TS2540 and TS2339.
- An unconditional mapped type erased a call signature, producing TS2349. The small callable-only utility did not preserve a constructor signature, producing TS2351. Callable return data remained unchanged, and a callable with mutable own state still failed native readonly lint.
- A recursively mapped `Map` retained `set` and passed lint and compiler checking. This is a demonstrated limitation, not an approved readonly collection contract or proof that a utility named `DeepReadonly` prevents mutation.

The five-command set was also replayed from the bundled lab after a clean lockfile installation. All expected exit statuses and exact diagnostic identifiers/locations matched; the replay is recorded separately.

Canonical checking included the published declaration closure with `skipLibCheck: false`. No Cloudflare runtime or database was accessed. Published package declarations are not a substitute for a target Worker's actual compatibility date, flags, bindings, and generated declarations. These five commands establish the listed observations; they do not qualify all SDKs, every possible mapped-type feature, or a real repository's acceptance workflow. The lab's small utility is a diagnostic example for its tested domain, not mandatory production code.

### Version 4 evidence

Version 4 restores one common Oxlint rule relative to version 3: `typescript/prefer-readonly-parameter-types` is again an error with its original exact options and closed 27-type library allowance list. The other 89 root rule entries, categories, root options, override profiles, compiler fragments, framework additions, formatter configuration, and command examples are unchanged. The bundle's machine-readable policy diff verifies this comparison.

The exact version 4 native configuration was exercised with these published, unmodified binaries on October 19, 2026:

| Component       | Executed version                                                       |
| --------------- | ---------------------------------------------------------------------- |
| Node.js         | 24.19.0                                                                |
| npm             | 11.9.0                                                                 |
| Oxlint          | 1.89.0                                                                 |
| oxlint-tsgolint | 7.0.2004                                                               |
| Oxfmt           | 0.74.0, unchanged formatter configuration and historical qualification |
| TypeScript      | 7.0.2                                                                  |

These are a tested reference combination, not a mandatory replacement of every repository runtime or framework. Apply the qualification and compatibility requirements in Section 12.

Sixteen focused version 4 commands produced their intended results, including deliberate diagnostic failures and observations of native limitations:

- Accurate readonly record, array, and map views passed native lint; ordinary mutable object, array, and Map callers passed canonical TypeScript without casts or runtime wrappers.
- Clean TypeScript/checked-JavaScript examples and owned Promise constructor, concise-callback, and async/await forms passed. Existing semantic Promise/callback violations remained detectable under the restored baseline.
- Explicit mutable application records, writable ReadonlyMap method properties, an unallowed complex native type, and an unrelated local Request declaration failed the restored readonly rule.
- Explicitly mutable JSDoc parameters failed the released readonly rule with `ignoreInferredTypes: true`; their accurate JSDoc Readonly counterparts and mutable callers passed lint and canonical checking.
- An ordinary native-handle envelope with mutable application data failed. An intersection of allowed Request with mutable application data passed, exposing a native allowance limitation.
- Authored JSDoc any safely returned as unknown remained undiagnosed by the native syntax rule. Unsafe member access, invocation, and typed return of that any were rejected by the corresponding semantic rules.

The exact `reference/oxlint.json` mirror of Section 4 has SHA-256:

```text
13d5a2ecbb5cd6745ddd3955deb25bf6d9a74a68caa8cbac3611c41bba7a510b
```

The earlier version 3 record remains historical evidence: 51 exploratory/verification commands and 12 exact-version-3 configuration checks covered structural boundaries, profile behavior, semantic/compiler failures, negative type assertions, declarations, and formatting. Those runs are not relabeled as version 4 runs. The restored-rule checks above are the new version 4 evidence; each repository still runs the full applicable adoption conformance suite.

### Correction to the version 3 readonly decision

Rejecting one ReadonlyMap representation did not establish that the native rule was defective or impractical. Under the configured method treatment, its writable method properties explain the finding. A standard `Readonly<ReadonlyMap<string, Readonly<Item>>>` view passed the rule and accepted mutable callers in the new probes. This is a meaningful compile-time contract, not an artificial runtime wrapper.

The earlier global-disable rationale was too broad. Version 4 restores useful automated enforcement without reinstating the custom augmentation/envelope or JSDoc engines from earlier drafts. Diagnostic counts do not establish false-positive rates or authorize policy changes. Complex external contracts can still be genuine blockers, and native allowance limitations remain explicit.

### Reproduced callback-rule limitation

A separate isolated rule investigation used an owned local object with `onmessage`, `onclose`, and `onerror` callback slots and no `addEventListener` API. Strict canonical TypeScript and runtime ordering checks passed, but released Oxlint 1.89.0 reported three `unicorn/prefer-add-event-listener` findings. A genuine EventTarget/addEventListener counterpart passed. This lab records six commands, including a runtime version check, and isolates this rule rather than claiming full-policy acceptance.

This demonstrates a receiver/API mismatch in the released heuristic. It does not prove that the reported repository sites have no sound compliant implementation, and it does not disable the rule or authorize new patches, exemptions, fabricated APIs, or syntax evasion. The affected repository must establish the actual receiver contract and lifecycle; an unavoidable conflict remains blocked.

### Delivery and verification limits

Within the optional bundle, `reference/oxlint.json` mirrors Section 4. Other qualification configurations are historical comparisons or isolated diagnostic inputs, not alternative standards. The bundle includes the exact references, dependency lockfile, valid/invalid fixtures, native results, a machine-readable version diff, and replay instructions. Keep diagnostic labs outside application source. This complete Markdown document remains sufficient to begin adoption without the bundle.

These tests do not constitute acceptance of a target repository. A reference lab does not inspect or qualify a target repository's source branches, local patches, diagnostic inventory, generated declaration closure, actual SDK sites, or CI. Framework/test-runner integration, repository-specific declaration-origin mappings, policy verification, editor integration, application behavior, and actual CI remain repository adoption requirements. Native-tool qualification does not promise that every correct external contract is compatible with every fixed heuristic.

## Changelog

This record describes how the policy evolved. It does not override the current requirements in Sections 1–18 or turn historical observations into current qualification evidence.

### Version 4.5 — 2026-10-22

Preceding published v4.4 document SHA-256: `6364775005c5041c21a78a5aedd799c4aa7764db79a8c4d72e5334a7a4ffbd82`. Preserve that release and its evidence.

By explicit owner decision, set only `typescript/prefer-promise-reject-errors.allowThrowingUnknown` to `true` and preserve existing error behavior. The rule remains at `error`; `allowEmptyReject` and `allowThrowingAny` remain `false`. Known non-Error values remain checked, while unknown-type rejection values no longer are. Forwarding an existing failure need not introduce wrappers or Promise machinery. `typescript/only-throw-error`, every other embedded setting, all structural limits, formatting, coverage, and acceptance/review requirements are unchanged.

The root configuration changes one boolean; the other seven embedded JSON blocks and both TypeScript examples are unchanged from v4.4. Configuration comparison and document formatting do not establish repository or runtime acceptance. Use the existing published Oxfmt 0.74.0 and embedded formatter configuration for this release; record relevant native-tool qualification and its limits separately from repository adoption. This documentation-only formatter selection changes no repository dependency or embedded setting; v4.4's 0.72.0 receipt remains historical.

### Version 4.4 — 2026-10-21

Preceding published r6 document SHA-256: `7ecf0febc8fae92454e6bbad1e8363b9c6449e4cf6dbd64d4a0c3e3c81fe8030`. The intermediate r7/v4.3 drafts were not published or adopted. New releases use ordinary version numbers, not r-suffixed revisions; historical release IDs and evidence remain unchanged.

By explicit owner decision:

- Keep `typescript/no-base-to-string` at `error` with only `checkUnknown: false`. Other string, unsafe-value, compiler, and real-boundary validation checks stay active.
- Set `typescript/strict-void-return` to `off`. This intentionally removes its extra ignored-result checks, including genuine cases it detected. Ignoring an ordinary synchronous return value is not inherently a bug; separate Promise ownership and misuse checks remain required.
- Temporarily set `jsx-a11y/no-noninteractive-element-interactions`, `jsx-a11y/no-noninteractive-tabindex`, and `jsx-a11y/prefer-tag-over-role` explicitly to `off`. Other applicable accessibility checks and actual keyboard/screen-reader usability requirements remain. Section 10 defines re-enablement conditions.
- Use published lint tools, not custom stricter semantic/Rust linter forks. Keep `no-unsafe-return`, `no-floating-promises` including tests, `no-misused-promises`, and `no-deprecated` enabled. Record the complex-case limits of published tools truthfully rather than requiring bespoke checker coverage. Section 12 governs qualification and retirement.
- Retain every structural limit, formatting, full source/compiler/declaration coverage, and existing review/acceptance gate. All effective lint severities remain error or off. No further rule change is implied.
- Choose practical correctness, performance, readability, and maintenance value over costly style-only work or valueless type machinery. Only the owner may approve future policy changes, including during work in progress. Log decisions made on the owner's behalf; these principles do not authorize weakening or omitting fixed requirements.

The root configuration delta from r6 is exactly one boolean, one existing rule set to off, and three added off entries: 93 root rules in total. The other seven embedded JSON blocks are parsed-identical to r6 and the v4.1 baseline. Configuration comparison establishes preservation, not tool execution or repository acceptance.

Release formatting uses the repository's existing Oxfmt 0.72.0 with the embedded formatter configuration; earlier 0.74.0 references are historical. Verify a non-writing check and unchanged second formatting pass before calculating delivery digests. Formatting this release is not repository acceptance.

A separate 2026-10-21 macOS-arm64 stock cross-section used Oxlint 1.89.0 and registry-integrity-verified oxlint-tsgolint 7.0.2004. Valid generic/TypeBox unsafe-return cases passed and six ordinary unsafe controls failed, but three wrong generic cases and two wrong TypeBox cases were missed. The TypeBox input was 1.4.2-tars.1; no application-library patch retirement follows. Package-qualified local `nodeTest`/`nodeIt`/`nodeDescribe`/`nodeSuite` and shorthand names passed normal registrations and rejected five core floating-work failures. This was not all historical alias tests or repository/editor/CI qualification. Stock also reproduced six strict-void false positives, including Node promisify, and seven genuine negatives; the independent misused-Promise check still caught async callback misuse. These observations inform the approved trade-off; they do not claim complete detection or target-repository acceptance.

**Editorial finalization:** At the owner's explicit request, the document was polished in place without changing version 4.4, its release ID, any policy decision, or any embedded configuration. The edit clarified terminology and instructions, added navigation and subheadings, and moved the changelog to the end. The pre-polish v4.4 document had SHA-256 `388da1b073ebad5fb88d4126a53d9eb3f515753c277537da85df2f91064ed999`; that digest identifies the earlier presentation, not the final polished bytes.

### Revision r6

Preceding r5 document SHA-256: `85a86654f3bfd8e43968f0b29ad2b6a1e15cce11025a41eb35bfb7813690160a`.

- By owner decision, turn `typescript/prefer-readonly-parameter-types` off and make it a fixed exclusion. The root entry stays as `off`, so the baseline still lists 90 root rules. Its options, its 27-name standard-library allowance list, and the Cloudflare `ExecutionContext` mapping retire with it.
- The rule cost more than it protected. With `treatMethodsAsReadonly: false` it reports ordinary objects with methods, such as database clients and byte arrays, so adoption meant thousands of findings to fix. Its stock checker also misreported readonly branded primitives nested in unions, collections, and objects, which required a custom checker build.
- `no-param-reassign` with `props: true` still rejects parameter reassignment and direct property writes, deletes, and updates. No rule now requires readonly input types, so the compiler rejects mutating calls such as `push`, `sort`, or `set` on an input only when its type is written readonly. Even with the rule, mutation through aliases, methods, and inference was not fully covered.
- Keep accurate readonly types already written; do not revert them in bulk. Readonly input types remain a good choice where accurate; they are not required. Remove suppressions, supplement provisions, probes, and configuration that exist only for this rule. Retire checker corrections and build machinery that serve only this rule under Section 12.
- Align the kickoff prompt and Sections 1, 5, 6, 12, 16, and 18 with that change. Section 4 changes only the rule entry.
- Release preparation on 2026-10-20 measured one adopting repository with the r5 rule options: stock oxlint-tsgolint 7.0.2004 reported 7,149 findings for this rule, and a nested-brand correction removed 2,379 of them and added none. Stock Oxlint 1.89.0 places the rule in the `pedantic` category, which the baseline keeps off. Oxlint 1.89.0 `no-param-reassign` with the baseline options reported a direct write, a nested write, a delete, an increment, and a reassignment, and did not report `push`, `sort`, `set`, `Object.assign`, or a write through an alias. These observations are not repository qualification.

R6 changes one embedded rule entry and no other rule, option, profile, structural threshold, or existing fixed exclusion, and creates no agent-controlled exception category. The other seven embedded JSON blocks remain parsed-identical to r5.

### Revision r5

Preceding r4 document SHA-256: `f9131378eb5570f01f085feb43d3a6b42a8365a79abf9379767e588b98d2c8ca`.

- Require every effective lint rule severity to be `error` or `off`. Turn off each `warn` value on a rule this policy does not require; a required rule keeps `error`. A warning-level rule still costs lint time, and the retained `denyWarnings` already makes any warning fail acceptance, so a rule worth running is an error.
- Keep `denyWarnings: true` and `--deny-warnings` as the backstop for any warning that still appears.
- Align Sections 4, 5, 11, 16, and 18 with that requirement.
- Release preparation on 2026-10-20 found no `warn` value in the eight embedded blocks or in the effective root configurations of three adopting repositories. Stock Oxlint 1.87.0 and 1.89.0 assigned `warn` to their correctness rules when a configuration omitted `categories`. These observations are not repository qualification.

R5 changes no embedded configuration block, required rule or its severity, structural threshold, or fixed exclusion and creates no agent-controlled exception category. All eight embedded JSON blocks remain parsed-identical to r4.

### Revision r4

Preceding r3 document SHA-256: `0edc05b515092d3d33165b1fe9946acb5bbc8ce702401d98d61194b6f02e9747`.

- Define one origin-qualified `node:test` registration mapping for the test profile in Section 8, with entries spelled as declaration names or distinct local import names. It replaces r3's blanket prohibition on registration allowances, applies only with a checker that passes the stated probes, and grants nothing to subtests, other test runners, or Promises created inside test bodies.
- Keep the embedded safe-call and safe-Promise lists empty. The mapping is a defined repository mapping applied through the test-profile override; production and every other profile receive none.
- Align the allowed mappings, fixed decisions, integrity failures, conformance probes, agent summary, and report with that mapping.
- Release preparation on 2026-10-20 used stock Oxlint 1.89.0, oxlint-tsgolint 7.0.2004, and `@types/node` 24.19.1. With origin-qualified declaration-name entries, the checker also accepted an unawaited `t.test()` subtest, so that spelling does not qualify on that release. With origin-qualified entries for the distinct local import names `nodeTest`, `nodeIt`, `nodeDescribe`, and `nodeSuite` plus `skip`, `todo`, and `only`, it accepted those aliased registrations and shorthands and rejected an unawaited `t.test()` subtest, a same-named local function, the same name imported from another module, and floating Promises in a test body and at module level. Both spellings accepted a module-level registration call inside a running test, the native limitation in Section 8. These observations are not repository qualification.

R4 changes no embedded configuration block, rule severity, structural threshold, or fixed exclusion and creates no agent-controlled exception category. All eight embedded JSON blocks remain parsed-identical to r3.

### Revision r3

Preceding r2 document SHA-256: `285c879e96d7ae90db2ef646d0b12aac5068bfb22d8c610d98b209b54bcab04e`.

- Keep the shared guide project-neutral. Move existing project-specific compatibility decisions into a separately scoped supplement; unrelated repositories do not inherit them.
- Preserve all eight v4.1 configuration blocks, full checked-source coverage, compiler/declaration protections, fixed exclusions, structural limits, and verification cadence.
- Format the release with Oxfmt 0.74.0 and the embedded formatter configuration before final digest calculation. Keep formatter coverage of the adopted policy file.
- Preserve runtime-required exports and generated references while enforcing the exact scope of any separately authorized integration exception.
- Accept compiler-based declaration-origin evidence with actual resolution records and negative probes. Do not require a custom semantic analyzer.
- Distinguish supported runtime/module variants from distinct source sites; their authorization comes from the matching supplement.
- Distinguish native input-freshness checks from generated-body integrity, applying the relevant generator only in repositories that use it.

R3 changes formatting bytes but no embedded configuration settings or structural thresholds and creates no general agent-controlled exception category. Formatting verification of these documents is not repository adoption or CI evidence.

### Baseline and withdrawn draft

Version 4.5 carries forward v4.4, derives from the v4.1 baseline, and supersedes v4.4, v4.2-r6, v4.2-r5, v4.2-r4, v4.2-r3, v4.2-r2, and the initial v4.2 draft.

- **Authoritative v4.1 source:** `strict-oxlint-oxfmt-policy-v4.1(1).md`, SHA-256 `4f0ef4e7fcaa7ad3f141e25c4db58558ed457359315d4180834f6efacec9ee05`.
- **Withdrawn initial v4.2 draft:** SHA-256 `8cbcceb7024532dd4da2e6d90e0f281466082a42c5f851aae4c5db3d976e82c3`. That draft used older conversation text rather than the authoritative v4.1 baseline and remains withdrawn.
