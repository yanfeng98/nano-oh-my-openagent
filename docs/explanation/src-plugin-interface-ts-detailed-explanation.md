# Detailed Explanation: `src/plugin-interface.ts`

## Overview

The `plugin-interface.ts` file is the **final wiring layer** in the OhMyOpenCode plugin architecture. It takes all the previously created components (managers, tools, hooks) and assembles them into the 8 OpenCode hook handlers that the plugin exposes to the OpenCode runtime. This file implements the **Facade Pattern** - providing a simplified interface that hides the complexity of the underlying system.

## File Structure

The 75-line file has a clear structure:

1. **Imports** (lines 1-15): Type imports and handler factory imports
2. **Factory Function** (lines 16-74): `createPluginInterface()` that assembles all components
3. **Return Object** (lines 32-74): The 8 OpenCode hook handlers

## Key Components

### 1. Factory Function Signature

```typescript
export function createPluginInterface(args: {
  ctx: PluginContext
  pluginConfig: OhMyOpenCodeConfig
  firstMessageVariantGate: {
    shouldOverride: (sessionID: string) => boolean
    markApplied: (sessionID: string) => void
    markSessionCreated: (sessionInfo: { id?: string; title?: string; parentID?: string } | undefined) => void
    clear: (sessionID: string) => void
  }
  managers: Managers
  hooks: CreatedHooks
  tools: ToolsRecord
}): PluginInterface
```

**Design Pattern: Dependency Injection**
- All dependencies are passed as arguments rather than created internally
- This makes the function **pure** and **testable** - no side effects during creation
- The function signature serves as a **contract** for what the plugin needs to operate

### 2. The 8 OpenCode Hook Handlers

The return object implements exactly 8 OpenCode hooks:

#### a) `tool: tools` (line 33)
- **Purpose**: Exposes all 26 tools to OpenCode
- **Type**: `ToolsRecord` - a record of tool name → tool implementation
- **Pattern**: Direct pass-through - no transformation needed

#### b) `"chat.params"` (lines 35-38)
- **Purpose**: Handles chat parameter adjustments (e.g., Anthropic effort levels)
- **Implementation**: Creates a handler that uses the `anthropicEffort` hook
- **Pattern**: **Factory Pattern** - creates handler on demand

#### c) `"chat.headers"` (line 40)
- **Purpose**: Injects custom headers into chat requests (e.g., Copilot x-initiator)
- **Implementation**: Creates a handler with the plugin context
- **Pattern**: **Factory Pattern** with context injection

#### d) `"chat.message"` (lines 42-47)
- **Purpose**: Handles first message variants, session setup, and keyword detection
- **Implementation**: Most complex handler with 4 dependencies
- **Pattern**: **Strategy Pattern** - different behaviors based on session state

#### e) `"experimental.chat.messages.transform"` (lines 49-51)
- **Purpose**: Transforms chat messages (context injection, thinking block validation)
- **Implementation**: Uses the hooks system for transformations
- **Pattern**: **Chain of Responsibility** - hooks can transform messages in sequence

#### f) `"experimental.chat.system.transform"` (line 53)
- **Purpose**: Transforms system messages (currently minimal implementation)
- **Implementation**: Empty/no-op handler (room for future expansion)
- **Pattern**: **Null Object Pattern** - provides default behavior

#### g) `config: managers.configHandler` (line 55)
- **Purpose**: Handles OpenCode's 6-phase config loading
- **Implementation**: Delegates to the `ConfigHandler` manager
- **Pattern**: **Adapter Pattern** - adapts manager interface to OpenCode's expected format

#### h) `event` (lines 57-63)
- **Purpose**: Handles session lifecycle events (created, deleted, idle, error)
- **Implementation**: Creates event handler with all major dependencies
- **Pattern**: **Observer Pattern** - multiple hooks can react to events

#### i) `"tool.execute.before"` (lines 65-68)
- **Purpose**: Pre-tool execution hooks (file guard, label truncator, rules injector)
- **Implementation**: Uses the hooks system for pre-execution validation
- **Pattern**: **Decorator Pattern** - adds behavior before tool execution

#### j) `"tool.execute.after"` (lines 70-73)
- **Purpose**: Post-tool execution hooks (output truncation, metadata store)
- **Implementation**: Uses the hooks system for post-execution processing
- **Pattern**: **Decorator Pattern** - adds behavior after tool execution

## TypeScript Features Demonstrated

### 1. **Type Safety with Imported Types**
```typescript
import type { PluginContext, PluginInterface, ToolsRecord } from "./plugin/types"
import type { OhMyOpenCodeConfig } from "./config"
import type { CreatedHooks } from "./create-hooks"
import type { Managers } from "./create-managers"
```
- **Benefit**: Compile-time checking ensures all dependencies match expected interfaces
- **Pattern**: **Type-Only Imports** to avoid runtime overhead

### 2. **Object Destructuring with Renaming**
```typescript
const { ctx, pluginConfig, firstMessageVariantGate, managers, hooks, tools } = args
```
- **Benefit**: Cleaner code, avoids repetitive `args.` prefix
- **Pattern**: **Destructuring Assignment** for better readability

### 3. **Literal Property Names with Quotes**
```typescript
"chat.params": async (input: unknown, output: unknown) => { ... }
```
- **Benefit**: Allows property names with dots (required by OpenCode hook system)
- **Pattern**: **Computed Property Names** for dynamic/namespaced keys

### 4. **Async/Await for Promise Handling**
```typescript
"chat.params": async (input: unknown, output: unknown) => {
  const handler = createChatParamsHandler({ anthropicEffort: hooks.anthropicEffort })
  await handler(input, output)
}
```
- **Benefit**: Clean asynchronous code without callback hell
- **Pattern**: **Async/Await** for readable asynchronous operations

### 5. **Factory Function Pattern**
Each handler is created by a factory function:
```typescript
createChatParamsHandler({ anthropicEffort: hooks.anthropicEffort })
createChatHeadersHandler({ ctx })
createChatMessageHandler({ ctx, pluginConfig, firstMessageVariantGate, hooks })
```
- **Benefit**: **Lazy initialization** - handlers only created when needed
- **Benefit**: **Dependency injection** - easy to test with mock dependencies
- **Pattern**: **Factory Method Pattern**

## Design Patterns in Action

### 1. **Facade Pattern**
The entire file is a **Facade** - it provides a simple interface (8 hook handlers) that hides the complexity of:
- 26 tools
- 46 hooks
- 4 managers
- Configuration system
- Session management

### 2. **Dependency Injection**
All 7 dependencies are injected:
- `ctx`: Plugin context (OpenCode runtime)
- `pluginConfig`: Validated configuration
- `firstMessageVariantGate`: Session variant management
- `managers`: 4 specialized managers
- `hooks`: 46 lifecycle hooks
- `tools`: 26 registered tools

### 3. **Single Responsibility Principle**
This file has exactly one responsibility: **Assemble all plugin components into OpenCode hook handlers**. It doesn't:
- Implement any business logic
- Manage any state
- Handle any errors beyond basic wiring

### 4. **Interface Segregation Principle**
The plugin interface exposes 8 distinct hooks, each with a specific purpose. Consumers can use only the hooks they need.

## Usage Examples

### Example 1: Plugin Initialization
```typescript
// In src/index.ts
const pluginInterface = createPluginInterface({
  ctx,
  pluginConfig,
  firstMessageVariantGate,
  managers,
  hooks,
  tools
})

// Returned to OpenCode
return {
  ...pluginInterface,
  // Additional plugin metadata
}
```

### Example 2: Testing the Interface
```typescript
// In a test file
const mockCtx = { /* mock context */ }
const mockConfig = { /* mock config */ }
// ... create other mocks

const interface = createPluginInterface({
  ctx: mockCtx,
  pluginConfig: mockConfig,
  // ... other mocks
})

// Test that all 8 hooks are present
expect(interface.tool).toBeDefined()
expect(interface["chat.params"]).toBeDefined()
// ... test other hooks
```

### Example 3: Extending the Interface
```typescript
// To add a new hook handler:
return {
  ...pluginInterface,
  "new.hook.name": createNewHookHandler({ dependencies }),
}
```

## Learning Points for TypeScript Beginners

### 1. **Type-Driven Development**
- The entire file is structured around types imported from other modules
- This ensures **compile-time safety** - if a dependency changes its interface, TypeScript will catch it
- **Lesson**: Define your types first, then write code that satisfies those types

### 2. **Functional Composition**
- The plugin is built by composing smaller, focused functions
- Each handler factory is a pure function that takes dependencies and returns a handler
- **Lesson**: Break complex systems into small, composable functions

### 3. **Separation of Concerns**
- Creation logic is separate from execution logic
- Configuration is separate from behavior
- **Lesson**: Keep different responsibilities in different layers

### 4. **Testability by Design**
- Because all dependencies are injected, the interface is easy to test
- Each handler can be tested in isolation with mock dependencies
- **Lesson**: Write code that's easy to test from the beginning

### 5. **API Design Principles**
- The interface follows OpenCode's conventions (hook names, signatures)
- It provides sensible defaults while allowing customization
- **Lesson**: When building plugins/APIs, follow the platform's conventions

## Common Patterns in Plugin Development

### 1. **Hook Registration Pattern**
```typescript
return {
  hookName: handlerFunction,
  // ... more hooks
}
```
- **When to use**: When building plugins for hook-based systems
- **Benefit**: Clear mapping between system events and your handlers

### 2. **Factory Composition Pattern**
```typescript
function createPlugin(dependencies) {
  const componentA = createA(dependencies)
  const componentB = createB(dependencies)
  return {
    ...componentA,
    ...componentB
  }
}
```
- **When to use**: When building complex systems from smaller parts
- **Benefit**: Each component can be developed and tested independently

### 3. **Dependency Forwarding Pattern**
```typescript
createChatMessageHandler({
  ctx,
  pluginConfig,
  firstMessageVariantGate,
  hooks,
})
```
- **When to use**: When a component needs a subset of dependencies
- **Benefit**: Each component gets only what it needs, no more

## Error Handling Strategy

The interface itself doesn't handle errors - it delegates to the individual handlers. However, it follows these principles:

1. **Fail Fast**: If a dependency is missing, TypeScript will catch it at compile time
2. **Graceful Degradation**: If a handler fails, it shouldn't crash the entire plugin
3. **Error Propagation**: Errors should bubble up to OpenCode's error handling system

## Performance Considerations

1. **Lazy Initialization**: Handlers are created only when their hook is called
2. **Minimal Overhead**: The interface adds almost no runtime overhead
3. **Memory Efficiency**: Only necessary dependencies are passed to each handler

## Conclusion

The `plugin-interface.ts` file is a **masterclass in plugin architecture**:

1. **It's simple**: Just 75 lines that clearly show what the plugin does
2. **It's type-safe**: Every dependency is typed and checked
3. **It's composable**: Built from smaller, focused functions
4. **It's testable**: All dependencies can be mocked
5. **It's maintainable**: Clear separation of concerns

For TypeScript beginners, this file demonstrates:
- How to structure a complex plugin
- How to use TypeScript's type system effectively
- How to apply design patterns in practice
- How to write code that's both powerful and understandable

The key insight: **Complex systems can be built from simple, well-defined parts.** This file shows how to wire those parts together into a cohesive whole.