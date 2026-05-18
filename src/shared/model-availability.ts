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
	log("[fuzzyMatchModel] called", { target, availableCount: available.size, providers })

	if (available.size === 0) {
		log("[fuzzyMatchModel] empty available set")
		return null
	}

	const targetNormalized = normalizeModelName(target)

	let candidates = Array.from(available)
	if (providers && providers.length > 0) {
		const providerSet = new Set(providers)
		candidates = candidates.filter((model) => {
			const [provider] = model.split("/")
			return providerSet.has(provider)
		})
		log("[fuzzyMatchModel] filtered by providers", { candidateCount: candidates.length, candidates: candidates.slice(0, 10) })
	}

	if (candidates.length === 0) {
		log("[fuzzyMatchModel] no candidates after filter")
		return null
	}

	const matches = candidates.filter((model) =>
		normalizeModelName(model).includes(targetNormalized),
	)

	log("[fuzzyMatchModel] substring matches", { targetNormalized, matchCount: matches.length, matches })

	if (matches.length === 0) {
		log("[fuzzyMatchModel] WARNING: no match found", { target, availableCount: available.size, providers })
		return null
	}

	const exactMatch = matches.find((model) => normalizeModelName(model) === targetNormalized)
	if (exactMatch) {
		log("[fuzzyMatchModel] exact match found", { exactMatch })
		return exactMatch
	}

	const exactModelIdMatches = matches.filter((model) => {
		const modelId = model.split("/").slice(1).join("/")
		return normalizeModelName(modelId) === targetNormalized
	})
	if (exactModelIdMatches.length > 0) {
		const result = exactModelIdMatches.reduce((shortest, current) =>
			current.length < shortest.length ? current : shortest,
		)
		log("[fuzzyMatchModel] exact model ID match found", { result, candidateCount: exactModelIdMatches.length })
		return result
	}

	const result = matches.reduce((shortest, current) =>
		current.length < shortest.length ? current : shortest,
	)
	log("[fuzzyMatchModel] shortest match", { result })
	return result
}

export function isModelAvailable(
	targetModel: string,
	availableModels: Set<string>,
): boolean {
	return fuzzyMatchModel(targetModel, availableModels) !== null
}

export async function fetchAvailableModels(client?: any): Promise<Set<string>> {
	const cache = connectedProvidersCache.readProviderModelsCache()
	const connectedSet = new Set(cache?.connected ?? [])
	const modelSet = new Set<string>()

	log("[fetchAvailableModels] CALLED", {
		hasCache: cache !== null,
		connectedCount: connectedSet.size,
	})

	// Level 1: provider-models cache (self-contained: has both connected + models)
	if (cache && Object.keys(cache.models).length > 0) {
		log("[fetchAvailableModels] using provider-models cache (whitelist-filtered)")

		const modelsByProvider = cache.models as Record<string, Array<string | { id?: string }>>
		for (const [providerId, modelIds] of Object.entries(modelsByProvider)) {
			if (!connectedSet.has(providerId)) continue
			for (const modelItem of modelIds) {
				const modelId = typeof modelItem === 'string'
					? modelItem
					: modelItem?.id
				if (modelId) {
					modelSet.add(`${providerId}/${modelId}`)
				}
			}
		}

		log("[fetchAvailableModels] parsed from provider-models cache", {
			count: modelSet.size,
			connectedProviders: Array.from(connectedSet).slice(0, 5),
		})

		if (modelSet.size > 0) return modelSet
		log("[fetchAvailableModels] provider-models cache produced no models for connected providers, falling back to models.json")
	} else {
		log("[fetchAvailableModels] provider-models cache not found or empty, falling back to models.json")
	}

	// Level 2: models.json legacy cache (from upstream OpenCode CLI)
	const cacheFile = join(getOpenCodeCacheDir(), "models.json")
	if (existsSync(cacheFile)) {
		try {
			const content = readFileSync(cacheFile, "utf-8")
			const data = JSON.parse(content) as Record<string, { id?: string; models?: Record<string, { id?: string }> }>

			const providerIds = Object.keys(data)
			log("[fetchAvailableModels] providers found in models.json", { count: providerIds.length, providers: providerIds.slice(0, 10) })

			for (const providerId of providerIds) {
				if (connectedSet.size > 0 && !connectedSet.has(providerId)) continue

				const provider = data[providerId]
				const models = provider?.models
				if (!models || typeof models !== "object") continue

				for (const modelKey of Object.keys(models)) {
					modelSet.add(`${providerId}/${modelKey}`)
				}
			}

			log("[fetchAvailableModels] parsed models from models.json", {
				count: modelSet.size,
				connectedProviders: Array.from(connectedSet).slice(0, 5),
			})

			if (modelSet.size > 0) return modelSet
		} catch (err) {
			log("[fetchAvailableModels] models.json error", { error: String(err) })
		}
	} else {
		log("[fetchAvailableModels] models.json cache file not found, falling back to client")
	}

	// Level 3: live client API
	if (client?.model?.list) {
		try {
			const modelsResult = await client.model.list()
			const models = normalizeSDKResponse(modelsResult, [] as Array<{ provider?: string; id?: string }>)

			for (const model of models) {
				if (!model?.provider || !model?.id) continue
				if (connectedSet.size > 0 && !connectedSet.has(model.provider)) continue
				modelSet.add(`${model.provider}/${model.id}`)
			}

			log("[fetchAvailableModels] fetched models from client", {
				count: modelSet.size,
				connectedProviders: Array.from(connectedSet).slice(0, 5),
			})
		} catch (err) {
			log("[fetchAvailableModels] client.model.list error", { error: String(err) })
		}
	}

	return modelSet
}

export function __resetModelCache(): void {}

export function isModelCacheAvailable(): boolean {
	if (connectedProvidersCache.hasProviderModelsCache()) {
		return true
	}
	const cacheFile = join(getOpenCodeCacheDir(), "models.json")
	return existsSync(cacheFile)
}
