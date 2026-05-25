import type { BuildSystemContentInput } from "./types"
import { buildPlanAgentSystemPrepend, isPlanAgent } from "./constants"

const CHARACTERS_PER_TOKEN = 4
const FREE_OR_LOCAL_PROMPT_TOKEN_LIMIT = 24000
const PLAN_AGENT_PROMPT_APPEND = `

Additional requirements for this planning request:
- Answer in English.
- Write the plan in English.
- Plan well for ultrawork execution.
- Use TDD-oriented planning.
- Include a clear atomic commit strategy.`

// ── token estimation / truncation ───────────────────────────────

export function estimateTokenCount(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / CHARACTERS_PER_TOKEN)
}

export function truncateToTokenBudget(content: string, maxTokens: number): string {
  if (!content || maxTokens <= 0) return ""
  const maxCharacters = maxTokens * CHARACTERS_PER_TOKEN
  if (content.length <= maxCharacters) return content
  const sliced = content.slice(0, maxCharacters)
  const lastNewline = sliced.lastIndexOf("\n")
  if (lastNewline > 0) return `${sliced.slice(0, lastNewline)}\n[TRUNCATED]`
  return `${sliced}\n[TRUNCATED]`
}

function joinSystemParts(parts: string[]): string | undefined {
  const filtered = parts.filter((part) => part.trim().length > 0)
  if (filtered.length === 0) return undefined
  return filtered.join("\n\n")
}

function reduceSegmentToFitBudget(content: string, overflowTokens: number): string {
  if (overflowTokens <= 0 || !content) return content
  const currentTokens = estimateTokenCount(content)
  const nextBudget = Math.max(0, currentTokens - overflowTokens)
  return truncateToTokenBudget(content, nextBudget)
}

export function buildSystemContentWithTokenLimit(
  input: BuildSystemContentInput,
  maxTokens: number | undefined
): string | undefined {
  const skillParts = input.skillContents?.length
    ? [...input.skillContents]
    : input.skillContent
      ? [input.skillContent]
      : []
  const categoryPromptAppend = input.categoryPromptAppend ?? ""
  const agentsContext = input.agentsContext ?? input.planAgentPrepend ?? ""

  if (maxTokens === undefined) {
    return joinSystemParts([agentsContext, ...skillParts, categoryPromptAppend])
  }

  let nextSkills = [...skillParts]
  let nextCategoryPromptAppend = categoryPromptAppend
  let nextAgentsContext = agentsContext

  const buildCurrentContent = (): string | undefined =>
    joinSystemParts([nextAgentsContext, ...nextSkills, nextCategoryPromptAppend])

  let systemContent = buildCurrentContent()
  if (!systemContent) return undefined

  let overflowTokens = estimateTokenCount(systemContent) - maxTokens

  if (overflowTokens > 0) {
    for (let index = 0; index < nextSkills.length && overflowTokens > 0; index += 1) {
      const reducedSkill = reduceSegmentToFitBudget(nextSkills[index], overflowTokens)
      nextSkills[index] = reducedSkill
      systemContent = buildCurrentContent()
      if (!systemContent) return undefined
      overflowTokens = estimateTokenCount(systemContent) - maxTokens
    }

    nextSkills = nextSkills.filter((skill) => skill.trim().length > 0)
    systemContent = buildCurrentContent()
    if (!systemContent) return undefined
    overflowTokens = estimateTokenCount(systemContent) - maxTokens
  }

  if (overflowTokens > 0 && nextCategoryPromptAppend) {
    nextCategoryPromptAppend = reduceSegmentToFitBudget(nextCategoryPromptAppend, overflowTokens)
    systemContent = buildCurrentContent()
    if (!systemContent) return undefined
    overflowTokens = estimateTokenCount(systemContent) - maxTokens
  }

  if (overflowTokens > 0 && nextAgentsContext) {
    nextAgentsContext = reduceSegmentToFitBudget(nextAgentsContext, overflowTokens)
    systemContent = buildCurrentContent()
    if (!systemContent) return undefined
  }

  if (!systemContent) return undefined
  return truncateToTokenBudget(systemContent, maxTokens)
}

// ── system content builder ──────────────────────────────────────

function usesFreeOrLocalModel(model: { providerID: string; modelID: string; variant?: string } | undefined): boolean {
  if (!model) return false
  const provider = model.providerID.toLowerCase()
  const modelId = model.modelID.toLowerCase()
  return provider.includes("local")
    || provider === "ollama"
    || provider === "lmstudio"
    || modelId.includes("free")
}

export function buildSystemContent(input: BuildSystemContentInput): string | undefined {
  const {
    skillContent,
    skillContents,
    categoryPromptAppend,
    agentsContext,
    maxPromptTokens,
    model,
    agentName,
    availableCategories,
    availableSkills,
  } = input

  const planAgentPrepend = isPlanAgent(agentName)
    ? buildPlanAgentSystemPrepend(availableCategories, availableSkills)
    : ""

  const effectiveMaxPromptTokens = maxPromptTokens
    ?? (usesFreeOrLocalModel(model) ? FREE_OR_LOCAL_PROMPT_TOKEN_LIMIT : undefined)

  return buildSystemContentWithTokenLimit(
    {
      skillContent,
      skillContents,
      categoryPromptAppend,
      agentsContext: agentsContext ?? planAgentPrepend,
      planAgentPrepend,
    },
    effectiveMaxPromptTokens
  )
}

// ── task prompt builder ─────────────────────────────────────────

export function buildTaskPrompt(prompt: string, agentName: string | undefined): string {
  if (!isPlanAgent(agentName)) return prompt
  return `${prompt}${PLAN_AGENT_PROMPT_APPEND}`
}
