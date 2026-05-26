import { existsSync, readFileSync } from "node:fs"
import { dirname, isAbsolute, join, resolve } from "node:path"
import type { PluginInput } from "@opencode-ai/plugin"

import { createDynamicTruncator } from "../../shared/dynamic-truncator"
import { createInjectedPathsStorage } from "../../shared/session-injected-paths"
import { OPENCODE_STORAGE } from "../../shared"

// --- Shared finder ---
function resolveFilePath(rootDirectory: string, path: string): string | null {
  if (!path) return null
  if (isAbsolute(path)) return path
  return resolve(rootDirectory, path)
}

function findFileUp(input: {
  startDir: string
  rootDir: string
  filename: string
  skipRoot?: boolean
}): string[] {
  const found: string[] = []
  let current = input.startDir

  while (true) {
    const isRootDir = current === input.rootDir
    if (!(isRootDir && input.skipRoot)) {
      const filePath = join(current, input.filename)
      if (existsSync(filePath)) {
        found.push(filePath)
      }
    }

    if (isRootDir) break
    const parent = dirname(current)
    if (parent === current) break
    if (!parent.startsWith(input.rootDir)) break
    current = parent
  }

  return found.reverse()
}

// --- Shared storage ---
function createStorage(storageDirName: string) {
  const storageDir = join(OPENCODE_STORAGE, storageDirName)
  return createInjectedPathsStorage(storageDir)
}

// --- Shared injector ---
type DynamicTruncator = ReturnType<typeof createDynamicTruncator>

function getSessionCache(
  sessionCaches: Map<string, Set<string>>,
  sessionID: string,
  storage: ReturnType<typeof createStorage>,
): Set<string> {
  if (!sessionCaches.has(sessionID)) {
    sessionCaches.set(sessionID, storage.loadInjectedPaths(sessionID))
  }
  return sessionCaches.get(sessionID)!
}

async function processFilePath(input: {
  ctx: PluginInput
  truncator: DynamicTruncator
  sessionCaches: Map<string, Set<string>>
  filePath: string
  sessionID: string
  output: { title: string; output: string; metadata: unknown }
  filename: string
  skipRoot: boolean
  outputLabel: string
  storage: ReturnType<typeof createStorage>
}): Promise<void> {
  const resolved = resolveFilePath(input.ctx.directory, input.filePath)
  if (!resolved) return

  const dir = dirname(resolved)
  const cache = getSessionCache(input.sessionCaches, input.sessionID, input.storage)
  const paths = findFileUp({
    startDir: dir,
    rootDir: input.ctx.directory,
    filename: input.filename,
    skipRoot: input.skipRoot,
  })

  let dirty = false
  for (const filePath of paths) {
    const fileDir = dirname(filePath)
    if (cache.has(fileDir)) continue

    try {
      const content = readFileSync(filePath, "utf-8")
      const { result, truncated } = await input.truncator.truncate(input.sessionID, content)
      const truncationNotice = truncated
        ? `\n\n[Note: Content was truncated to save context window space. For full context, please read the file directly: ${filePath}]`
        : ""
      input.output.output += `\n\n${input.outputLabel}: ${filePath}]\n${result}${truncationNotice}`
      cache.add(fileDir)
      dirty = true
    } catch {}
  }

  if (dirty) {
    input.storage.saveInjectedPaths(input.sessionID, cache)
  }
}

// --- Unified hook ---
interface DirectoryFileInjectorConfig {
  filename: string
  skipRoot: boolean
  outputLabel: string
  storageDirName: string
}

function createDirectoryFileInjectorHook(
  ctx: PluginInput,
  config: DirectoryFileInjectorConfig,
  modelCacheState?: { anthropicContext1MEnabled: boolean },
) {
  const sessionCaches = new Map<string, Set<string>>()
  const truncator = createDynamicTruncator(ctx, modelCacheState)
  const storage = createStorage(config.storageDirName)

  return {
    "tool.execute.before": async (_input: unknown, _output: unknown): Promise<void> => {},
    "tool.execute.after": async (input: { tool: string; sessionID: string; callID: string }, output: { title: string; output: string; metadata: unknown }) => {
      if (input.tool.toLowerCase() === "read") {
        await processFilePath({
          ctx, truncator, sessionCaches,
          filePath: output.title,
          sessionID: input.sessionID,
          output,
          filename: config.filename,
          skipRoot: config.skipRoot,
          outputLabel: config.outputLabel,
          storage,
        })
      }
    },
    event: async ({ event }: { event: { type: string; properties?: unknown } }) => {
      const props = event.properties as Record<string, unknown> | undefined
      if (event.type === "session.deleted") {
        const sessionInfo = props?.info as { id?: string } | undefined
        if (sessionInfo?.id) {
          sessionCaches.delete(sessionInfo.id)
          storage.clearInjectedPaths(sessionInfo.id)
        }
      }
      if (event.type === "session.compacted") {
        const sessionID = (props?.sessionID ?? (props?.info as { id?: string } | undefined)?.id) as string | undefined
        if (sessionID) {
          sessionCaches.delete(sessionID)
          storage.clearInjectedPaths(sessionID)
        }
      }
    },
  }
}

// --- Pre-configured instances ---
export function createDirectoryAgentsInjectorHook(
  ctx: PluginInput,
  modelCacheState?: { anthropicContext1MEnabled: boolean },
) {
  return createDirectoryFileInjectorHook(ctx, {
    filename: "AGENTS.md",
    skipRoot: true, // OpenCode's system.ts already loads root AGENTS.md
    outputLabel: "[Directory Context",
    storageDirName: "directory-agents",
  }, modelCacheState)
}

export function createDirectoryReadmeInjectorHook(
  ctx: PluginInput,
  modelCacheState?: { anthropicContext1MEnabled: boolean },
) {
  return createDirectoryFileInjectorHook(ctx, {
    filename: "README.md",
    skipRoot: false,
    outputLabel: "[Project README",
    storageDirName: "directory-readme",
  }, modelCacheState)
}
