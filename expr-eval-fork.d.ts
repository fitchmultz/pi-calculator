// Re-exporting keeps this file a module, so the declaration augments the package's typings.
import type { Parser } from "expr-eval-fork";

export type { Parser };

declare module "expr-eval-fork" {
	interface Parser {
		binaryOps: Record<string, (left: unknown, right: unknown) => unknown>;
		ternaryOps: Record<
			string,
			(condition: unknown, consequent: unknown, alternate: unknown) => unknown
		>;
	}
}
