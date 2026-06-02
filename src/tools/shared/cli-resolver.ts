import { existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { spawnSync } from "node:child_process"
import { getInstalledRipgrepPath, downloadAndInstallRipgrep } from "./ripgrep-downloader"
import { getDataDir } from "../../shared/data-path"

export type GrepBackend = "rg" | "grep"

export interface ResolvedCli {
  path: string
  backend: GrepBackend
}

let cachedCli: ResolvedCli | null = null
let autoInstallAttempted = false

function findExecutable(name: string): string | null {
  try {
    const result = spawnSync("which", [name], { encoding: "utf-8", timeout: 5000 })
    if (result.status === 0 && result.stdout.trim()) {
      return result.stdout.trim().split("\n")[0]
    }
  } catch {
    // Command execution failed
  }
  return null
}

function getOpenCodeBundledRg(): string | null {
  const execPath = process.execPath
  const execDir = dirname(execPath)

  const candidates = [
    join(getDataDir(), "opencode", "bin", "rg"),
    join(execDir, "rg"),
    join(execDir, "bin", "rg"),
    join(execDir, "..", "bin", "rg"),
    join(execDir, "..", "libexec", "rg"),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

export function resolveGrepCli(): ResolvedCli {
  if (cachedCli) return cachedCli

  const bundledRg = getOpenCodeBundledRg()
  if (bundledRg) {
    cachedCli = { path: bundledRg, backend: "rg" }
    return cachedCli
  }

  const systemRg = findExecutable("rg")
  if (systemRg) {
    cachedCli = { path: systemRg, backend: "rg" }
    return cachedCli
  }

  const installedRg = getInstalledRipgrepPath()
  if (installedRg) {
    cachedCli = { path: installedRg, backend: "rg" }
    return cachedCli
  }

  const grep = findExecutable("grep")
  if (grep) {
    cachedCli = { path: grep, backend: "grep" }
    return cachedCli
  }

  cachedCli = { path: "rg", backend: "rg" }
  return cachedCli
}

export async function resolveGrepCliWithAutoInstall(): Promise<ResolvedCli> {
  const current = resolveGrepCli()

  if (current.backend === "rg") {
    return current
  }

  if (autoInstallAttempted) {
    return current
  }

  autoInstallAttempted = true

  try {
    const rgPath = await downloadAndInstallRipgrep()
    cachedCli = { path: rgPath, backend: "rg" }
    return cachedCli
  } catch {
    return current
  }
}

export const DEFAULT_RG_THREADS = 4
