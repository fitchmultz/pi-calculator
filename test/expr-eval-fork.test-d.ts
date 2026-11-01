import { Parser } from "expr-eval-fork";

// Consumer check for the handwritten augmentation: the parser exposes the operator
// tables eval.ts assigns, with the signatures the augmentation declares.
const parser = new Parser();
parser.binaryOps = { check: (left: unknown, right: unknown) => `${String(left)} ${String(right)}` };
parser.ternaryOps = { pick: (a: unknown) => a };

// @ts-expect-error - the operator table holds callables, so an operator name cannot map to a string.
parser.binaryOps = { nope: "missing" };
