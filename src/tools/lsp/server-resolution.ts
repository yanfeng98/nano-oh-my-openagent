import { LSP_INSTALL_HINTS } from "./server-definitions"
import { getMergedServers } from "./server-config-loader"
import { isServerInstalled } from "./server-installation"
import type { ServerLookupResult } from "./types"

export function findServerForExtension(ext: string): ServerLookupResult {
  const servers = getMergedServers()

  for (const server of servers) {
    if (server.extensions.includes(ext) && isServerInstalled(server.command)) {
      const { source: _, ...rest } = server
      return { status: "found", server: rest }
    }
  }

  for (const server of servers) {
    if (server.extensions.includes(ext)) {
      const { source: _, ...rest } = server
      const installHint = LSP_INSTALL_HINTS[server.id] || `Install '${server.command[0]}' and ensure it's in your PATH`
      return { status: "not_installed", server: rest, installHint }
    }
  }

  const availableServers = [...new Set(servers.map((s) => s.id))]
  return {
    status: "not_configured",
    extension: ext,
    availableServers,
  }
}
