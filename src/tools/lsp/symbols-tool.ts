import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"

import { DEFAULT_MAX_SYMBOLS } from "./constants"
import { formatDocumentSymbol, formatSymbolInfo, formatWithLimit, getErrorMessage } from "./lsp-formatters"
import { withLspClient } from "./lsp-client-wrapper"
import type { DocumentSymbol, SymbolInfo } from "./types"

export const lsp_symbols: ToolDefinition = tool({
  description:
    "Get symbols from file (document) or search across workspace. Use scope='document' for file outline, scope='workspace' for project-wide symbol search.",
  args: {
    filePath: tool.schema.string().describe("File path for LSP context"),
    scope: tool.schema
      .enum(["document", "workspace"])
      .default("document")
      .describe("'document' for file symbols, 'workspace' for project-wide search"),
    query: tool.schema.string().optional().describe("Symbol name to search (required for workspace scope)"),
    limit: tool.schema.number().optional().describe("Max results (default 50)"),
  },
  execute: async (args, _context) => {
    try {
      const scope = args.scope ?? "document"

      if (scope === "workspace") {
        if (!args.query) {
          return "Error: 'query' is required for workspace scope"
        }

        const result = await withLspClient(args.filePath, async (client) => {
          return (await client.workspaceSymbols(args.query!)) as SymbolInfo[] | null
        })

        if (!result || result.length === 0) {
          return "No symbols found"
        }

        const limit = Math.min(args.limit ?? DEFAULT_MAX_SYMBOLS, DEFAULT_MAX_SYMBOLS)
        return formatWithLimit(result, limit, "symbols", formatSymbolInfo).join("\n")
      } else {
        const result = await withLspClient(args.filePath, async (client) => {
          return (await client.documentSymbols(args.filePath)) as DocumentSymbol[] | SymbolInfo[] | null
        })

        if (!result || result.length === 0) {
          return "No symbols found"
        }

        const limit = Math.min(args.limit ?? DEFAULT_MAX_SYMBOLS, DEFAULT_MAX_SYMBOLS)
        const total = result.length
        const truncated = total > limit
        const limited = (truncated ? result.slice(0, limit) : result) as typeof result

        const lines: string[] = []
        if (truncated) {
          lines.push(`Found ${total} symbols (showing first ${limit}):`)
        }

        if ("range" in limited[0]) {
          lines.push(...(limited as DocumentSymbol[]).map((s) => formatDocumentSymbol(s)))
        } else {
          lines.push(...(limited as SymbolInfo[]).map(formatSymbolInfo))
        }
        return lines.join("\n")
      }
    } catch (e) {
      return `Error: ${getErrorMessage(e)}`
    }
  },
})
