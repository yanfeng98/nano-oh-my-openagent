# src/hooks/runtime-fallback/ -- Runtime Model Fallback

**Generated:** 2026-05-25

## OVERVIEW

Auto-switches to fallback models when API provider errors occur during chat. Part of the Session Hooks tier (Tier 1). 27 files.

## STRUCTURE

```
runtime-fallback/
├── index.ts                     # createRuntimeFallbackHook() factory
├── hook.ts                      # Main hook logic: listens to session events
├── types.ts                     # Type definitions
├── constants.ts                 # Fallback chains, retry config
├── error-classifier.ts          # Classifies API errors (rate limit, auth, timeout, etc.)
├── fallback-models.ts           # Model fallback chain resolution
├── fallback-bootstrap-model.ts  # Bootstrap model for recovery
├── fallback-retry-dispatcher.ts # Dispatches retry with new model
├── fallback-state.ts            # Persistent fallback state tracking
├── auto-retry.ts                # Auto-retry logic with backoff
├── agent-resolver.ts            # Resolves agent for retry
├── chat-message-handler.ts      # Handles chat message events
├── event-handler.ts             # Session event handler
├── message-update-handler.ts    # Message update handling
├── session-messages.ts          # Session message access
├── session-status-handler.ts    # Session status monitoring
├── visible-assistant-response.ts# Visible assistant response tracking
├── retry-model-payload.ts       # Retry model payload construction
├── last-user-retry-parts.ts     # Last user retry parts tracking
├── hook-dispose-cleanup.test.ts # Cleanup tests
└── *.test.ts (7 test files)     # Co-located tests
```

## HOW IT WORKS

1. Hooks into `session.error` and `event` events
2. `error-classifier.ts` categorizes API errors (rate_limit, auth_error, server_error, timeout, context_window)
3. `fallback-models.ts` resolves the next model in the fallback chain (Claude > OpenAI > Gemini > Copilot > OpenCode Zen > Z.ai > Kimi)
4. `fallback-retry-dispatcher.ts` retries the failed request with the new model
5. `auto-retry.ts` handles exponential backoff for transient errors
6. `fallback-state.ts` tracks fallback count to prevent infinite loops

## KEY EXPORTS

| Export | File | Purpose |
|--------|------|---------|
| `createRuntimeFallbackHook` | index.ts | Hook factory |
| `classifyError` | error-classifier.ts | Error categorization |
| `resolveFallbackModel` | fallback-models.ts | Next model in chain |

## CONVENTIONS

- Factory pattern: `createRuntimeFallbackHook(deps)` returns hook function
- All files use kebab-case naming
- Tests co-located: `*.test.ts`

## NOTES

- Fallback priority configured via `fallback-models.ts` and config schema
- Bootstrap model used when all fallbacks exhausted
- Hook registered in `src/plugin/hooks/create-session-hooks.ts`
<!-- OMO_INTERNAL_INITIATOR -->
