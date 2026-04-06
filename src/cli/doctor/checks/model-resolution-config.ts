import { loadMergedPluginConfig } from "../../../plugin-config"
import type { OmoConfig } from "./model-resolution-types"

export function loadOmoConfig(): OmoConfig | null {
  return loadMergedPluginConfig(process.cwd(), { command: "doctor" })
}
