import * as path from "node:path"
import * as os from "node:os"

export function getDataDir(): string {
  return process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share")
}

export function getOpenCodeStorageDir(): string {
  return path.join(getDataDir(), "opencode", "storage")
}

export function getCacheDir(): string {
  return process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache")
}

export function getOmoOpenCodeCacheDir(): string {
  return path.join(getCacheDir(), "oh-my-opencode")
}

export function getOpenCodeCacheDir(): string {
  return path.join(getCacheDir(), "opencode")
}
