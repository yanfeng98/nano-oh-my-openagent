# 什么是 Oh My OpenCode？

Oh My OpenCode 是一个用于 OpenCode 的多模型智能体编排框架。它将单个 AI 智能体转变为一个真正能交付代码的协调开发团队。

不锁定于 Claude。不锁定于 OpenAI。不锁定于任何人。

只是更好的结果，更便宜的模型，真正的编排。

---

## 快速开始

### 安装

将以下内容粘贴到您的 LLM 智能体会话中：

```
按照此处的说明安装和配置 oh-my-opencode：
https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/refs/heads/dev/docs/guide/installation.md
```

或者阅读完整的[安装指南](./installation.md)了解手动设置、提供商身份验证和故障排除。

### 您的第一个任务

安装完成后，只需输入：

```
ultrawork
```

就这样。智能体会自动处理一切——探索您的代码库、研究模式、实现功能、通过诊断进行验证。持续工作直到完成。

想要更多控制？按 **Tab** 键进入 [Prometheus 模式](./orchestration.md)进行基于访谈的规划，然后运行 `/start-work` 进行完整编排。

---

## 核心理念：打破束缚

我们曾称此为"打了兴奋剂的 Claude Code"。这是错误的。

这不仅仅是让 Claude Code 变得更好。这是要打破那种认为一个模型、一个提供商、一种工作方式就足够的想法。Anthropic 想让您锁定。OpenAI 想让您锁定。每个人都想让您锁定。

Oh My OpenCode 不玩这个游戏。它在模型之间进行编排，为每个任务选择合适的大脑。Claude 用于编排。GPT 用于深度推理。Gemini 用于前端。Haiku 用于快速任务。所有模型协同工作，自动进行。

---

## 工作原理：智能体编排

与一个智能体处理所有事情不同，Oh My OpenCode 使用**基于任务类型相互委托的专门智能体**。

**架构：**

```
用户请求
    ↓
[意图网关] — 分类您实际想要什么
    ↓
[Sisyphus] — 主要编排器，规划和委托
    ↓
    ├─→ [Prometheus] — 战略规划（访谈模式）
    ├─→ [Atlas] — Todo编排和执行
    ├─→ [Oracle] — 架构咨询
    ├─→ [Librarian] — 文档/代码搜索
    ├─→ [Explore] — 快速代码库 grep
    └─→ [基于类别的智能体] — 按任务类型专门化
```

当 Sisyphus 委托给子智能体时，它不选择模型名称。它选择一个**类别**——`visual-engineering`、`ultrabrain`、`quick`、`deep`。类别自动映射到正确的模型。您无需干预。

要深入了解智能体如何协作，请参阅[编排系统指南](./orchestration.md)。

---

## 认识智能体

### Sisyphus：纪律智能体

以希腊神话命名。他每天推石上山。永不停止。永不放弃。

Sisyphus 是您的主要编排器。他规划、委托给专家，并通过积极的并行执行将任务推向完成。他不会半途而废。他不会分心。他会完成。

**推荐模型：**

- **Claude Opus 4.6** — 最佳整体体验。Sisyphus 是使用 Claude 优化的提示构建的。
- **Claude Sonnet 4.6** — 能力和成本的良好平衡。
- **Kimi K2.5** — 优秀的类 Claude 替代品。许多用户专门使用此组合。
- **GLM 5** — 可靠选项，特别是通过 Z.ai。

Sisyphus 在 Claude 系列模型、Kimi 和 GLM 上仍然效果最佳。GPT-5.4 现在有专门的提示路径，但较旧的 GPT 模型仍然不适合，应路由到 Hephaestus。

### Hephaestus：合法的工匠

命名带有讽刺意味。Anthropic 因此项目阻止了 OpenCode 使用其 API。所以团队构建了一个自主的 GPT 原生智能体。

Hephaestus 运行在 GPT-5.3 Codex 上。给他一个目标，而不是一个配方。他探索代码库、研究模式，并在无需手把手指导的情况下端到端执行。他是合法的工匠，因为他诞生于必要性，而非特权。

当您需要深度架构推理、跨多个文件的复杂调试或跨领域知识综合时使用 Hephaestus。当工作需要 GPT-5.3 Codex 的特定优势时，请明确切换到它。

**为什么这比纯 Codex CLI 更好：**

- **多模型编排。** 纯 Codex 是单模型的。OmO 自动将不同任务路由到不同模型。GPT 用于深度推理。Gemini 用于前端。Haiku 用于速度。为每个任务选择合适的大脑。
- **后台智能体。** 并行启动 5 个以上的智能体。这是 Codex 根本无法做到的。当一个智能体编写代码时，另一个研究模式，另一个检查文档。就像一个真正的开发团队。
- **类别系统。** 任务按意图路由，而不是模型名称。`visual-engineering` 获得 Gemini。`ultrabrain` 获得 GPT-5.4。`quick` 获得 Haiku。无需手动切换。
- **积累的智慧。** 子智能体从先前结果中学习。在任务 1 中发现的约定会传递给任务 5。早期犯的错误不会重复。系统在工作时变得更智能。

### Prometheus：战略规划师

Prometheus 像真正的工程师一样采访您。提出澄清问题。识别范围和模糊性。在接触一行代码之前构建详细计划。

按 **Tab** 键进入 Prometheus 模式，或从 Sisyphus 输入 `@plan "您的任务"`。

### Atlas：指挥家

Atlas 执行 Prometheus 的计划。将任务分发给专门的子智能体。跨任务积累学习。独立验证完成情况。

运行 `/start-work` 在您的最新计划上激活 Atlas。

### Oracle：顾问

用于架构决策和复杂调试的只读高智商顾问。当面对不熟悉的模式、安全考虑或多系统权衡时，请咨询 Oracle。

### 支持团队

- **Metis** — 差距分析器。在计划最终确定之前捕获 Prometheus 遗漏的内容。
- **Momus** — 无情审查员。根据清晰度、验证和上下文标准验证计划。
- **Explore** — 快速代码库 grep。使用速度优先的模型进行模式发现。
- **Librarian** — 文档和开源代码搜索。保持对库 API 和最佳实践的更新。
- **Multimodal Looker** — 视觉和截图分析。

---

## 工作模式

### Ultrawork 模式：为懒人设计

输入 `ultrawork` 或仅输入 `ulw`。就这样。

智能体会自动处理一切。探索您的代码库。研究模式。实现功能。通过诊断进行验证。持续工作直到完成。

这是"直接做"模式。完全自动。您无需深入思考，因为智能体会为您深入思考。

### Prometheus 模式：为精确设计

按 **Tab** 键进入 Prometheus 模式。

Prometheus 像真正的工程师一样采访您。提出澄清问题。识别范围和模糊性。在接触一行代码之前构建详细计划。

然后运行 `/start-work`，Atlas 接管。任务分发给专门的子智能体。每个完成都独立验证。学习跨任务积累。进度跨会话跟踪。

将 Prometheus 用于多日项目、关键生产变更、复杂重构，或当您想要有文档记录的决策轨迹时。

---

## 智能体模型匹配

不同的智能体与不同的模型配合最佳。Oh My OpenCode 自动分配最优模型，但您可以自定义一切。

### 默认配置

模型在安装时自动配置。交互式安装程序询问您拥有哪些提供商，然后为每个智能体和类别生成最优的模型分配。

在运行时，回退链确保即使您首选的提供商宕机，工作也能继续。每个智能体都有一个提供商优先级链。系统按顺序尝试提供商，直到找到可用的模型。

### 自定义模型配置

您可以在配置中覆盖特定的智能体或类别：

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/assets/oh-my-opencode.schema.json",

  "agents": {
    // 主要编排器：Claude Opus 或 Kimi K2.5 效果最佳
    "sisyphus": {
      "model": "kimi-for-coding/k2p5",
      "ultrawork": { "model": "anthropic/claude-opus-4-6", "variant": "max" },
    },

    // 研究智能体：更便宜的模型即可
    "librarian": { "model": "google/gemini-3-flash" },
    "explore": { "model": "github-copilot/grok-code-fast-1" },

    // 架构咨询：GPT 或 Claude Opus
    "oracle": { "model": "openai/gpt-5.4", "variant": "high" },
  },

  "categories": {
    // 前端工作：Gemini 在视觉任务中占主导地位
    "visual-engineering": {
      "model": "google/gemini-3.1-pro",
      "variant": "high",
    },

    // 一般高工作量任务
    "unspecified-high": { "model": "anthropic/claude-opus-4-6", "variant": "max" },

    // 快速任务：使用最便宜的模型
    "quick": { "model": "anthropic/claude-haiku-4-5" },

    // 深度推理：GPT-5.4
    "ultrabrain": { "model": "openai/gpt-5.4", "variant": "xhigh" },
  },
}
```

### 模型家族

**类 Claude 模型**（遵循指令，结构化输出）：
- Claude Opus 4.6、Claude Sonnet 4.6、Claude Haiku 4.5
- Kimi K2.5 — 行为与 Claude 非常相似
- GLM 5 — 类 Claude 行为，适用于广泛任务

**GPT 模型**（显式推理，原则驱动）：
- GPT-5.3-codex — 深度编码动力源，Hephaestus 必需
- GPT-5.4 — 高智能，Oracle 默认
- GPT-5-Nano — 超便宜，快速实用任务

**不同行为模型**：
- Gemini 3 Pro — 在视觉/前端任务中表现出色
- MiniMax M2.5 — 快速智能，适用于实用任务
- Grok Code Fast 1 — 为代码 grep/搜索优化

有关哪些模型最适合每个智能体、安全与危险覆盖以及提供商优先级链的完整详细信息，请参阅[智能体模型匹配指南](./agent-model-matching.md)。

---

## 为什么它比纯 Claude Code 更好

Claude Code 很好。但它是一个运行单一模型、独自处理所有事情的单一智能体。

Oh My OpenCode 将其转变为一个协调的团队：

**并行执行。** Claude Code 一次处理一件事。OmO 并行启动后台智能体——研究、实现和验证同时进行。就像拥有 5 个工程师而不是 1 个。

**哈希锚定编辑。** 当模型无法完全重现行时，Claude Code 的编辑工具会失败。OmO 的 `LINE#ID` 内容哈希在应用前验证每个编辑。仅此更改就让 Grok Code Fast 1 的成功率从 6.7% 提高到 68.3%。

**意图网关。** Claude Code 接受您的提示并运行。OmO 首先分类您的真实意图——研究、实现、调查、修复——然后相应路由。更少的误解，更好的结果。

**LSP + AST 工具。** 工作区级重命名、转到定义、查找引用、预构建诊断、AST 感知的代码重写。IDE 级别的精度，这是纯 Claude Code 所没有的。

**带有嵌入式 MCP 的技能。** 每个技能都带来自己的 MCP 服务器，限定在任务范围内。上下文窗口保持清洁，而不是被每个工具膨胀。

**纪律执行。** Todo 强制执行器将空闲的智能体拉回工作。评论检查器去除 AI 废话。Ralph Loop 持续到 100% 完成。系统不会让智能体偷懒。

**根本优势。** 模型有不同的气质。Claude 深入思考。GPT 进行架构推理。Gemini 可视化。Haiku 快速移动。单模型工具迫使您为所有任务选择一种个性。Oh My OpenCode 利用它们全部，按任务类型路由。这不是一个临时 hack——这是随着模型进一步专门化，唯一有意义的架构。多模型编排与单模型限制之间的差距每个月都在扩大。我们押注于那个未来。

---

## 意图网关

在响应任何请求之前，Sisyphus 会分类您的真实意图。

您是要求研究？实现？调查？修复？意图网关弄清楚您实际想要什么，而不仅仅是您输入的字面意思。这意味着智能体理解上下文、细微差别以及您请求背后的真实目标。

Claude Code 没有这个。它接受您的提示并运行。Oh My OpenCode 先思考，后行动。

---

## 下一步

- **[安装指南](./installation.md)** — 完整的设置说明、提供商身份验证和故障排除
- **[编排指南](./orchestration.md)** — 深入探讨智能体协作、使用 Prometheus 规划和 Atlas 执行
- **[智能体模型匹配指南](./agent-model-matching.md)** — 哪些模型最适合每个智能体以及如何自定义
- **[配置参考](../reference/configuration.md)** — 完整配置选项及示例
- **[功能参考](../reference/features.md)** — 完整功能文档
- **[宣言](../manifesto.md)** — 项目背后的哲学

---

**准备好开始了吗？** 输入 `ultrawork`，看看一个协调的 AI 团队能做什么。