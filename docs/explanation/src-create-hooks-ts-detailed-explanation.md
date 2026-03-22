# 详细解释: src/create-hooks.ts - 钩子系统工厂函数

## 概述

`create-hooks.ts` 是 OhMyOpenCode 插件的**钩子系统工厂函数**。它负责创建和组装插件的 46 个生命周期钩子，这些钩子分为 5 个层级：核心钩子（37个）、延续钩子（7个）和技能钩子（2个）。这个文件展示了**分层架构**和**组合模式**的优雅实现。

## 文件结构 (87 行)

### 1. 导入部分 (第 1-10 行)
```typescript
import type { AvailableSkill } from "./agents/dynamic-agent-prompt-builder"
import type { HookName, OhMyOpenCodeConfig } from "./config"
import type { LoadedSkill } from "./features/opencode-skill-loader/types"
import type { BackgroundManager } from "./features/background-agent"
import type { PluginContext } from "./plugin/types"
import type { ModelCacheState } from "./plugin-state"

import { createCoreHooks } from "./plugin/hooks/create-core-hooks"
import { createContinuationHooks } from "./plugin/hooks/create-continuation-hooks"
import { createSkillHooks } from "./plugin/hooks/create-skill-hooks"
```

**TypeScript 初学者注意**:
- 导入类型定义和工厂函数
- `HookName` 是配置 schema 中定义的钩子名称类型
- `ModelCacheState` 是插件状态管理类型

### 2. 类型定义 (第 12-26 行)
```typescript
export type CreatedHooks = ReturnType<typeof createHooks>

type DisposableHook = { dispose?: () => void } | null | undefined

export type DisposableCreatedHooks = {
  runtimeFallback?: DisposableHook
  todoContinuationEnforcer?: DisposableHook
  autoSlashCommand?: DisposableHook
}

export function disposeCreatedHooks(hooks: DisposableCreatedHooks): void {
  hooks.runtimeFallback?.dispose?.()
  hooks.todoContinuationEnforcer?.dispose?.()
  hooks.autoSlashCommand?.dispose?.()
}
```

**类型设计分析**:
- `ReturnType<typeof createHooks>`: 动态获取函数返回类型
- `DisposableHook`: 可释放资源的钩子类型
- `disposeCreatedHooks()`: 资源清理函数，使用可选链安全调用

### 3. 主工厂函数 (第 28-87 行)
```typescript
export function createHooks(args: {
  ctx: PluginContext
  pluginConfig: OhMyOpenCodeConfig
  modelCacheState: ModelCacheState
  backgroundManager: BackgroundManager
  isHookEnabled: (hookName: HookName) => boolean
  safeHookEnabled: boolean
  mergedSkills: LoadedSkill[]
  availableSkills: AvailableSkill[]
})
```

**参数分析**:
- `ctx`: 插件上下文
- `pluginConfig`: 插件配置
- `modelCacheState`: 模型缓存状态
- `backgroundManager`: 后台管理器
- `isHookEnabled`: 钩子启用检查函数
- `safeHookEnabled`: 安全钩子模式开关
- `mergedSkills`: 合并后的技能列表
- `availableSkills`: 可用技能列表

## 钩子创建流程

### 1. 创建核心钩子 (第 49-55 行)
```typescript
const core = createCoreHooks({
  ctx,
  pluginConfig,
  modelCacheState,
  isHookEnabled,
  safeHookEnabled,
})
```

**核心钩子 (37个)** 分为三个子层：
1. **会话钩子 (23个)**: 处理会话生命周期事件
2. **工具守卫钩子 (10个)**: 工具执行前后的检查和增强
3. **转换钩子 (4个)**: 消息转换和处理

### 2. 创建延续钩子 (第 57-64 行)
```typescript
const continuation = createContinuationHooks({
  ctx,
  pluginConfig,
  isHookEnabled,
  safeHookEnabled,
  backgroundManager,
  sessionRecovery: core.sessionRecovery,
})
```

**延续钩子 (7个)**:
- 处理会话延续和恢复
- 依赖 `sessionRecovery` 核心钩子
- 与后台管理器集成

### 3. 创建技能钩子 (第 66-73 行)
```typescript
const skill = createSkillHooks({
  ctx,
  pluginConfig,
  isHookEnabled,
  safeHookEnabled,
  mergedSkills,
  availableSkills,
})
```

**技能钩子 (2个)**:
- 技能相关功能
- 使用合并后的技能列表

### 4. 合并所有钩子 (第 75-79 行)
```typescript
const hooks = {
  ...core,
  ...continuation,
  ...skill,
}
```

**设计模式**: **组合模式 (Composite Pattern)**
- 将不同层级的钩子组合成统一的接口
- 使用对象展开运算符 `...` 合并

### 5. 返回带清理功能的钩子对象 (第 81-86 行)
```typescript
return {
  ...hooks,
  disposeHooks: (): void => {
    disposeCreatedHooks(hooks)
  },
}
```

**资源管理**: 提供 `disposeHooks()` 方法清理需要释放资源的钩子。

## 钩子系统架构深入分析

### 5层钩子架构

#### 第1层: 会话钩子 (23个)
处理 OpenCode 会话生命周期事件：
- `session.created`: 会话创建
- `session.deleted`: 会话删除  
- `session.idle`: 会话空闲
- `session.error`: 会话错误
- `session.compacted`: 会话压缩

**关键钩子**:
- `contextWindowMonitor`: 上下文窗口监控
- `thinkMode`: 思维模式切换
- `ralphLoop`: 自引用开发循环
- `runtimeFallback`: 运行时回退

#### 第2层: 工具守卫钩子 (10个)
在工具执行前后进行检查和增强：
- `tool.execute.before`: 工具执行前
- `tool.execute.after`: 工具执行后

**关键钩子**:
- `commentChecker`: AI 注释检查
- `writeExistingFileGuard`: 文件写入保护
- `hashlineReadEnhancer`: Hashline 读取增强
- `jsonErrorRecovery`: JSON 错误恢复

#### 第3层: 转换钩子 (4个)
处理消息转换：
- `experimental.chat.messages.transform`: 消息转换事件

**关键钩子**:
- `keywordDetector`: 关键词检测
- `contextInjectorMessagesTransform`: 上下文注入
- `thinkingBlockValidator`: 思维块验证

#### 第4层: 延续钩子 (7个)
处理会话延续和恢复：
- `todoContinuationEnforcer`: TODO 延续强制器
- `atlasHook`: Atlas 主协调器
- `backgroundNotificationHook`: 后台任务通知

#### 第5层: 技能钩子 (2个)
技能相关功能：
- `categorySkillReminder`: 类别技能提醒
- `autoSlashCommand`: 自动斜杠命令检测

### 钩子启用检查系统

```typescript
isHookEnabled: (hookName: HookName) => boolean
```

**工作流程**:
1. 检查 `pluginConfig.disabled_hooks` 数组
2. 检查钩子特定的配置开关
3. 返回布尔值表示钩子是否启用

### 安全钩子模式

```typescript
safeHookEnabled: boolean
```

**作用**: 当启用时，每个钩子执行都会包裹在 `try...catch` 中，防止单个钩子失败影响整个系统。

## 设计模式分析

### 1. 工厂模式 (Factory Pattern)
`createHooks` 是顶级工厂函数，它：
- 协调多个子工厂 (`createCoreHooks`, `createContinuationHooks`, `createSkillHooks`)
- 封装复杂的创建逻辑
- 提供统一的创建接口

### 2. 组合模式 (Composite Pattern)
钩子系统是组合模式的典型应用：
- 每个钩子是独立的组件
- 按层级组合成完整的钩子系统
- 客户端通过统一接口访问所有钩子

### 3. 策略模式 (Strategy Pattern)
- `isHookEnabled`: 钩子启用策略
- `safeHookEnabled`: 错误处理策略
- 不同钩子实现不同的处理策略

### 4. 观察者模式 (Observer Pattern)
钩子系统本质上是观察者模式：
- OpenCode 事件是主题
- 钩子是观察者
- 当事件发生时，通知所有相关的钩子

### 5. 依赖注入 (Dependency Injection)
所有依赖都通过参数注入：
- 管理器依赖 (`backgroundManager`)
- 配置依赖 (`pluginConfig`)
- 状态依赖 (`modelCacheState`)
- 技能依赖 (`mergedSkills`, `availableSkills`)

## TypeScript 高级特性

### 1. 条件类型和 ReturnType
```typescript
export type CreatedHooks = ReturnType<typeof createHooks>
```

### 2. 可选链和空值合并
```typescript
hooks.runtimeFallback?.dispose?.()
```

### 3. 函数类型
```typescript
isHookEnabled: (hookName: HookName) => boolean
```

### 4. 对象解构
```typescript
const { ctx, pluginConfig, modelCacheState, backgroundManager, isHookEnabled, safeHookEnabled, mergedSkills, availableSkills } = args
```

### 5. 字面量类型
```typescript
type DisposableHook = { dispose?: () => void } | null | undefined
```

## 配置驱动设计

### 钩子启用/禁用
通过 `pluginConfig.disabled_hooks` 数组配置：
```jsonc
{
  "disabled_hooks": ["comment-checker", "write-existing-file-guard"]
}
```

### 安全模式
通过 `safeHookEnabled` 参数控制，确保单个钩子失败不影响系统。

### 技能集成
钩子可以使用技能系统提供的功能，实现动态行为。

## 错误处理设计

### 分层错误处理
1. **钩子级别**: 单个钩子内部的错误处理
2. **工厂级别**: 钩子创建时的错误处理
3. **安全模式**: `safeHookEnabled` 提供的全局保护

### 资源清理
```typescript
disposeCreatedHooks(hooks)
```
- 清理需要释放资源的钩子
- 使用可选链安全调用
- 防止内存泄漏

## 实际应用示例

### 在插件初始化中使用
```typescript
// 在 src/index.ts 中
const hooks = createHooks({
  ctx: pluginContext,
  pluginConfig: config,
  modelCacheState,
  backgroundManager: managers.backgroundManager,
  isHookEnabled: (name) => !(config.disabled_hooks ?? []).includes(name),
  safeHookEnabled: true,
  mergedSkills: toolsResult.mergedSkills,
  availableSkills: toolsResult.availableSkills,
})

// 注册钩子到 OpenCode
for (const [hookName, hookFn] of Object.entries(hooks)) {
  if (hookName !== "disposeHooks") {
    ctx.hooks[hookName as keyof typeof ctx.hooks]?.register(hookFn as any)
  }
}
```

### 钩子执行流程示例
```
1. 用户发送消息
2. OpenCode 触发 chat.message 事件
3. 所有注册到 chat.message 的钩子按顺序执行
4. 每个钩子可以修改消息或执行副作用
5. 处理后的消息发送给 AI 模型
```

### 扩展新的钩子
如果需要添加新的钩子：
1. 在 `src/hooks/{name}/` 目录下创建钩子工厂函数
2. 在相应的层级文件中注册 (`create-*-hooks.ts`)
3. 在 `src/config/schema/hooks.ts` 中添加钩子名称
4. 钩子会自动被 `createHooks` 函数包含

## 复杂钩子示例

### todo-continuation-enforcer (TODO 延续强制器)
**功能**: 当有未完成的 TODO 时，强制代理继续工作。

**实现**:
1. 监控会话空闲事件
2. 检查 TODO 列表状态
3. 如果有未完成的 TODO，注入继续工作的提示
4. 使用指数退避算法处理连续失败

### atlas (主协调器)
**功能**: 协调 Boulder 会话的后台任务。

**实现**:
1. 决策门：会话类型 → 中止检查 → 失败计数 → 后台任务
2. 代理匹配 → 计划完整性 → 冷却时间（5秒）
3. 在会话空闲时注入延续提示

## 学习要点

### 对于 TypeScript 初学者

1. **分层架构**: 学习如何设计复杂的多层级系统
2. **工厂模式**: 学习如何创建复杂的对象图
3. **事件驱动**: 学习钩子如何响应系统事件
4. **资源管理**: 学习如何正确清理资源
5. **配置驱动**: 学习如何根据配置动态调整行为

### 最佳实践
- 使用工厂函数封装复杂创建逻辑
- 通过参数注入所有依赖
- 提供资源清理机制
- 使用配置驱动功能开关
- 设计可测试的钩子接口
- 使用类型安全确保正确性

## 相关文件

1. `src/plugin/hooks/create-core-hooks.ts` - 核心钩子创建
2. `src/plugin/hooks/create-continuation-hooks.ts` - 延续钩子创建  
3. `src/plugin/hooks/create-skill-hooks.ts` - 技能钩子创建
4. `src/hooks/` - 所有钩子实现
5. `src/config/schema/hooks.ts` - 钩子名称 schema

这个钩子工厂展示了如何构建可扩展、可配置、类型安全的钩子系统，是学习 TypeScript 和事件驱动架构的优秀示例。