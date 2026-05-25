# src/tools/ast-grep/ — AST-Aware Code Search & Rewrite

**Generated:** 2026-05-25

## OVERVIEW

Provides `ast_grep_search` and `ast_grep_replace` tools for pattern-aware code search and rewriting across 25 languages. Uses the @ast-grep/cli binary (native, installed as dependency). 13 files.

## STRUCTURE

```
ast-grep/
├── index.ts                    # createAstGrepTools() factory
├── tools.ts                    # Tool definitions (search + replace)
├── types.ts                    # Parameter schemas
├── constants.ts                # Language list, defaults
├── cli.ts                      # @ast-grep/cli invocation
├── cli-binary-path-resolution.ts # Binary path resolution
├── language-support.ts         # 25 supported languages
├── result-formatter.ts         # Search result formatting
├── downloader.ts               # Binary download on first use
├── environment-check.ts        # Platform compatibility check
├── sg-cli-path.ts              # CLI path management
├── sg-compact-json-output.ts   # Compact JSON output mode
└── process-output-timeout.ts   # Process timeout handling
```

## TOOLS

| Tool | Parameters | Purpose |
|------|-----------|---------|
| `ast_grep_search` | pattern (AST), lang, paths?, globs?, context? | Search code by AST pattern with meta-variables ($VAR, $$$) |
| `ast_grep_replace` | pattern, rewrite, lang, paths?, globs?, dryRun? | Replace code patterns with AST-aware rewriting |

## LANGUAGE SUPPORT

25 languages: TypeScript, TSX, JavaScript, Python, Rust, Go, Java, C, C++, C#, and 16 more. Defined in `language-support.ts` and `constants.ts`.

## HOW IT WORKS

1. `cli-binary-path-resolution.ts` locates the @ast-grep/napi or @ast-grep/cli binary
2. `cli.ts` invokes the binary with pattern + language + paths
3. `result-formatter.ts` formats the JSON output for agent consumption
4. `sg-compact-json-output.ts` enables compact mode for large results
5. `process-output-timeout.ts` handles long-running searches (60s timeout)

## CONVENTIONS

- Factory pattern: `createAstGrepTools(deps)` returns both tool definitions
- Native binary dependency: @ast-grep/napi is excluded from bun build (`--external`)
- Meta-variable syntax: `$VAR` (single node), `$$$` (multiple nodes)
- Patterns must be complete AST nodes (valid code)

## NOTES

- Binary auto-downloads on first use via `downloader.ts`
- Registered in `src/plugin/tool-registry.ts`
- Build constraint: @ast-grep/napi must be `--external` in bun build
<!-- OMO_INTERNAL_INITIATOR -->
