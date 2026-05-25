# src/tools/task/ — Task Management Tools

**Generated:** 2026-05-25

## OVERVIEW

Provides 4 task CRUD tools (task_create, task_list, task_get, task_update) plus todo synchronization. Part of the 26-tool registry, conditionally enabled via `experimental.task_system` config. 13 files.

## STRUCTURE

```
task/
├── index.ts          # createTaskTools() factory
├── types.ts          # Parameter schemas (Zod)
├── task-create.ts    # task_create tool implementation
├── task-list.ts      # task_list tool implementation
├── task-get.ts       # task_get tool implementation
├── task-update.ts    # task_update tool implementation
├── todo-sync.ts      # Bidirectional sync with OpenCode todos
└── *.test.ts (5)     # Co-located tests
```

## TOOL CATALOG

| Tool | Parameters | Purpose |
|------|-----------|---------|
| `task_create` | subject, description, blockedBy, blocks, metadata, parentID | Create a task in the system |
| `task_list` | (none) | List all tasks with status |
| `task_get` | id | Get a specific task |
| `task_update` | id, subject?, description?, status?, addBlocks?, addBlockedBy?, owner?, metadata? | Update task fields |

## TODO SYNC

`todo-sync.ts` implements bidirectional synchronization:
- Tasks created via `task_create` → OpenCode todo items
- Todo state changes → task status updates
- Ensures user-facing todos and internal tasks stay in sync

## CONVENTIONS

- Factory pattern: `createTaskTools(deps)` returns tool definitions
- Parameter validation via Zod schemas in types.ts
- Each tool is a separate file with its own implementation
- Tests co-located: `task-{name}.test.ts`

## NOTES

- Conditionally registered: only enabled when `experimental.task_system` is true
- Registered in `src/plugin/tool-registry.ts`
<!-- OMO_INTERNAL_INITIATOR -->
