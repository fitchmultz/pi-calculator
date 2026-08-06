# pi-calculator

A deterministic, 40-digit precision calculator tool for [Pi](https://github.com/earendil-works/pi).

Requires Pi 0.84.0 or later.

## Install

```sh
pi install git:github.com/fitchmultz/pi-calculator
```

The package adds a `calculator` tool for arithmetic, powers, roots, logarithms, trigonometry, percentages, factorials (operands 0 through 1000, sharing a 1000-step budget per expression), and basic statistics.

Examples:

```text
(12.5 * 1.0825) ^ 3
sin(PI/4)
percent(15, 200)
mean([2,4,6,8])
```

## Verification

```sh
npm install
npm run verify
```

Pi extensions execute with full system access. Review the source before installing.
