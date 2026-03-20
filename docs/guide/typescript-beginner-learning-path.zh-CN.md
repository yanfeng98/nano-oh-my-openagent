# 📚 TypeScript初学者学习路径：如何阅读和修改oh-my-opencode项目

*最后更新：2026-03-20*

## 🎯 项目概览

**oh-my-opencode** 是一个开源的OpenCode插件，提供：
- **11个AI代理**协调工作（Sisyphus、Hephaestus、Oracle等）
- **46个生命周期钩子** 管理各种事件
- **26个工具**（LSP、AST-grep、Tmux等）
- **模块化架构**，遵循严格的代码规范

## 📖 学习路径（从易到难）

### 阶段1：了解基础架构（1-2天）

**目标**：理解项目的整体结构和核心概念

**建议学习顺序**：
1. **阅读项目文档**：
   - `README.md` - 项目介绍和核心功能
   - `docs/guide/installation.zh-CN.md` - 中文安装指南
   - `AGENTS.md` - 项目架构总览

2. **分析入口文件**：
   ```bash
   # 查看插件初始化流程
   cat src/index.ts
   ```
   - 理解 `OhMyOpenCodePlugin` 的5步初始化流程
   - 学习工厂模式（每个模块都有 `createXXX()` 函数）

3. **理解配置系统**：
   ```bash
   # 查看配置加载
   cat src/plugin-config.ts
   cat src/config/schema/oh-my-opencode-config.ts
   ```
   - 学习Zod v4验证模式
   - 理解多级配置合并（用户配置 > 项目配置 > 默认配置）

### 阶段2：学习核心模块（3-5天）

**目标**：掌握关键模块的工作原理

**核心模块学习**：

1. **代理系统**（`src/agents/`）：
   ```bash
   # 分析Explore代理
   cat src/agents/explore.ts
   ```
   - 学习代理如何搜索代码库
   - 理解 `createExploreAgent()` 工厂函数

2. **工具系统**（`src/tools/`）：
   ```bash
   # 分析任务委托工具
   cat src/tools/delegate-task/index.ts
   cat src/tools/delegate-task/tools.ts
   ```
   - 学习 `task()` 工具如何工作
   - 理解8个内置分类（visual-engineering、ultrabrain等）

3. **后台代理系统**（`src/features/background-agent/`）：
   ```bash
   # 查看任务生命周期管理
   cat src/features/background-agent/index.ts
   ```
   - 学习异步任务的生命周期
   - 理解并发控制（每个模型/提供者最多5个并发任务）

### 阶段3：理解钩子系统（2-3天）

**目标**：掌握46个钩子的工作原理

**钩子分类**：
- **会话钩子**（23个）：管理会话生命周期
- **工具守卫钩子**（10个）：控制工具执行
- **转换钩子**（4个）：消息转换和验证
- **延续钩子**（7个）：任务延续机制
- **技能钩子**（2个）：技能相关功能

**重要钩子**：
- `todo-continuation-enforcer` - "巨石"机制，强制完成待办事项
- `ralph-loop` - 自引用开发循环
- `comment-checker` - 防止AI生成垃圾注释

### 阶段4：实际修改项目（逐步进行）

**目标**：开始进行自定义修改（魔改）

#### 🛠️ 修改建议（从简单到复杂）

**1. 添加新的配置选项**（最简单）：
```typescript
// 1. 在 src/config/schema/oh-my-opencode-config.ts 中添加新字段
export const OhMyOpenCodeConfigSchema = z.object({
  // ... 现有字段
  myCustomOption: z.string().optional().describe("我的自定义选项"),
});

// 2. 在配置文件中使用
// .opencode/oh-my-opencode.jsonc
{
  "myCustomOption": "自定义值"
}
```

**2. 创建简单的工具**（中等难度）：
```typescript
// 1. 创建新目录
mkdir -p src/tools/my-tool

// 2. 创建工厂函数
// src/tools/my-tool/index.ts
export function createMyTool(options: MyToolOptions) {
  return tool({
    description: "我的自定义工具",
    args: {
      input: tool.schema.string().describe("输入参数"),
    },
    execute: async ({ input }) => {
      // 实现逻辑
      return `处理结果: ${input}`;
    },
  });
}
```

**3. 添加新的代理类型**（较难）：
```typescript
// 1. 在 src/agents/ 中添加新代理
// src/agents/my-agent.ts
export function createMyAgent(options: MyAgentOptions) {
  return createAgent({
    name: "my-agent",
    model: options.model || "claude-haiku-4-5",
    systemPrompt: `你是一个自定义代理...`,
    // ... 其他配置
  });
}
```

**4. 创建新的钩子**（高级）：
```typescript
// 1. 创建钩子目录
mkdir -p src/hooks/my-hook

// 2. 实现钩子工厂
// src/hooks/my-hook/index.ts
export function createMyHook(deps: MyHookDeps) {
  return (event: HookEvent, ctx: HookContext) => {
    // 处理特定事件
    if (event.type === "tool.execute.before") {
      // 在工具执行前做一些事情
    }
  };
}
```

## 🚀 实战练习项目

**建议按照这个顺序练习**：

1. **练习1：修改欢迎消息**
   - 目标：修改代理的欢迎消息
   - 文件：`src/agents/sisyphus.ts`
   - 难度：⭐

2. **练习2：添加新的命令**
   - 目标：创建 `/my-command` 命令
   - 文件：`src/features/builtin-commands/`
   - 难度：⭐⭐

3. **练习3：创建简单的技能**
   - 目标：创建显示当前时间的技能
   - 文件：`.opencode/skills/show-time/SKILL.md`
   - 难度：⭐⭐⭐

4. **练习4：优化任务委托逻辑**
   - 目标：修改任务委托的优先级逻辑
   - 文件：`src/tools/delegate-task/executor.ts`
   - 难度：⭐⭐⭐⭐

## 📝 代码规范（必须遵守）

项目有严格的代码规范：

1. **单一职责原则**：每个文件只做一件事
2. **200行限制**：任何TypeScript文件超过200行需要拆分
3. **工厂模式**：所有组件都通过 `createXXX()` 函数创建
4. **禁止通用文件名**：禁止使用 `utils.ts`、`helpers.ts`、`service.ts`
5. **依赖注入**：通过参数传递依赖

## 🔧 调试和测试

**调试工具**：
```bash
# 1. 查看日志
tail -f /tmp/oh-my-opencode.log

# 2. 运行测试
bun test

# 3. 类型检查
bun run typecheck
```

**常见问题排查**：
1. **配置错误**：检查 `.opencode/oh-my-opencode.jsonc` 格式
2. **类型错误**：运行 `bun run typecheck` 查看详细错误
3. **钩子不生效**：检查 `disabled_hooks` 配置

## 🎓 学习资源

**TypeScript基础**：
- [TypeScript官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript入门教程](https://ts.xcatliu.com/)

**项目相关**：
- 阅读 `src/shared/` 目录中的工具函数
- 查看 `src/features/` 中的模块实现
- 分析 `src/plugin/` 中的插件集成代码

## 💡 魔改建议

基于项目特点，以下方向适合初学者：

1. **界面定制**：修改代理的回复风格和格式
2. **功能扩展**：添加简单的统计功能（如记录任务完成时间）
3. **集成测试**：为现有功能添加测试用例
4. **文档完善**：补充中文文档和示例

## 🚨 注意事项

1. **不要直接修改核心逻辑**：先从边缘功能开始
2. **保持兼容性**：修改时考虑向后兼容
3. **充分测试**：任何修改都要有对应的测试
4. **阅读现有代码**：理解现有模式后再进行修改

---

## 📁 项目关键文件索引

| 文件/目录 | 作用 | 学习重点 |
|-----------|------|----------|
| `src/index.ts` | 插件入口 | 5步初始化流程 |
| `src/plugin-config.ts` | 配置加载 | Zod验证、多级合并 |
| `src/agents/` | 代理系统 | 11个AI代理的实现 |
| `src/tools/` | 工具系统 | 26个工具的实现 |
| `src/hooks/` | 钩子系统 | 46个生命周期钩子 |
| `src/features/` | 功能模块 | 19个独立功能模块 |
| `src/config/` | 配置系统 | 类型定义和验证 |
| `src/shared/` | 共享工具 | 通用工具函数 |

## 🔄 学习循环建议

1. **阅读** → 理解模块结构和设计模式
2. **运行** → 实际运行相关功能，观察行为
3. **修改** → 进行小的、可控的修改
4. **测试** → 验证修改是否正确
5. **文档** → 记录学习心得和修改经验

---

**开始学习**：建议从阶段1开始，先运行项目，理解基本工作流程，然后尝试练习1（修改欢迎消息）。遇到问题时，可以查看相关模块的 `AGENTS.md` 文件获取详细说明。

> *提示：每个模块目录下通常都有 `AGENTS.md` 文件，提供了该模块的详细说明和架构图。*