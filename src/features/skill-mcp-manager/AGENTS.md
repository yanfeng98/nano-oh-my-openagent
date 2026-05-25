# src/features/skill-mcp-manager/ — Skill-Embedded MCP Lifecycle Manager

**Generated:** 2026-05-25

## OVERVIEW

Manages MCP client lifecycle for Tier 3 MCPs (skill-embedded). Handles connection establishment, transport selection (stdio vs HTTP), OAuth authentication, and cleanup. 13 files.

## STRUCTURE

```
skill-mcp-manager/
├── index.ts          # createSkillMcpManager() factory
├── manager.ts        # Main manager: connect, disconnect, reconnect
├── types.ts          # Type definitions (McpConnection, transports, auth)
├── connection.ts     # Connection lifecycle (connect → authenticate → ready)
├── stdio-client.ts   # Stdio transport (subprocess-based MCP servers)
├── http-client.ts    # HTTP/SSE transport (remote MCP servers)
├── cleanup.ts        # Graceful shutdown: disconnect all MCPs
├── oauth-handler.ts  # OAuth 2.0 + PKCE for protected MCPs
├── env-cleaner.ts    # Environment variable cleanup after disconnect
├── connection-type.ts # Connection type detection (stdio vs HTTP)
└── *.test.ts (3)     # Co-located tests
```

## TRANSPORT TYPES

| Transport | Client | Used For |
|-----------|--------|----------|
| **Stdio** | `stdio-client.ts` | Local MCP servers (subprocess spawn) |
| **HTTP/SSE** | `http-client.ts` | Remote MCP servers (HTTP + Server-Sent Events) |

## HOW IT WORKS

1. `manager.ts` reads MCP server config from skill YAML frontmatter
2. `connection-type.ts` detects transport type (stdio vs HTTP)
3. `connection.ts` establishes connection with appropriate transport
4. `oauth-handler.ts` handles OAuth 2.0 flow for protected servers (PKCE + DCR)
5. `cleanup.ts` gracefully disconnects all MCPs on plugin dispose
6. `env-cleaner.ts` removes leaked environment variables after disconnect

## CONVENTIONS

- Factory pattern: `createSkillMcpManager(deps)` returns manager instance
- Per-session MCP lifecycle: connections are scoped to OpenCode sessions
- Related to: `src/features/mcp-oauth/` for OAuth token storage

## NOTES

- Part of the 3-tier MCP system: Built-in (Tier 1) → Claude Code (Tier 2) → Skill-embedded (Tier 3)
- Registered in `src/create-managers.ts` as one of 4 core managers
- Disconnect called during plugin dispose via `src/plugin-dispose.ts`
