# src/features/builtin-skills/ — 6 Built-in Skills

**Generated:** 2026-05-25

## OVERVIEW

Defines the 6 built-in skills loaded into every agent session. Skills provide domain-tuned instructions, embedded MCP servers, and scoped permissions. 3 source files + 6 skill subdirectories.

## STRUCTURE

```
builtin-skills/
├── index.ts          # createBuiltinSkills() → Skill[]
├── skills.ts         # Skill instantiation + merging logic
├── types.ts          # BuiltinSkill interface, SkillMetadata
└── skills/           # 6 skill implementations
    ├── git-master/       # Atomic commits, rebase, history search
    ├── playwright/       # Browser automation via @playwright/mcp
    ├── playwright-cli/   # Alternative browser via CLI
    ├── agent-browser/    # Agent-native browser control
    ├── dev-browser/      # Dev-focused browser automation
    └── frontend-ui-ux/   # Design-first UI/UX development
```

## SKILL CATALOG

| Skill | Size | MCP | Tools | Purpose |
|-------|------|-----|-------|---------|
| **git-master** | 1111 LOC | — | Bash | Atomic commits, rebase surgery, history search (blame, bisect, log -S) |
| **playwright** | 312 LOC | @playwright/mcp | — | Full browser automation (screenshots, testing, scraping) |
| **playwright-cli** | 268 LOC | — | Bash(playwright-cli:*) | CLI-based browser control |
| **agent-browser** | inline in playwright.ts | — | Bash(agent-browser:*) | Agent-native browser control variant |
| **dev-browser** | 221 LOC | — | Bash | Persistent page state, form filling, navigation |
| **frontend-ui-ux** | 79 LOC | — | — | Designer-turned-developer UI/UX patterns |

## BROWSER VARIANTS

Browser provider selected by `browserProvider` config in `src/config/schema/browser-automation.ts`:
- `playwright` (default) — Full MCP-based automation
- `playwright-cli` — CLI-based alternative
- `agent-browser` — Agent-native browser control

## CONVENTIONS

- Factory pattern: `createBuiltinSkills()` returns `Skill[]` array
- Skills implement `BuiltinSkill` interface (from `types.ts`)
- Each skill has: system instructions, tool permissions, optional MCP servers
- Skill size varies significantly (79 to 1111 LOC)
- Browser skills share common infrastructure; variant selected by config

## NOTES

- Built-in skills are ALWAYS loaded (cannot be disabled entirely)
- Custom skills loaded from `.opencode/skills/*/SKILL.md` supplement built-ins
- Related: `src/features/opencode-skill-loader/` for loading custom skills
- Skill loading order: built-in → project → opencode → user → global
