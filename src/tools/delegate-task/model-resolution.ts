// ── model-string-parser ─────────────────────────────────────────

const KNOWN_VARIANTS = new Set([
  "low", "medium", "high", "xhigh", "max", "none", "auto", "thinking",
])

function parseVariantFromModelID(rawModelID: string): { modelID: string; variant?: string } {
  const trimmedModelID = rawModelID.trim()
  if (!trimmedModelID) return { modelID: "" }

  const parenthesizedVariant = trimmedModelID.match(/^(.*)\(([^()]+)\)\s*$/)
  if (parenthesizedVariant) {
    const modelID = parenthesizedVariant[1]?.trim() ?? ""
    const variant = parenthesizedVariant[2]?.trim()
    return variant ? { modelID, variant } : { modelID }
  }

  const spaceVariant = trimmedModelID.match(/^(.*\S)\s+([a-z][a-z0-9_-]*)$/i)
  if (spaceVariant) {
    const modelID = spaceVariant[1]?.trim() ?? ""
    const variant = spaceVariant[2]?.trim().toLowerCase()
    if (variant && KNOWN_VARIANTS.has(variant)) {
      return { modelID, variant }
    }
  }

  return { modelID: trimmedModelID }
}

export function parseModelString(
  model: string,
): { providerID: string; modelID: string; variant?: string } | undefined {
  const trimmedModel = model.trim()
  if (!trimmedModel) return undefined

  const parts = trimmedModel.split("/")
  if (parts.length < 2) return undefined

  const providerID = parts[0]?.trim()
  const rawModelID = parts.slice(1).join("/").trim()
  if (!providerID || !rawModelID) return undefined

  const parsedModel = parseVariantFromModelID(rawModelID)
  if (!parsedModel.modelID) return undefined

  return parsedModel.variant
    ? { providerID, modelID: parsedModel.modelID, variant: parsedModel.variant }
    : { providerID, modelID: parsedModel.modelID }
}

// ── available-models ────────────────────────────────────────────

import type { OpencodeClient } from "./types"
import { log } from "../../shared/logger"
import { readConnectedProvidersCache, readProviderModelsCache } from "../../shared/connected-providers-cache"

function addFromProviderModels(
  out: Set<string>,
  providerID: string,
  models: Array<string | { id?: string }> | undefined
): void {
  if (!models) return
  for (const item of models) {
    const modelID = typeof item === "string" ? item : item?.id
    if (!modelID) continue
    out.add(`${providerID}/${modelID}`)
  }
}

export async function getAvailableModelsForDelegateTask(client: OpencodeClient): Promise<Set<string>> {
  const providerModelsCache = readProviderModelsCache()

  if (providerModelsCache?.models) {
    const connected = new Set(providerModelsCache.connected)
    const out = new Set<string>()
    for (const [providerID, models] of Object.entries(providerModelsCache.models)) {
      if (!connected.has(providerID)) continue
      addFromProviderModels(out, providerID, models as Array<string | { id?: string }> | undefined)
    }
    return out
  }

  const connectedProviders = readConnectedProvidersCache()
  if (!connectedProviders || connectedProviders.length === 0) return new Set()

  const modelList = (client as unknown as { model?: { list?: () => Promise<unknown> } })
    ?.model
    ?.list
  if (!modelList) return new Set()

  try {
    const result = await modelList()
    const rows = Array.isArray(result)
      ? result
      : ((result as { data?: unknown }).data as Array<{ provider?: string; id?: string }> | undefined) ?? []

    const connected = new Set(connectedProviders)
    const out = new Set<string>()
    for (const row of rows) {
      if (!row?.provider || !row?.id) continue
      if (!connected.has(row.provider)) continue
      out.add(`${row.provider}/${row.id}`)
    }
    return out
  } catch (err) {
    log("[delegate-task] client.model.list failed", { error: String(err) })
    return new Set()
  }
}

// ── model-selection ─────────────────────────────────────────────

import type { FallbackEntry } from "../../shared/model-requirements"
import { normalizeModel } from "../../shared/model-normalization"
import { fuzzyMatchModel } from "../../shared/model-availability"
import { transformModelForProvider } from "../../shared/provider-model-id-transform"
import { hasProviderModelsCache } from "../../shared/connected-providers-cache"

function isExplicitHighModel(model: string): boolean {
  return /(?:^|\/)[^/]+-high$/.test(model)
}

function getExplicitHighBaseModel(model: string): string | null {
  return isExplicitHighModel(model) ? model.replace(/-high$/, "") : null
}

export function resolveModelForDelegateTask(input: {
  userModel?: string
  userFallbackModels?: string[]
  categoryDefaultModel?: string
  fallbackChain?: FallbackEntry[]
  availableModels: Set<string>
  systemDefaultModel?: string
}): { model: string; variant?: string } | undefined {
  const userModel = normalizeModel(input.userModel)
  if (userModel) return { model: userModel }

  if (input.availableModels.size === 0 && !hasProviderModelsCache()) return undefined

  const categoryDefault = normalizeModel(input.categoryDefaultModel)
  const explicitHighBaseModel = categoryDefault ? getExplicitHighBaseModel(categoryDefault) : null
  const explicitHighModel = explicitHighBaseModel ? categoryDefault : undefined
  if (categoryDefault) {
    if (input.availableModels.size === 0) return { model: categoryDefault }

    const parts = categoryDefault.split("/")
    const providerHint = parts.length >= 2 ? [parts[0]] : undefined
    const match = fuzzyMatchModel(categoryDefault, input.availableModels, providerHint)
    if (match) {
      if (isExplicitHighModel(categoryDefault) && match !== categoryDefault) {
        return { model: categoryDefault }
      }
      return { model: match }
    }
  }

  const userFallbackModels = input.userFallbackModels
  if (userFallbackModels && userFallbackModels.length > 0) {
    if (input.availableModels.size === 0) {
      const first = normalizeModel(userFallbackModels[0])
      if (first) return { model: first }
    } else {
      for (const fallbackModel of userFallbackModels) {
        const normalizedFallback = normalizeModel(fallbackModel)
        if (!normalizedFallback) continue
        const parts = normalizedFallback.split("/")
        const providerHint = parts.length >= 2 ? [parts[0]] : undefined
        const match = fuzzyMatchModel(normalizedFallback, input.availableModels, providerHint)
        if (match) return { model: match }
      }
    }
  }

  const fallbackChain = input.fallbackChain
  if (fallbackChain && fallbackChain.length > 0) {
    if (input.availableModels.size === 0) {
      const first = fallbackChain[0]
      const provider = first?.providers?.[0]
      if (provider) {
        const transformedModelId = transformModelForProvider(provider, first.model)
        return { model: `${provider}/${transformedModelId}`, variant: first.variant }
      }
    } else {
      for (const entry of fallbackChain) {
        for (const provider of entry.providers) {
          const fullModel = `${provider}/${entry.model}`
          const match = fuzzyMatchModel(fullModel, input.availableModels, [provider])
          if (match) {
            if (explicitHighModel && entry.variant === "high" && match === explicitHighBaseModel) {
              return { model: explicitHighModel }
            }
            return { model: match, variant: entry.variant }
          }
        }
        const crossProviderMatch = fuzzyMatchModel(entry.model, input.availableModels)
        if (crossProviderMatch) {
          if (explicitHighModel && entry.variant === "high" && crossProviderMatch === explicitHighBaseModel) {
            return { model: explicitHighModel }
          }
          return { model: crossProviderMatch, variant: entry.variant }
        }
      }
    }
  }

  const systemDefaultModel = normalizeModel(input.systemDefaultModel)
  if (systemDefaultModel) return { model: systemDefaultModel }

  return undefined
}
