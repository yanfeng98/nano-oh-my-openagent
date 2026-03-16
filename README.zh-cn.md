# Oh My OpenCode

### 智能体调度机制

当 Sisyphus 把任务分配给子智能体时，他选择的不是具体的模型，而是 **类别 (Category)**。系统会自动将类别映射到最合适的模型：

| 类别                 | 作用领域               |
| :------------------- | :--------------------- |
| `visual-engineering` | 前端、UI/UX、设计      |
| `deep`               | 深度自主调研与执行     |
| `quick`              | 单文件修改、修错字     |
| `ultrabrain`         | 复杂硬核逻辑、架构决策 |

智能体只需要说明要做什么类型的工作，框架就会挑选出最合适的模型去干。你完全不需要操心。

### 完全兼容 Claude Code

你已经花了大力气调教好了 Claude Code 的配置？太好了。

这里完美兼容所有的 Hook、命令、技能、MCP 以及插件。所有配置直接生效，包括插件系统。

### 赋予 Agent 世界级的开发工具

LSP、AST-Grep、Tmux、MCP 并不是用胶水勉强糊在一起的，而是真正深度的集成。

- **LSP**: 支持 `lsp_rename`、`lsp_goto_definition`、`lsp_find_references` 和 `lsp_diagnostics`。给 Agent 提供 IDE 般的精准操作。
- **AST-Grep**: 支持 25 种编程语言，能够理解语法树的模式匹配和代码重写。
- **Tmux**: 真实的交互式终端环境，支持 REPL、调试器以及 TUI 工具。Agent 的进程持久运行。
- **MCP**: 内置 Web 搜索、官方文档直连以及 GitHub 级代码搜索。

### 技能专属的按需 MCP 服务器

一堆全局 MCP 服务器极其消耗 Context 额度，我们修好了这个问题。

现在每个技能 (Skill) 都带着自己的专属 MCP。只在执行该任务时启动，任务完成即刻销毁。Context 窗口始终清爽。

### 拒绝瞎改：基于内容哈希的编辑工具 (Hash-Anchored Edits)

Harness 问题是真的。绝大多数所谓的 Agent 故障，其实并不是大模型变笨了，而是他们用的文件编辑工具太烂了。

> *“目前所有工具都无法为模型提供一种稳定、可验证的行定位标识……它们全都依赖于模型去强行复写一遍自己刚才看到的原文。当模型一旦写错——而且这很常见——用户就会怪罪于大模型太蠢了。”*
>
> <br/>- [Can Bölük, The Harness Problem](https://blog.can.ac/2026/02/12/the-harness-problem/)

受 [oh-my-pi](https://github.com/can1357/oh-my-pi) 的启发，我们实现了 **Hashline** 技术。Agent 读到的每一行代码，末尾都会打上一个强绑定的内容哈希值：

```
11#VK| function hello() {
22#XJ|   return "world";
33#MB| }
```

Agent 发起修改时，必须通过这些标签引用目标行。如果在此期间文件发生过变化，哈希验证就会失败，从而在代码被污染前直接驳回。不再有缩进空格错乱，彻底告别改错行的惨剧。

在 Grok Code Fast 1 上，仅仅因为更换了这套编辑工具，修改成功率直接从 **6.7% 飙升至 68.3%**。

### 深度上下文初始化：`/init-deep`

执行一次 `/init-deep`。它会为你生成一个树状的 `AGENTS.md` 文件系统：

```
project/
├── AGENTS.md              ← 全局级架构与约定
├── src/
│   ├── AGENTS.md          ← src 级规范
│   └── components/
│       └── AGENTS.md      ← 组件级详细说明
```

Agent 会自动顺藤摸瓜加载对应的 Context，免去了你所有的手动喂喂喂的麻烦。

### 让 Agent 动手前先过脑子：Prometheus

碰到了硬骨头？千万不要扔个 Prompt 就双手合十祈祷。

输入 `/start-work`，召唤 Prometheus 出场。**他会像一个真实的主管那样去采访你**，主动深挖需求、指出模糊地带，并在改动哪怕一行代码之前产出经过严密论证的计划。你的 Agent 终于知道了自己在干嘛。

### 技能系统 (Skills)

这里的 Skills 绝不只是一段无脑的 Prompt 模板。它们包含了：

- 面向特定领域的极度调优系统指令
- 按需加载的独立 MCP 服务器
- 对 Agent 能力边界的强制约束

默认内置：`playwright`（极其稳健的浏览器自动化）、`git-master`（全自动的原子级提交及 rebase 手术）、`frontend-ui-ux`（设计感拉满的 UI 实现）。

想加你自己的？放进 `.opencode/skills/*/SKILL.md` 或者 `~/.config/opencode/skills/*/SKILL.md` 就行。

**想看所有的硬核功能说明吗？** 点击查看 **[详细特性文档 (Features)](docs/reference/features.md)** ，深入了解 Agent 架构、Hook 流水线、核心工具链和所有的内置 MCP 等等。

---

> **第一次用 oh-my-opencode？** 阅读 **[概述](docs/guide/overview.md)** 了解你拥有哪些功能，或查看 **[编排指南](docs/guide/orchestration.md)** 了解 Agent 如何协作。

## 如何卸载 (Uninstallation)

要移除 oh-my-opencode:

1. **从你的 OpenCode 配置文件中去掉插件**

   编辑 `~/.config/opencode/opencode.json` (或 `opencode.jsonc`) ，并把 `"oh-my-opencode"` 从 `plugin` 数组中删掉：

   ```bash
   # 如果你有 jq 的话
   jq '.plugin = [.plugin[] | select(. != "oh-my-opencode")]' \
       ~/.config/opencode/opencode.json > /tmp/oc.json && \
       mv /tmp/oc.json ~/.config/opencode/opencode.json
   ```

2. **清除配置文件 (可选)**

   ```bash
   # 移除全局用户配置
   rm -f ~/.config/opencode/oh-my-opencode.json ~/.config/opencode/oh-my-opencode.jsonc

   # 移除当前项目的配置
   rm -f .opencode/oh-my-opencode.json .opencode/oh-my-opencode.jsonc
   ```

3. **确认卸载成功**

   ```bash
   opencode --version
   # 这个时候就应该没有任何关于插件的输出信息了
   ```

## 闲聊环节 (Author's Note)

**想知道做这个插件的哲学理念吗？** 阅读 [Ultrawork 宣言](docs/manifesto.md)。

---

我为了做个人项目，烧掉了整整 $24,000 的 LLM API Token 费用。我把市面上每个宣称好用的代码 Agent 全试了一遍，配置选项被我翻得底朝天。最后我得出了结论，OpenCode 赢了。

我踩过的坑、撞过的南墙，它们的终极解法现在全都被硬编码到了这个插件里。你只需要安装，然后直接用。

如果把 OpenCode 喻为底层的 Debian/Arch，那么 OmO 毫无疑问就是开箱即用的 Ubuntu/[Omarchy](https://omarchy.org/)。

本项目受到 [AmpCode](https://ampcode.com) 和 [Claude Code](https://code.claude.com/docs/overview) 的深刻启发。我把他们好用的特性全都搬了过来，且在很多地方做了底层强化。它仍在活跃开发中，因为毕竟，这是 **Open**Code。

其他调度框架只会给你画饼画一张很酷的 Multi-Agent 大饼。我们把饼烙出来了。不仅能用，而且极其稳定。所有的功能都不是为了炫技，而是真的能把任务干完。

因为我自己就是这个项目最偏执、最神经质的极端用户：
- 哪个模型在处理变态业务逻辑时最不容易晕？
- 谁是修 Bug 的神？
- 谁文笔最好、最不 AI 味？
- 谁能在前端交互上碾压一切？
- 后端性能谁来抗？
- 谁又快又便宜适合打杂？
- 竞争对手们今天又发了啥牛逼的功能，能抄吗？

这个插件是以上一切的结晶 (Distillation)。直接拿走去用。如果有更好的点子，PR 大门永远敞开。

**别再浪费时间去到处对比选哪个框架好了。**
**我会去市面上调研，把最强的特性全偷过来，然后在这更新。**

听起来很自大吗？如果你有更牛逼的实现思路，那就交 PR，热烈欢迎。

郑重声明：本项目与文档中提及的任何框架/大模型供应商**均无利益相关**，这完完全全就是一次走火入魔的个人硬核实验成果。

本项目 99% 的代码都是直接由 OpenCode 生成的。我本人其实并不懂 TypeScript。**但我以人格担保，这个 README 是我亲自审核并且大幅度重写过的。**

## 以下公司的专业开发人员都在用

- [Indent](https://indentcorp.com)
  - 开发了 Spray - 意见领袖营销系统, vovushop - 跨境电商独立站, vreview - AI 赋能的电商买家秀营销解决方案
- [Google](https://google.com)
- [Microsoft](https://microsoft.com)
- [ELESTYLE](https://elestyle.jp)
  - 开发了 elepay - 全渠道移动支付网关, OneQR - 专为无现金社会打造的移动 SaaS 生态系统

*特别感谢 [@junhoyeo](https://github.com/junhoyeo) 为我们设计的令人惊艳的首图（Hero Image）。*
