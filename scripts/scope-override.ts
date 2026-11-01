// Single source of truth for the generated lint scope override: maintained sources that no
// compiler project covers keep syntactic checks only, so the plugins that need type
// information are switched off for exactly those files. Membership is supplied by the caller
// so the writer and the verifier can compute it the same way they always have.
const TYPE_AWARE_PLUGINS = new Set(["promise", "typescript"]);

export interface GeneratedOverride {
	files: string[];
	rules: Record<string, string>;
}

export function generatedOverride(
	baselineRules: Record<string, unknown>,
	uncoveredFiles: readonly string[],
): GeneratedOverride | null {
	const uncovered = [...uncoveredFiles].sort();
	if (uncovered.length === 0) {
		return null;
	}
	const rules: Record<string, string> = {};
	for (const rule of Object.keys(baselineRules).sort()) {
		const plugin = rule.split("/")[0];
		if (plugin !== undefined && TYPE_AWARE_PLUGINS.has(plugin)) {
			rules[rule] = "off";
		}
	}
	if (Object.keys(rules).length === 0) {
		throw new Error(
			"The baseline declares no type-aware rules to switch off for uncovered sources.",
		);
	}
	return { files: uncovered, rules };
}
