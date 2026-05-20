import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { homedir } from "os"
import { getClaudeConfigDir } from "../../shared"
import type { ClaudeCodeMcpConfig, McpScope, McpServerConfig } from "./types"
import { transformMcpServer } from "./transformer"
import { log } from "../../shared/logger"

interface McpConfigPath {
  path: string
  scope: McpScope
}

function getMcpConfigPaths(): McpConfigPath[] {
  const claudeConfigDir = getClaudeConfigDir()
  const cwd = process.cwd()

  return [
    { path: join(homedir(), ".claude.json"), scope: "user" },
    { path: join(claudeConfigDir, ".mcp.json"), scope: "user" },
    { path: join(cwd, ".mcp.json"), scope: "project" },
    { path: join(cwd, ".claude", ".mcp.json"), scope: "local" },
  ]
}

async function loadMcpConfigFile(
  filePath: string
): Promise<ClaudeCodeMcpConfig | null> {
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = await Bun.file(filePath).text()
    return JSON.parse(content) as ClaudeCodeMcpConfig
  } catch (error) {
    log(`Failed to load MCP config from ${filePath}`, error)
    return null
  }
}

export function getSystemMcpServerNames(): Set<string> {
  const names = new Set<string>()
  const paths = getMcpConfigPaths()

  for (const { path } of paths) {
    if (!existsSync(path)) continue

    try {
      const content = readFileSync(path, "utf-8")
      const config = JSON.parse(content) as ClaudeCodeMcpConfig
      if (!config?.mcpServers) continue

      for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
        if (serverConfig.disabled) continue
        names.add(name)
      }
    } catch {
      continue
    }
  }

  return names
}

export async function loadMcpConfigs(
  disabledSet: Set<string>
): Promise<Record<string, McpServerConfig>> {
  const servers: Record<string, McpServerConfig> = {}
  const paths = getMcpConfigPaths()

  for (const { path, scope } of paths) {
    const config = await loadMcpConfigFile(path)
    if (!config?.mcpServers) continue

    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      if (disabledSet.has(name)) {
        log(`Skipping MCP "${name}" (in disabled_mcps)`, { path })
        continue
      }

      if (serverConfig.disabled) {
        log(`Disabling MCP server "${name}"`, { path })
        delete servers[name]
        continue
      }

      try {
        servers[name] = transformMcpServer(name, serverConfig)
        log(`Loaded MCP server "${name}" from ${scope}`, { path })
      } catch (error) {
        log(`Failed to transform MCP server "${name}"`, error)
      }
    }
  }

  return servers
}
