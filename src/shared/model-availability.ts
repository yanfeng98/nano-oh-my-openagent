import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { log } from "./logger"
import { getOpenCodeCacheDir } from "./data-path"
import * as connectedProvidersCache from "./connected-providers-cache"
import { normalizeSDKResponse } from "./normalize-sdk-response"

function normalizeModelName(name: string): string {
	return name
		.toLowerCase()
		.replace(/claude-(opus|sonnet|haiku)-(\d+)[.-](\d+)/g, "claude-$1-$2.$3")
}

export function fuzzyMatchModel(
	target: string,
	available: Set<string>,
	providers?: string[],
): string | null {
	if (available.size === 0) return null

	const targetNormalized = normalizeModelName(target)

	let candidates = Array.from(available)
	if (providers && providers.length > 0) {
		const providerSet = new Set(providers)
		candidates = candidates.filter((model) => providerSet.has(model.split("/")[0]))
	}
	if (candidates.length === 0) return null

	const matches = candidates.filter((model) =>
		normalizeModelName(model).includes(targetNormalized),
	)
	if (matches.length === 0) {
		log("[fuzzyMatchModel] no match", { target, providers })
		return null
	}

	const exactMatch = matches.find((model) => normalizeModelName(model) === targetNormalized)
	if (exactMatch) return exactMatch

	const exactModelIdMatches = matches.filter((model) => {
		const modelId = model.split("/").slice(1).join("/")
		return normalizeModelName(modelId) === targetNormalized
	})
	if (exactModelIdMatches.length > 0) {
		return exactModelIdMatches.reduce((a, b) => (a.length < b.length ? a : b))
	}

	return matches.reduce((a, b) => (a.length < b.length ? a : b))
}

function collectModels(
	providerModels: Record<string, string[]>,
	connectedSet: Set<string>,
): Set<string> {
	const modelSet = new Set<string>()
	for (const [providerId, modelIds] of Object.entries(providerModels)) {
		if (connectedSet.size > 0 && !connectedSet.has(providerId)) continue
		for (const modelId of modelIds) {
			modelSet.add(`${providerId}/${modelId}`)
		}
	}
	return modelSet
}

export async function fetchAvailableModels(client?: any): Promise<Set<string>> {
	const cache = connectedProvidersCache.readProviderModelsCache()
	const connectedSet = new Set(cache?.connected ?? [])

	log("[fetchAvailableModels]", { hasCache: cache !== null, connectedCount: connectedSet.size })

	// Level 1: provider-models cache
	if (cache && Object.keys(cache.models).length > 0) {
		const providerModels: Record<string, string[]> = {}
		for (const [providerId, modelIds] of Object.entries(cache.models)) {
			providerModels[providerId] = (modelIds as Array<string | { id?: string }>)
				.map((item) => (typeof item === "string" ? item : item?.id) ?? "")
				.filter(Boolean)
		}
		const modelSet = collectModels(providerModels, connectedSet)
		if (modelSet.size > 0) {
			log("[fetchAvailableModels] using provider-models cache", { count: modelSet.size })
			return modelSet
		}
	}

	// Level 2: models.json legacy cache
	const cacheFile = join(getOpenCodeCacheDir(), "models.json")
	if (existsSync(cacheFile)) {
		try {
			const data = JSON.parse(readFileSync(cacheFile, "utf-8")) as Record<
				string,
				{ models?: Record<string, unknown> }
			>
			const providerModels: Record<string, string[]> = {}
			for (const [providerId, provider] of Object.entries(data)) {
				const models = provider?.models
				if (models && typeof models === "object") {
					providerModels[providerId] = Object.keys(models)
				}
			}
			const modelSet = collectModels(providerModels, connectedSet)
			if (modelSet.size > 0) {
				log("[fetchAvailableModels] using models.json", { count: modelSet.size })
				return modelSet
			}
		} catch (err) {
			log("[fetchAvailableModels] models.json error", { error: String(err) })
		}
	}

	// Level 3: live client API
	if (client?.model?.list) {
		try {
			const modelsResult = await client.model.list()
			const models = normalizeSDKResponse(modelsResult, [] as Array<{ provider?: string; id?: string }>)
			const providerModels: Record<string, string[]> = {}
			for (const model of models) {
				if (!model?.provider || !model?.id) continue
				;(providerModels[model.provider] ??= []).push(model.id)
			}
			const modelSet = collectModels(providerModels, connectedSet)
			log("[fetchAvailableModels] using client API", { count: modelSet.size })
			return modelSet
		} catch (err) {
			log("[fetchAvailableModels] client.model.list error", { error: String(err) })
		}
	}

	return new Set()
}

export function isModelCacheAvailable(): boolean {
	if (connectedProvidersCache.hasProviderModelsCache()) return true
	return existsSync(join(getOpenCodeCacheDir(), "models.json"))
}
