## 📖 学习路径（从易到难）

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