import { join } from "node:path"
import { getOpenCodeConfigDir } from "./opencode-config-dir"
import type { OpenCodeConfigDirOptions } from "./opencode-config-dir-types"

export function getOpenCodeCommandDirs(options: OpenCodeConfigDirOptions): string[] {
  return [join(getOpenCodeConfigDir(options), "command")]
}

export function getOpenCodeSkillDirs(options: OpenCodeConfigDirOptions): string[] {
  return [join(getOpenCodeConfigDir(options), "skills")]
}
