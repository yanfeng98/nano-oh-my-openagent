# Installation

## For Humans

Run the interactive installer:

```bash
bunx oh-my-opencode install # recommended
npx oh-my-opencode install # alternative
```

> **Note**: The CLI ships with standalone binaries for all major platforms. No runtime (Bun/Node.js) is required for CLI execution after installation.
>
> **Supported platforms**: macOS (ARM64, x64), Linux (x64, ARM64, Alpine/musl), Windows (x64)

Follow the prompts to configure your Claude, ChatGPT, and Gemini subscriptions. After installation, authenticate your providers as instructed.

### Step 1: Install OpenCode (if not installed)

```bash
if command -v opencode &> /dev/null; then
    echo "OpenCode $(opencode --version) is installed"
else
    echo "OpenCode is not installed. Please install it first."
    echo "Ref: https://opencode.ai/docs"
fi
```

If OpenCode isn't installed, check the [OpenCode Installation Guide](https://opencode.ai/docs).

### Step 2: Run the installer

Based on user's answers, run the CLI installer with appropriate flags:

```bash
bunx oh-my-opencode install --no-tui --claude=<yes|no|max20> --gemini=<yes|no> --copilot=<yes|no> [--openai=<yes|no>] [--opencode-go=<yes|no>] [--opencode-zen=<yes|no>] [--zai-coding-plan=<yes|no>]
```

**Examples:**

- User has all native subscriptions: `bunx oh-my-opencode install --no-tui --claude=max20 --openai=yes --gemini=yes --copilot=no`
- User has only Claude: `bunx oh-my-opencode install --no-tui --claude=yes --gemini=no --copilot=no`
- User has Claude + OpenAI: `bunx oh-my-opencode install --no-tui --claude=yes --openai=yes --gemini=no --copilot=no`
- User has only GitHub Copilot: `bunx oh-my-opencode install --no-tui --claude=no --gemini=no --copilot=yes`
- User has Z.ai for Librarian: `bunx oh-my-opencode install --no-tui --claude=yes --gemini=no --copilot=no --zai-coding-plan=yes`
- User has only OpenCode Zen: `bunx oh-my-opencode install --no-tui --claude=no --gemini=no --copilot=no --opencode-zen=yes`
- User has OpenCode Go only: `bunx oh-my-opencode install --no-tui --claude=no --openai=no --gemini=no --copilot=no --opencode-go=yes`
- User has no subscriptions: `bunx oh-my-opencode install --no-tui --claude=no --gemini=no --copilot=no`

The CLI will:

- Register the plugin in `opencode.json`
- Configure agent models based on subscription flags
- Show which auth steps are needed

### Step 3: Verify Setup

```bash
opencode --version  # Should be 1.0.150 or higher
cat ~/.config/opencode/opencode.json  # Should contain "oh-my-opencode" in plugin array
```

### Step 4: Understand Your Model Setup

You've just configured oh-my-opencode. Here's what got set up and why.

#### Model Families: What You're Working With

Not all models behave the same way. Understanding which models are "similar" helps you make safe substitutions later.

**Claude-like Models** (instruction-following, structured output):

| Model                    | Provider(s)                         | Notes                                                                   |
| ------------------------ | ----------------------------------- | ----------------------------------------------------------------------- |
| **Claude Opus 4.6**      | anthropic, github-copilot, opencode | Best overall. Default for Sisyphus.                                     |
| **Claude Sonnet 4.6**    | anthropic, github-copilot, opencode | Faster, cheaper. Good balance.                                          |
| **Claude Haiku 4.5**     | anthropic, opencode                 | Fast and cheap. Good for quick tasks.                                   |
| **Kimi K2.5**            | kimi-for-coding                     | Behaves very similarly to Claude. Great all-rounder. Default for Atlas. |
| **Kimi K2.5 Free**       | opencode                            | Free-tier Kimi. Rate-limited but functional.                            |
| **GLM 5**                | zai-coding-plan, opencode           | Claude-like behavior. Good for broad tasks.                             |
| **Big Pickle (GLM 4.6)** | opencode                            | Free-tier GLM. Decent fallback.                                         |

**GPT Models** (explicit reasoning, principle-driven):

| Model             | Provider(s)                      | Notes                                             |
| ----------------- | -------------------------------- | ------------------------------------------------- |
| **GPT-5.3-codex** | openai, github-copilot, opencode | Deep coding powerhouse. Required for Hephaestus.  |
| **GPT-5.4**       | openai, github-copilot, opencode | High intelligence. Default for Oracle.            |
| **GPT-5-Nano**    | opencode                         | Ultra-cheap, fast. Good for simple utility tasks. |

**Different-Behavior Models**:

| Model                 | Provider(s)                      | Notes                                                       |
| --------------------- | -------------------------------- | ----------------------------------------------------------- |
| **Gemini 3 Pro**      | google, github-copilot, opencode | Excels at visual/frontend tasks. Different reasoning style. |
| **Gemini 3 Flash**    | google, github-copilot, opencode | Fast, good for doc search and light tasks.                  |
| **MiniMax M2.5**      | venice                           | Fast and smart. Good for utility tasks.                     |
| **MiniMax M2.5 Free** | opencode                         | Free-tier MiniMax. Fast for search/retrieval.               |

**Speed-Focused Models**:

| Model                   | Provider(s)            | Speed          | Notes                                                                                                                                         |
| ----------------------- | ---------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Grok Code Fast 1**    | github-copilot, venice | Very fast      | Optimized for code grep/search. Default for Explore.                                                                                          |
| **Claude Haiku 4.5**    | anthropic, opencode    | Fast           | Good balance of speed and intelligence.                                                                                                       |
| **MiniMax M2.5 (Free)** | opencode, venice       | Fast           | Smart for its speed class.                                                                                                                    |
| **GPT-5.3-codex-spark** | openai                 | Extremely fast | Blazing fast but compacts so aggressively that oh-my-opencode's context management doesn't work well with it. Not recommended for omo agents. |

#### What Each Agent Does and Which Model It Got

Based on your subscriptions, here's how the agents were configured:

**Claude-Optimized Agents** (prompts tuned for Claude-family models):

| Agent        | Role             | Default Chain                                   | What It Does                                                                             |
| ------------ | ---------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Sisyphus** | Main ultraworker | Opus (max) → Kimi K2.5 → GLM 5 → Big Pickle     | Primary coding agent. Orchestrates everything. **Never use GPT — no GPT prompt exists.** |
| **Metis**    | Plan review      | Opus (max) → Kimi K2.5 → GPT-5.4 → Gemini 3 Pro | Reviews Prometheus plans for gaps.                                                       |

**Dual-Prompt Agents** (auto-switch between Claude and GPT prompts):

These agents detect your model family at runtime and switch to the appropriate prompt. If you have GPT access, these agents can use it effectively.

Priority: **Claude > GPT > Claude-like models**

| Agent          | Role              | Default Chain                                              | GPT Prompt?                                                      |
| -------------- | ----------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| **Prometheus** | Strategic planner | Opus (max) → **GPT-5.4 (high)** → Kimi K2.5 → Gemini 3 Pro | Yes — XML-tagged, principle-driven (~300 lines vs ~1,100 Claude) |
| **Atlas**      | Todo orchestrator | **Kimi K2.5** → Sonnet → GPT-5.4                           | Yes — GPT-optimized todo management                              |

**GPT-Native Agents** (built for GPT, don't override to Claude):

| Agent          | Role                   | Default Chain                          | Notes                                                  |
| -------------- | ---------------------- | -------------------------------------- | ------------------------------------------------------ |
| **Hephaestus** | Deep autonomous worker | GPT-5.3-codex (medium) only            | "Codex on steroids." No fallback. Requires GPT access. |
| **Oracle**     | Architecture/debugging | GPT-5.4 (high) → Gemini 3 Pro → Opus   | High-IQ strategic backup. GPT preferred.               |
| **Momus**      | High-accuracy reviewer | GPT-5.4 (medium) → Opus → Gemini 3 Pro | Verification agent. GPT preferred.                     |

**Utility Agents** (speed over intelligence):

These agents do search, grep, and retrieval. They intentionally use fast, cheap models. **Don't "upgrade" them to Opus — it wastes tokens on simple tasks.**

| Agent                 | Role               | Default Chain                                                          | Design Rationale                                               |
| --------------------- | ------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Explore**           | Fast codebase grep | MiniMax M2.5 Free → Grok Code Fast → MiniMax M2.5 → Haiku → GPT-5-Nano | Speed is everything. Grok is blazing fast for grep.            |
| **Librarian**         | Docs/code search   | MiniMax M2.5 Free → Gemini Flash → Big Pickle                          | Entirely free-tier. Doc retrieval doesn't need deep reasoning. |
| **Multimodal Looker** | Vision/screenshots | Kimi K2.5 → Kimi Free → Gemini Flash → GPT-5.4 → GLM-4.6v              | Kimi excels at multimodal understanding.                       |

#### Why Different Models Need Different Prompts

Claude and GPT models have fundamentally different instruction-following behaviors:

- **Claude models** respond well to **mechanics-driven** prompts — detailed checklists, templates, step-by-step procedures. More rules = more compliance.
- **GPT models** (especially 5.2+) respond better to **principle-driven** prompts — concise principles, XML-tagged structure, explicit decision criteria. More rules = more contradiction surface = more drift.

Key insight from Codex Plan Mode analysis:

- Codex Plan Mode achieves the same results with 3 principles in ~121 lines that Prometheus's Claude prompt needs ~1,100 lines across 7 files
- The core concept is **"Decision Complete"** — a plan must leave ZERO decisions to the implementer
- GPT follows this literally when stated as a principle; Claude needs enforcement mechanisms

This is why Prometheus and Atlas ship separate prompts per model family — they auto-detect and switch at runtime via `isGptModel()`.

#### Custom Model Configuration

If the user wants to override which model an agent uses, you can customize in `oh-my-opencode.json`:

```jsonc
{
  "agents": {
    "sisyphus": { "model": "kimi-for-coding/k2p5" },
    "prometheus": { "model": "openai/gpt-5.4" }, // Auto-switches to the GPT prompt
  },
}
```

**Selection Priority:**

When choosing models for Claude-optimized agents:

```
Claude (Opus/Sonnet) > GPT (if agent has dual prompt) > Claude-like (Kimi K2.5, GLM 5)
```

When choosing models for GPT-native agents:

```
GPT (5.3-codex, 5.2) > Claude Opus (decent fallback) > Gemini (acceptable)
```

**Safe vs Dangerous Overrides:**

**Safe** (same family):

- Sisyphus: Opus → Sonnet, Kimi K2.5, GLM 5
- Prometheus: Opus → GPT-5.4 (auto-switches prompt)
- Atlas: Kimi K2.5 → Sonnet, GPT-5.4 (auto-switches)

**Dangerous** (no prompt support):

- Sisyphus → GPT: **No GPT prompt. Will degrade significantly.**
- Hephaestus → Claude: **Built for Codex. Claude can't replicate this.**
- Explore → Opus: **Massive cost waste. Explore needs speed, not intelligence.**
- Librarian → Opus: **Same. Doc search doesn't need Opus-level reasoning.**

#### Provider Priority Chain

When multiple providers are available, oh-my-opencode uses this priority:

```
Native (anthropic/, openai/, google/) > Kimi for Coding > GitHub Copilot > Venice > OpenCode Zen > Z.ai Coding Plan
```

### ⚠️ Warning

**Unless the user explicitly requests it, do not change model settings or disable features (agents, hooks, MCPs).**

The plugin works perfectly by default. Do not change settings or turn off features without an explicit request.

### Step 5: Verification and Next Steps

1. **Feeling lazy?** Just include `ultrawork` (or `ulw`) in your prompt. That's it. The agent figures out the rest.

2. **Need precision?** Press **Tab** to enter Prometheus (Planner) mode, create a work plan through an interview process, then run `/start-work` to execute it with full orchestration.
