import { normalizeModel } from "./model-normalization"

export type ModelResolutionInput = {
	userModel?: string
	inheritedModel?: string
	systemDefault?: string
}

export type ModelSource =
	| "override"
	| "category-default"
	| "provider-fallback"
	| "system-default"


export function resolveModel(input: ModelResolutionInput): string | undefined {
	return (
		normalizeModel(input.userModel) ??
		normalizeModel(input.inheritedModel) ??
		input.systemDefault
	)
}

export function normalizeFallbackModels(models: string | string[] | undefined): string[] | undefined {
	if (!models) return undefined
	if (typeof models === "string") return [models]
	return models
}
