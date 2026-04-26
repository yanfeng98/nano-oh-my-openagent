export const HOOK_NAME_MAP: Record<string, string | null> = {
  "anthropic-auto-compact": "anthropic-context-window-limit-recovery",
  "sisyphus-orchestrator": "atlas",
  "sisyphus-gpt-hephaestus-reminder": "no-sisyphus-gpt",
  "empty-message-sanitizer": null,
}

export function migrateHookNames(
  hooks: string[]
): { migrated: string[]; changed: boolean; removed: string[] } {
  const migrated: string[] = []
  const removed: string[] = []
  let changed = false

  for (const hook of hooks) {
    const mapping = HOOK_NAME_MAP[hook]

    if (mapping === null) {
      removed.push(hook)
      changed = true
      continue
    }

    const newHook = mapping ?? hook
    if (newHook !== hook) {
      changed = true
    }
    migrated.push(newHook)
  }

  return { migrated, changed, removed }
}
