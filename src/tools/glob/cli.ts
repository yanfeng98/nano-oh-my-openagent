import { resolve } from "node:path"
import {
  resolveGrepCli,
  type GrepBackend,
  type ResolvedCli,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_LIMIT,
  DEFAULT_MAX_DEPTH,
  DEFAULT_MAX_OUTPUT_BYTES,
  RG_FILES_FLAGS,
  DEFAULT_RG_THREADS,
} from "./constants"
import type { GlobOptions, GlobResult, FileMatch } from "./types"
import { stat } from "node:fs/promises"
import { rgSemaphore } from "../shared/semaphore"
import { spawnWithTimeout } from "../shared/spawn-utils"

function buildRgArgs(options: GlobOptions): string[] {
  const args: string[] = [
    ...RG_FILES_FLAGS,
    `--threads=${Math.min(options.threads ?? DEFAULT_RG_THREADS, DEFAULT_RG_THREADS)}`,
    `--max-depth=${Math.min(options.maxDepth ?? DEFAULT_MAX_DEPTH, DEFAULT_MAX_DEPTH)}`,
  ]

  if (options.hidden !== false) args.push("--hidden")
  if (options.follow !== false) args.push("--follow")
  if (options.noIgnore) args.push("--no-ignore")

  args.push(`--glob=${options.pattern}`)

  return args
}

function buildFindArgs(options: GlobOptions): string[] {
  const args: string[] = []

  if (options.follow !== false) {
    args.push("-L")
  }

  args.push(".")

  const maxDepth = Math.min(options.maxDepth ?? DEFAULT_MAX_DEPTH, DEFAULT_MAX_DEPTH)
  args.push("-maxdepth", String(maxDepth))

  args.push("-type", "f")
  args.push("-name", options.pattern)

  if (options.hidden === false) {
    args.push("-not", "-path", "*/.*")
  }

  return args
}

async function getFileMtime(filePath: string): Promise<number> {
  try {
    const stats = await stat(filePath)
    return stats.mtime.getTime()
  } catch {
    return 0
  }
}

export async function runRgFiles(
  options: GlobOptions,
  resolvedCli?: ResolvedCli
): Promise<GlobResult> {
  await rgSemaphore.acquire()
  try {
    return await runRgFilesInternal(options, resolvedCli)
  } finally {
    rgSemaphore.release()
  }
}

async function runRgFilesInternal(
  options: GlobOptions,
  resolvedCli?: ResolvedCli
): Promise<GlobResult> {
  const cli = resolvedCli ?? resolveGrepCli()
  const timeout = Math.min(options.timeout ?? DEFAULT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, DEFAULT_LIMIT)

  const isRg = cli.backend === "rg"

  let command: string[]
  let cwd: string | undefined

  if (isRg) {
    const args = buildRgArgs(options)
    cwd = options.paths?.[0] || "."
    args.push(".")
    command = [cli.path, ...args]
  } else {
    const args = buildFindArgs(options)
    const paths = options.paths?.length ? options.paths : ["."]
    cwd = paths[0] || "."
    command = [cli.path, ...args]
  }

  try {
    const [cmd, ...restArgs] = command
    const { stdout, stderr, exitCode } = await spawnWithTimeout(cmd, restArgs, timeout, { cwd, errorLabel: "Glob search" })

    if (exitCode > 1 && stderr.trim()) {
      return {
        files: [],
        totalFiles: 0,
        truncated: false,
        error: stderr.trim(),
      }
    }

    const truncatedOutput = stdout.length >= DEFAULT_MAX_OUTPUT_BYTES
    const outputToProcess = truncatedOutput ? stdout.substring(0, DEFAULT_MAX_OUTPUT_BYTES) : stdout

    const lines = outputToProcess.trim().split("\n").filter(Boolean)

    const files: FileMatch[] = []
    let truncated = false

    for (const line of lines) {
      if (files.length >= limit) {
        truncated = true
        break
      }

      let filePath: string
      if (isRg) {
        filePath = cwd ? resolve(cwd, line) : line
      } else {
        filePath = `${cwd}/${line}`
      }

      const mtime = await getFileMtime(filePath)
      files.push({ path: filePath, mtime })
    }

    files.sort((a, b) => b.mtime - a.mtime)

    return {
      files,
      totalFiles: files.length,
      truncated: truncated || truncatedOutput,
    }
  } catch (e) {
    return {
      files: [],
      totalFiles: 0,
      truncated: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
