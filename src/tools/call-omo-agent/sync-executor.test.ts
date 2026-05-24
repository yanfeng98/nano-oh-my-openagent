const { describe, test, expect, mock } = require("bun:test")

type ExecuteSync = typeof import("./sync-executor").executeSync

type PromptAsyncInput = {
  path: { id: string }
  body: {
    agent: string
    model?: { providerID: string; modelID: string }
    variant?: string
    tools: Record<string, boolean>
    parts: Array<{ type: string; text: string }>
  }
}

type ToolContext = {
  sessionID: string
  messageID: string
  agent: string
  abort: AbortSignal
  metadata: ReturnType<typeof mock>
}

// Shared mock references — implementations can be changed per-test.
// mock.module returns these same references, so cached modules see the changes.
const mockCreateOrGetSession = mock(async () => ({ sessionID: "ses-test-123", isNew: true }))
const mockWaitForCompletion = mock(async () => {})
const mockProcessMessages = mock(async () => "agent response")
const mockSetFallbackChain = mock(() => {})
const mockClearFallbackChain = mock(() => {})

mock.module("./session-creator", () => ({
  createOrGetSession: mockCreateOrGetSession,
}))
mock.module("./completion-poller", () => ({
  waitForCompletion: mockWaitForCompletion,
}))
mock.module("./message-processor", () => ({
  processMessages: mockProcessMessages,
}))
mock.module("../../hooks/model-fallback/hook", () => ({
  setSessionFallbackChain: mockSetFallbackChain,
  clearSessionFallbackChain: mockClearFallbackChain,
}))

async function importExecuteSync(): Promise<ExecuteSync> {
  const module = await import("./sync-executor")
  return module.executeSync
}

function createPromptAsyncRecorder(implementation?: (input: PromptAsyncInput) => Promise<unknown>) {
  let capturedInput: PromptAsyncInput | undefined

  const promptAsync = mock(async (input: PromptAsyncInput) => {
    capturedInput = input
    if (implementation) {
      return implementation(input)
    }
    return { data: {} }
  })

  return {
    promptAsync,
    getCapturedInput(): PromptAsyncInput | undefined {
      return capturedInput
    },
  }
}

function createToolContext(): ToolContext {
  return {
    sessionID: "parent-session",
    messageID: "msg-1",
    agent: "sisyphus",
    abort: new AbortController().signal,
    metadata: mock(async () => {}),
  }
}

function createContext(promptAsync: ReturnType<typeof mock>) {
  return {
    client: {
      session: {
        promptAsync,
      },
    },
  }
}

function createBackgroundManager() {
  return {
    reserveSubagentSpawn: mock(async () => ({
      commit: mock(() => 1),
      rollback: mock(() => {}),
    })),
  }
}

describe("executeSync", () => {
  test("sends sync prompt with question and task tools disabled", async () => {
    //#given
    const executeSync = await importExecuteSync()
    const toolContext = createToolContext()
    const recorder = createPromptAsyncRecorder()
    const args = {
      subagent_type: "explore",
      description: "test task",
      prompt: "find something",
      run_in_background: false,
    }

    //#when
    await executeSync(args, toolContext, createContext(recorder.promptAsync) as never, createBackgroundManager())

    //#then
    const promptInput = recorder.getCapturedInput()
    expect(promptInput).toBeDefined()
    expect(promptInput?.path.id).toBe("ses-test-123")
    expect(promptInput?.body.agent).toBe("explore")
    expect(promptInput?.body.tools.question).toBe(false)
    expect(promptInput?.body.tools.task).toBe(false)
    expect(promptInput?.body.parts).toEqual([{ type: "text", text: "find something" }])
  })

  test("passes explicit model and variant to prompt body", async () => {
    //#given
    const executeSync = await importExecuteSync()
    const toolContext = createToolContext()
    const recorder = createPromptAsyncRecorder()
    const args = {
      subagent_type: "explore",
      description: "test task",
      prompt: "find something",
      run_in_background: false,
    }

    //#when
    await executeSync(
      args,
      toolContext,
      createContext(recorder.promptAsync) as never,
      createBackgroundManager(),
      { providerID: "opencodehuoshan", modelID: "deepseek-v3-2-251201", variant: "medium" }
    )

    //#then
    const promptInput = recorder.getCapturedInput()
    expect(promptInput?.body.model).toEqual({ providerID: "opencodehuoshan", modelID: "deepseek-v3-2-251201" })
    expect(promptInput?.body.variant).toBe("medium")
  })

  test("returns processed response with task metadata footer", async () => {
    //#given
    mockCreateOrGetSession.mockImplementation(async () => ({ sessionID: "ses-test-456", isNew: true }))
    mockProcessMessages.mockImplementation(async () => "final answer")

    const executeSync = await importExecuteSync()
    const toolContext = createToolContext()
    const recorder = createPromptAsyncRecorder()
    const args = {
      subagent_type: "librarian",
      description: "search docs",
      prompt: "find docs",
      run_in_background: false,
    }

    //#when
    const result = await executeSync(args, toolContext, createContext(recorder.promptAsync) as never, createBackgroundManager())

    //#then
    expect(result).toContain("final answer")
    expect(result).toContain("<task_metadata>")
    expect(result).toContain("session_id: ses-test-456")
    expect(result).toContain("</task_metadata>")
  })

  test("records metadata with description and created session id", async () => {
    //#given
    mockCreateOrGetSession.mockImplementation(async () => ({ sessionID: "ses-metadata", isNew: true }))

    const executeSync = await importExecuteSync()
    const toolContext = createToolContext()
    const recorder = createPromptAsyncRecorder()
    const args = {
      subagent_type: "explore",
      description: "metadata title",
      prompt: "collect evidence",
      run_in_background: false,
    }

    //#when
    await executeSync(args, toolContext, createContext(recorder.promptAsync) as never, createBackgroundManager())

    //#then
    expect(toolContext.metadata).toHaveBeenCalledWith({
      title: "metadata title",
      metadata: { sessionId: "ses-metadata" },
    })
  })

  test("applies fallback chain to sync sessions before completion polling", async () => {
    //#given
    mockCreateOrGetSession.mockImplementation(async () => ({ sessionID: "ses-fallback", isNew: true }))

    const executeSync = await importExecuteSync()
    const toolContext = createToolContext()
    const recorder = createPromptAsyncRecorder()
    const args = {
      subagent_type: "explore",
      description: "test task",
      prompt: "find something",
      run_in_background: false,
    }
    const fallbackChain = [
      { providers: ["quotio"], model: "kimi-k2.5", variant: undefined },
      { providers: ["openai"], model: "gpt-5.2", variant: "high" },
    ]

    //#when
    await executeSync(
      args,
      toolContext,
      createContext(recorder.promptAsync) as never,
      createBackgroundManager(),
      undefined,
      fallbackChain
    )

    //#then
    expect(mockSetFallbackChain).toHaveBeenCalledWith("ses-fallback", fallbackChain)
  })

  test("returns dedicated agent-not-found error with task metadata", async () => {
    //#given
    mockCreateOrGetSession.mockImplementation(async () => ({ sessionID: "ses-missing-agent", isNew: true }))

    const executeSync = await importExecuteSync()
    const toolContext = createToolContext()
    const recorder = createPromptAsyncRecorder(async () => {
      throw new Error("agent.name is undefined")
    })
    const args = {
      subagent_type: "explore",
      description: "missing agent",
      prompt: "find something",
      run_in_background: false,
    }

    //#when
    const result = await executeSync(args, toolContext, createContext(recorder.promptAsync) as never, createBackgroundManager())

    //#then
    expect(result).toContain('Error: Agent "explore" not found')
    expect(result).toContain("session_id: ses-missing-agent")
  })

  test("returns generic prompt failure with task metadata", async () => {
    //#given
    mockCreateOrGetSession.mockImplementation(async () => ({ sessionID: "ses-prompt-error", isNew: true }))

    const executeSync = await importExecuteSync()
    const toolContext = createToolContext()
    const recorder = createPromptAsyncRecorder(async () => {
      throw new Error("network exploded")
    })
    const args = {
      subagent_type: "librarian",
      description: "generic failure",
      prompt: "find docs",
      run_in_background: false,
    }

    //#when
    const result = await executeSync(args, toolContext, createContext(recorder.promptAsync) as never, createBackgroundManager())

    //#then
    expect(result).toContain("Error: Failed to send prompt: network exploded")
    expect(result).toContain("session_id: ses-prompt-error")
  })

  test("commits reserved descendant quota after creating a new sync session", async () => {
    //#given
    mockCreateOrGetSession.mockImplementation(async () => ({ sessionID: "ses-test-789", isNew: true }))

    const { executeSync } = require("./sync-executor")

    const spawnReservation = {
      commit: mock(() => 1),
      rollback: mock(() => {}),
    }

    const backgroundManager = {
      reserveSubagentSpawn: mock(async () => spawnReservation),
    }

    const args = {
      subagent_type: "explore",
      description: "test task",
      prompt: "find something",
    }

    const toolContext = {
      sessionID: "parent-session",
      messageID: "msg-4",
      agent: "sisyphus",
      abort: new AbortController().signal,
      metadata: mock(async () => {}),
    }

    const ctx = {
      client: {
        session: {
          promptAsync: mock(async () => ({ data: {} })),
        },
      },
    }

    //#when
    await executeSync(args, toolContext, ctx as any, backgroundManager)

    //#then
    expect(spawnReservation.commit).toHaveBeenCalledTimes(1)
    expect(spawnReservation.rollback).toHaveBeenCalledTimes(0)
  })
})

export {}
