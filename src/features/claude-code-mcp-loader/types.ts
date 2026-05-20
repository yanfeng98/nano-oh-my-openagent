export type McpScope = "user" | "project" | "local"

export interface ClaudeCodeMcpServer {
  type?: "http" | "sse" | "stdio"
  url?: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  headers?: Record<string, string>
  oauth?: {
    clientId?: string
    scopes?: string[]
  }
  disabled?: boolean
}

export interface ClaudeCodeMcpConfig {
  mcpServers?: Record<string, ClaudeCodeMcpServer>
}

export interface McpLocalConfig {
  type: "local"
  command: string[]
  environment?: Record<string, string>
  enabled?: boolean
}

export interface McpRemoteConfig {
  type: "remote"
  url: string
  headers?: Record<string, string>
  enabled?: boolean
}

export type McpServerConfig = McpLocalConfig | McpRemoteConfig

