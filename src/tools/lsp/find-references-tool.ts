import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"

import { DEFAULT_MAX_REFERENCES } from "./constants"
import { formatLocation, formatWithLimit, getErrorMessage } from "./lsp-formatters"
import { withLspClient } from "./lsp-client-wrapper"
import type { Location } from "./types"

export const lsp_find_references: ToolDefinition = tool({
  description: "Find ALL usages/references of a symbol across the entire workspace.",
  args: {
    filePath: tool.schema.string(),
    line: tool.schema.number().min(1).describe("1-based"),
    character: tool.schema.number().min(0).describe("0-based"),
    includeDeclaration: tool.schema.boolean().optional().describe("Include the declaration itself"),
  },
  execute: async (args, _context) => {
    try {
      const result = await withLspClient(args.filePath, async (client) => {
        return (await client.references(args.filePath, args.line, args.character, args.includeDeclaration ?? true)) as
          | Location[]
          | null
      })

      if (!result || result.length === 0) {
        return "No references found"
      }

      return formatWithLimit(result, DEFAULT_MAX_REFERENCES, "references", formatLocation).join("\n")
    } catch (e) {
      return `Error: ${getErrorMessage(e)}`
    }
  },
})
