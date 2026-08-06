import "expr-eval-fork";

declare module "expr-eval-fork" {
	interface Parser {
		binaryOps: Record<string, (left: unknown, right: unknown) => unknown>;
	}
}
