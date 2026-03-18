# Contributing to Oh My OpenCode

## Table of Contents

- [Contributing to Oh My OpenCode](#contributing-to-oh-my-opencode)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Development Setup](#development-setup)
    - [Testing Your Changes Locally](#testing-your-changes-locally)
  - [Project Structure](#project-structure)
  - [Development Workflow](#development-workflow)
    - [Build Commands](#build-commands)
    - [Code Style \& Conventions](#code-style--conventions)
  - [Making Changes](#making-changes)
    - [Adding a New Agent](#adding-a-new-agent)
    - [Adding a New Hook](#adding-a-new-hook)
    - [Adding a New Tool](#adding-a-new-tool)
    - [Adding a New MCP Server](#adding-a-new-mcp-server)

## Getting Started

### Prerequisites

- **Bun** (latest version) - The only supported package manager
- **TypeScript 5.7.3+** - For type checking and declarations
- **OpenCode 1.0.150+** - For testing the plugin

### Development Setup

```bash
# Install dependencies (bun only - never use npm/yarn)
bun install

# Build the project
bun run build
```

### Testing Your Changes Locally

After making changes, you can test your local build in OpenCode:

1. **Build the project**:

   ```bash
   bun run build
   ```

2. **Update your OpenCode config** (`~/.config/opencode/opencode.json` or `opencode.jsonc`):

   ```json
   {
     "plugin": ["file:///absolute/path/to/oh-my-opencode/dist/index.js"]
   }
   ```

   For example, if your project is at `/Users/yourname/projects/oh-my-opencode`:

   ```json
   {
     "plugin": ["file:///Users/yourname/projects/oh-my-opencode/dist/index.js"]
   }
   ```

   > **Note**: Remove `"oh-my-opencode"` from the plugin array if it exists, to avoid conflicts with the npm version.

3. **Restart OpenCode** to load the changes.

4. **Verify** the plugin is loaded by checking for OmO agent availability or startup messages.

## Project Structure

```
oh-my-opencode/
├── src/
│   ├── index.ts         # Plugin entry (OhMyOpenCodePlugin)
│   ├── plugin-config.ts # JSONC multi-level config (Zod v4)
│   ├── agents/          # 11 agents (Sisyphus, Hephaestus, Oracle, Librarian, Explore, Atlas, Prometheus, Metis, Momus, Multimodal-Looker, Sisyphus-Junior)
│   ├── hooks/           # Lifecycle hooks for orchestration, recovery, UX, and context management
│   ├── tools/           # 26 tools across 15 directories
│   ├── mcp/             # 3 built-in remote MCPs (websearch, context7, grep_app)
│   ├── features/        # 19 feature modules (background-agent, skill-loader, tmux, MCP-OAuth, etc.)
│   ├── config/          # Zod v4 schema system
│   ├── shared/          # Cross-cutting utilities
│   ├── cli/             # CLI: install, run, doctor, mcp-oauth (Commander.js)
│   ├── plugin/          # 8 OpenCode hook handlers + hook composition
│   └── plugin-handlers/ # 6-phase config loading pipeline
├── packages/            # Monorepo: comment-checker, opencode-sdk
└── dist/                # Build output (ESM + .d.ts)
```

## Development Workflow

### Build Commands

```bash
# Type check only
bun run typecheck

# Full build (ESM + TypeScript declarations + JSON schema)
bun run build

# Clean build output
bun run clean

# Rebuild from scratch
bun run clean && bun run build

# Build schema only (after modifying src/config/schema.ts)
bun run build:schema
```

### Code Style & Conventions

| Convention       | Rule                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| Package Manager  | **Bun only** (`bun run`, `bun build`, `bunx`)                             |
| Types            | Use `bun-types`, not `@types/node`                                        |
| Directory Naming | kebab-case (`ast-grep/`, `claude-code-hooks/`)                            |
| File Operations  | Never use bash commands (mkdir/touch/rm) for file creation in code        |
| Tool Structure   | Each tool: `index.ts`, `types.ts`, `constants.ts`, `tools.ts`, `utils.ts` |
| Hook Pattern     | `createXXXHook(input: PluginInput)` function naming                       |
| Exports          | Barrel pattern (`export * from "./module"` in index.ts)                   |

**Anti-Patterns (Do Not Do)**:

- Using npm/yarn instead of bun
- Using `@types/node` instead of `bun-types`
- Suppressing TypeScript errors with `as any`, `@ts-ignore`, `@ts-expect-error`
- Generic AI-generated comment bloat
- Direct `bun publish` (use GitHub Actions only)
- Local version modifications in `package.json`

## Making Changes

### Adding a New Agent

1. Create a new `.ts` file in `src/agents/`
2. Define the agent configuration following existing patterns
3. Add to `builtinAgents` in `src/agents/index.ts`
4. Update `src/agents/types.ts` if needed
5. Run `bun run build:schema` to update the JSON schema

```typescript
// src/agents/my-agent.ts
import type { AgentConfig } from "./types";

export const myAgent: AgentConfig = {
  name: "my-agent",
  model: "anthropic/claude-opus-4-6",
  description: "Description of what this agent does",
  prompt: `Your agent's system prompt here`,
  temperature: 0.1,
  // ... other config
};
```

### Adding a New Hook

1. Create a new directory in `src/hooks/` (kebab-case)
2. Implement `createXXXHook()` function returning event handlers
3. Export from `src/hooks/index.ts`

```typescript
// src/hooks/my-hook/index.ts
import type { PluginInput } from "@opencode-ai/plugin";

export function createMyHook(input: PluginInput) {
  return {
    onSessionStart: async () => {
      // Hook logic here
    },
  };
}
```

### Adding a New Tool

1. Create a new directory in `src/tools/` with required files:
   - `index.ts` - Main exports
   - `types.ts` - TypeScript interfaces
   - `constants.ts` - Constants and tool descriptions
   - `tools.ts` - Tool implementations
   - `utils.ts` - Helper functions
2. Add to `builtinTools` in `src/tools/index.ts`

### Adding a New MCP Server

1. Create configuration in `src/mcp/`
2. Add to `src/mcp/index.ts`
3. Document in README if it requires external setup
