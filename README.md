# pi-calculator

A deterministic, 40-digit precision calculator tool for [Pi](https://github.com/earendil-works/pi).

## Install

```sh
pi install git:github.com/fitchmultz/pi-calculator
```

The package adds a `calculator` tool for arithmetic, powers, roots, logarithms, trigonometry, percentages, factorials up to 1000, and basic statistics.

Examples:

```text
(12.5 * 1.0825) ^ 3
sin(PI/4)
percent(15, 200)
mean([2,4,6,8])
```

## Verification

```sh
npm run check
```

Pi extensions execute with full system access. Review the source before installing.
