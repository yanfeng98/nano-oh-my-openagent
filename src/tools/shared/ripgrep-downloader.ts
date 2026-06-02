import { existsSync } from "node:fs"
import { join } from "node:path"
import {
  cleanupArchive,
  downloadArchive,
  ensureCacheDir,
  ensureExecutable,
  extractTarGz as extractTarGzArchive,
} from "../../shared/binary-downloader"

const RG_VERSION = "14.1.1"

const PLATFORM_CONFIG: Record<string, string | undefined> = {
  "arm64-darwin": "aarch64-apple-darwin",
  "arm64-linux": "aarch64-unknown-linux-gnu",
  "x64-darwin": "x86_64-apple-darwin",
  "x64-linux": "x86_64-unknown-linux-musl",
}

function getPlatformKey(): string {
  return `${process.arch}-${process.platform}`
}

function getInstallDir(): string {
  const homeDir = process.env.HOME || "."
  return join(homeDir, ".cache", "oh-my-opencode", "bin")
}

function getRgPath(): string {
  return join(getInstallDir(), "rg")
}

async function extractTarGz(archivePath: string, destDir: string): Promise<void> {
  const platformKey = getPlatformKey()

  const args = ["tar", "-xzf", archivePath, "--strip-components=1"]

  if (platformKey.endsWith("-darwin")) {
    args.push("--include=*/rg")
  } else if (platformKey.endsWith("-linux")) {
    args.push("--wildcards", "*/rg")
  }

  await extractTarGzArchive(archivePath, destDir, { args, cwd: destDir })
}

export async function downloadAndInstallRipgrep(): Promise<string> {
  const platformKey = getPlatformKey()
  const platform = PLATFORM_CONFIG[platformKey]

  if (!platform) {
    throw new Error(`Unsupported platform: ${platformKey}`)
  }

  const installDir = getInstallDir()
  const rgPath = getRgPath()

  if (existsSync(rgPath)) {
    return rgPath
  }

  ensureCacheDir(installDir)

  const filename = `ripgrep-${RG_VERSION}-${platform}.tar.gz`
  const url = `https://github.com/BurntSushi/ripgrep/releases/download/${RG_VERSION}/${filename}`
  const archivePath = join(installDir, filename)

  try {
    await downloadArchive(url, archivePath)
    await extractTarGz(archivePath, installDir)
    ensureExecutable(rgPath)

    if (!existsSync(rgPath)) {
      throw new Error("ripgrep binary not found after extraction")
    }

    return rgPath
  } finally {
    try {
      cleanupArchive(archivePath)
    } catch {
      // Cleanup failures are non-critical
    }
  }
}

export function getInstalledRipgrepPath(): string | null {
  const rgPath = getRgPath()
  return existsSync(rgPath) ? rgPath : null
}
