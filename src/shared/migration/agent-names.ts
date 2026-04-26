export const AGENT_NAME_MAP: Record<string, string> = {
  omo: "sisyphus",
  sisyphus: "sisyphus",

  "omo-plan": "prometheus",
  "planner-sisyphus": "prometheus",
  "prometheus (planner)": "prometheus",
  prometheus: "prometheus",

  "orchestrator-sisyphus": "atlas",
  atlas: "atlas",

  "plan-consultant": "metis",
  "metis (plan consultant)": "metis",
  metis: "metis",

  "momus (plan reviewer)": "momus",
  momus: "momus",

  "sisyphus-junior": "sisyphus-junior",

  build: "build",
  oracle: "oracle",
  librarian: "librarian",
  explore: "explore",
  "multimodal-looker": "multimodal-looker",
}

export const BUILTIN_AGENT_NAMES = new Set([
  "sisyphus",
  "oracle",
  "librarian",
  "explore",
  "multimodal-looker",
  "metis",
  "momus",
  "prometheus",
  "atlas",
  "build",
  "sisyphus-junior",
])

export function migrateAgentNames(
  agents: Record<string, unknown>
): { migrated: Record<string, unknown>; changed: boolean } {
  const migrated: Record<string, unknown> = {}
  let changed = false

  for (const [key, value] of Object.entries(agents)) {
    const newKey = AGENT_NAME_MAP[key.toLowerCase()] ?? key
    if (newKey !== key) {
      changed = true
    }
    migrated[newKey] = value
  }

  return { migrated, changed }
}
