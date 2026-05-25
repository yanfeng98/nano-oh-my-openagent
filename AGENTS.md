# oh-my-opencode — O P E N C O D E Plugin

**Generated:** 2026-05-25 | **Commit:** 0eac736d4 | **Branch:** 260315-v3.11.2

## OVERVIEW

OpenCode plugin (npm: `oh-my-opencode`) that extends Claude Code (OpenCode fork) with multi-agent orchestration, 46 lifecycle hooks, 26 tools, skill/command/MCP systems, and Claude Code compatibility. 1268 TypeScript files, 160k LOC.

## STRUCTURE

```
oh-my-opencode/
├── src/
│   ├── index.ts              # Plugin entry: loadConfig → createManagers → createTools → createHooks → createPluginInterface
│   ├── plugin-config.ts      # JSONC multi-level config: user → project → defaults (Zod v4)
│   ├── agents/               # 11 agents (Sisyphus, Hephaestus, Oracle, Librarian, Explore, Atlas, Prometheus, Metis, Momus, Multimodal-Looker, Sisyphus-Junior)
│   ├── hooks/                # 46 hooks across 45 directories + 11 standalone files
│   ├── tools/                # 26 tools across 15 directories
│   ├── features/             # 19 feature modules (background-agent, skill-loader, tmux, MCP-OAuth, etc.)
│   ├── shared/               # 95+ utility files in 13 categories
│   ├── config/               # Zod v4 schema system (24 files)
│   ├── cli/                  # CLI: install, run, doctor, mcp-oauth (Commander.js)
│   ├── mcp/                  # 3 built-in remote MCPs (websearch, context7, grep_app)
│   ├── plugin/               # 8 OpenCode hook handlers + 46 hook composition
│   └── plugin-handlers/      # 6-phase config loading pipeline
├── packages/                 # Monorepo: cli-runner, 11 platform binaries
└── local-ignore/             # Dev-only test fixtures
```

## INITIALIZATION FLOW

```
OhMyOpenCodePlugin(ctx)
  ├─→ loadPluginConfig()         # JSONC parse → project/user merge → Zod validate → migrate
  ├─→ createManagers()           # TmuxSessionManager, BackgroundManager, SkillMcpManager, ConfigHandler
  ├─→ createTools()              # SkillContext + AvailableCategories + ToolRegistry (26 tools)
  ├─→ createHooks()              # 3-tier: Core(37) + Continuation(7) + Skill(2) = 46 hooks
  └─→ createPluginInterface()    # 8 OpenCode hook handlers → PluginInterface
```

## 8 OPENCODE HOOK HANDLERS

| Handler | Purpose |
|---------|---------|
| `config` | 6-phase: provider → plugin-components → agents → tools → MCPs → commands |
| `tool` | 26 registered tools |
| `chat.message` | First-message variant, session setup, keyword detection |
| `chat.params` | Anthropic effort level adjustment |
| `chat.headers` | Copilot x-initiator header injection |
| `event` | Session lifecycle (created, deleted, idle, error) |
| `tool.execute.before` | Pre-tool hooks (file guard, label truncator, rules injector) |
| `tool.execute.after` | Post-tool hooks (output truncation, metadata store) |
| `experimental.chat.messages.transform` | Context injection, thinking block validation |

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new agent | `src/agents/` + `src/agents/builtin-agents/` | Follow createXXXAgent factory pattern |
| Add new hook | `src/hooks/{name}/` + register in `src/plugin/hooks/create-*-hooks.ts` | Match event type to tier |
| Add new tool | `src/tools/{name}/` + register in `src/plugin/tool-registry.ts` | Follow createXXXTool factory |
| Add new feature module | `src/features/{name}/` | Standalone module, wire in plugin/ |
| Add new MCP | `src/mcp/` + register in `createBuiltinMcps()` | Remote HTTP only |
| Add new skill | `src/features/builtin-skills/skills/` | Implement BuiltinSkill interface |
| Add new command | `src/features/builtin-commands/` | Template in templates/ |
| Add new CLI command | `src/cli/cli-program.ts` | Commander.js subcommand |
| Add new doctor check | `src/cli/doctor/checks/` | Register in checks/index.ts |
| Modify config schema | `src/config/schema/` + update root schema | Zod v4, add to OhMyOpenCodeConfigSchema |
| Add new category | `src/tools/delegate-task/constants.ts` | DEFAULT_CATEGORIES + CATEGORY_MODEL_REQUIREMENTS |

## MULTI-LEVEL CONFIG

```
Project (.opencode/oh-my-opencode.jsonc)  →  User (~/.config/opencode/oh-my-opencode.jsonc)  →  Defaults
```

- `agents`, `categories`, `claude_code`: deep merged recursively
- `disabled_*` arrays: Set union (concatenated + deduplicated)
- All other fields: override replaces base value
- Zod `safeParse()` fills defaults for omitted fields
- `migrateConfigFile()` transforms legacy keys automatically

Fields: agents (14 overridable, 21 fields each), categories (8 built-in + custom), disabled_* arrays (agents, hooks, mcps, skills, commands, tools), 19 feature-specific configs.

## THREE-TIER MCP SYSTEM

| Tier | Source | Mechanism |
|------|--------|-----------|
| Built-in | `src/mcp/` | 3 remote HTTP: websearch (Exa/Tavily), context7, grep_app |
| Claude Code | `.mcp.json` | `${VAR}` env expansion via claude-code-mcp-loader |
| Skill-embedded | SKILL.md YAML | Managed by SkillMcpManager (stdio + HTTP) |

## CONVENTIONS

- **Runtime**: Bun only — never use npm/yarn
- **TypeScript**: strict mode, ESNext, bundler moduleResolution, `bun-types` (never `@types/node`)
- **Test pattern**: Bun test (`bun:test`), co-located `*.test.ts`, given/when/then style (nested describe with `#given`/`#when`/`#then` prefixes)
- **CI test split**: mock-heavy tests run in isolation (separate `bun test` processes), rest in batch
- **Factory pattern**: `createXXX()` for all tools, hooks, agents
- **Hook tiers**: Session (23) → Tool-Guard (10) → Transform (4) → Continuation (7) → Skill (2)
- **Agent modes**: `primary` (respects UI model) vs `subagent` (own fallback chain) vs `all`
- **Model resolution**: 4-step: override → category-default → provider-fallback → system-default
- **Config format**: JSONC with comments, Zod v4 validation, snake_case keys
- **File naming**: kebab-case for all files/directories
- **Module structure**: index.ts barrel exports, no catch-all files (utils.ts, helpers.ts banned), 200 LOC soft limit
- **Imports**: relative within module, barrel imports across modules (`import { log } from "./shared"`)
- **No path aliases**: no `@/` — relative imports only

## ANTI-PATTERNS

### Hard Blocks (NEVER violate)

- Never use `as any`, `@ts-ignore`, `@ts-expect-error`
- Never suppress lint/type errors
- Never add emojis to code/comments unless user explicitly asks
- Never commit unless explicitly requested
- Never run `bun publish` directly — use GitHub Actions (or `script/publish.ts` with env vars)
- Never modify `package.json` version locally
- Never create catch-all files (`utils.ts`, `helpers.ts`, `service.ts`)
- Empty catch blocks `catch(e) {}` — always handle errors
- index.ts is entry point ONLY — never dump business logic there
- `background_cancel(all=true)` — Never. Always cancel individually by taskId.

### Bugfix Rules

- Fix minimally. NEVER refactor while fixing.
- Never delete failing tests to "pass"
- Never shotgun debug (random changes hoping something works)
- Never leave code in broken state after failures
- After 3 consecutive failures: STOP, REVERT, DOCUMENT, consult Oracle, ASK USER

### Evidence Rules

- NO EVIDENCE = NOT COMPLETE: diagnostics clean, build exit 0, tests pass, delegation verified
- Never deliver final answer before collecting Oracle/Librarian results
- Never claim "it works" without running and showing output

### Style & Content

- Test: given/when/then — never use Arrange-Act-Assert comments
- Comments: avoid AI-generated comment patterns (enforced by comment-checker hook)
- Never use em dashes (—), en dashes (–), or AI filler phrases in generated content
- Never speculate about unread code — Read it first
- No console.log in production, no commented-out code, no unused imports

## COMMANDS

```bash
bun test                    # Bun test suite
bun run build              # Build plugin (ESM + declarations + schema)
bun run build:all          # Build + platform binaries
bun run typecheck           # tsc --noEmit
bun run clean               # Remove dist/
bun run build:schema        # Generate JSON Schema only
bun run build:binaries      # Cross-compile 11 platform binaries only
bunx oh-my-opencode install # Interactive setup
bunx oh-my-opencode doctor  # Health diagnostics
bunx oh-my-opencode run     # Non-interactive session
```

## CI/CD

Publish pipeline via `script/publish.ts` (with env vars: `BUMP`, `VERSION`, `REPUBLISH`, `SKIP_PLATFORM_PACKAGES`, `CI`). On CI, this also creates git tags and GitHub releases. Workflows (ci.yml, publish.yml, etc.) are managed in the upstream `code-yeongyu/oh-my-openagent` repository.

## NOTES

- Logger writes to `/tmp/oh-my-opencode.log` — check there for debugging
- Background tasks: 5 concurrent per model/provider (configurable)
- Plugin load timeout: 10s for Claude Code plugins
- Model fallback priority: Claude > OpenAI > Gemini > Copilot > OpenCode Zen > Z.ai > Kimi
- Config migration runs automatically on legacy keys (agent names, hook names, model versions)
- Build: bun build (ESM) + tsc --emitDeclarationOnly, externals: @ast-grep/napi
- Test setup: `test-setup.ts` preloaded via bunfig.toml, mock-heavy tests run in isolation in CI
- 98 barrel export files (index.ts) establish module boundaries
- Architecture rules enforced via `.sisyphus/rules/modular-code-enforcement.md`
- `script/publish.ts` handles full publish: version bump → build → npm publish (11 platform packages) → git tag → GitHub release
