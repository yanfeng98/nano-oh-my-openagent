import {
  tokenizeCommand,
  normalizeSessionName,
  findFlagValue,
  extractSessionNameFromTokens,
  findSubcommand,
} from "./parser"

export function parseTmuxCommand(tmuxCommand: string): {
  subCommand: string
  sessionName: string | null
} {
  const tokens = tokenizeCommand(tmuxCommand)
  const subCommand = findSubcommand(tokens)
  const sessionName = extractSessionNameFromTokens(tokens, subCommand)
  return { subCommand, sessionName }
}
