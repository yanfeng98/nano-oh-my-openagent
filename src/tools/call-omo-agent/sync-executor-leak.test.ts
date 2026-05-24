import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import {
  _resetForTesting,
  subagentSessions,
  syncSubagentSessions,
} from "../../features/claude-code-session-state"
import { executeSync } from "./sync-executor"

type ExecuteSyncArgs = Parameters<typeof executeSync>[0]
type ExecuteSyncToolContext = Parameters<typeof executeSync>[1]

// Shared mock references — implementations can be changed per-test.
const mockCreateOrGetSession = mock(async () => ({ sessionID: "ses-default", isNew: true }))
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

function createArgs(): ExecuteSyncArgs {
  return {
    subagent_type: "explore",
    description: "cleanup leak",
    prompt: "find something",
    run_in_background: false,
  }
}

function createToolContext(): ExecuteSyncToolContext {
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

const mockBackgroundManager = {
  reserveSubagentSpawn: mock(async () => ({
    commit: mock(() => 1),
    rollback: mock(() => {}),
  })),
}

describe("executeSync session cleanup", () => {
  beforeEach(() => {
    _resetForTesting()
    // Reset mock implementations to defaults
    mockCreateOrGetSession.mockImplementation(async () => ({ sessionID: "ses-default", isNew: true }))
    mockWaitForCompletion.mockImplementation(async () => {})
    mockProcessMessages.mockImplementation(async () => "agent response")
    mockSetFallbackChain.mockImplementation(() => {})
    mockClearFallbackChain.mockImplementation(() => {})
  })

  afterEach(() => {
    _resetForTesting()
  })

  describe("#given executeSync creates a session", () => {
    test("#when execution completes successfully #then sessionID is removed from subagentSessions and syncSubagentSessions", async () => {
      // given
      const sessionID = "ses-cleanup-success"
      mockCreateOrGetSession.mockImplementation(async () => ({ sessionID, isNew: true }))
      mockWaitForCompletion.mockImplementation(async (createdSessionID: string) => {
        expect(createdSessionID).toBe(sessionID)
        expect(subagentSessions.has(sessionID)).toBe(true)
        expect(syncSubagentSessions.has(sessionID)).toBe(true)
      })

      const args = createArgs()
      const toolContext = createToolContext()
      const promptAsync = mock(async () => ({ data: {} }))

      expect(subagentSessions.has(sessionID)).toBe(false)
      expect(syncSubagentSessions.has(sessionID)).toBe(false)

      // when
      const result = await executeSync(args, toolContext, createContext(promptAsync) as never, mockBackgroundManager)

      // then
      expect(result).toContain(`session_id: ${sessionID}`)
      expect(subagentSessions.has(sessionID)).toBe(false)
      expect(syncSubagentSessions.has(sessionID)).toBe(false)
    })

    test("#when execution throws an error #then sessionID is still removed from both Sets", async () => {
      // given
      const sessionID = "ses-cleanup-error"
      mockCreateOrGetSession.mockImplementation(async () => ({ sessionID, isNew: true }))
      mockWaitForCompletion.mockImplementation(async (createdSessionID: string) => {
        expect(createdSessionID).toBe(sessionID)
        expect(subagentSessions.has(sessionID)).toBe(true)
        expect(syncSubagentSessions.has(sessionID)).toBe(true)
        throw new Error("poll exploded")
      })

      const args = createArgs()
      const toolContext = createToolContext()
      const promptAsync = mock(async () => ({ data: {} }))

      // when
      const resultPromise = executeSync(args, toolContext, createContext(promptAsync) as never, mockBackgroundManager)

      // then
      let thrownError: Error | undefined

      try {
        await resultPromise
      } catch (error) {
        if (error instanceof Error) {
          thrownError = error
        } else {
          throw error
        }
      }

      expect(thrownError?.message).toBe("poll exploded")
      expect(subagentSessions.has(sessionID)).toBe(false)
      expect(syncSubagentSessions.has(sessionID)).toBe(false)
    })
  })

  describe("#given executeSync reuses an existing session", () => {
    test("#when execution completes successfully #then the reused session is tracked in both Sets", async () => {
      // given
      const sessionID = "ses-reused"
      mockCreateOrGetSession.mockImplementation(async () => ({ sessionID, isNew: false }))
      mockWaitForCompletion.mockImplementation(async (createdSessionID: string) => {
        expect(createdSessionID).toBe(sessionID)
        expect(subagentSessions.has(sessionID)).toBe(true)
        expect(syncSubagentSessions.has(sessionID)).toBe(true)
      })

      const args = { ...createArgs(), session_id: sessionID }
      const toolContext = createToolContext()
      const promptAsync = mock(async () => ({ data: {} }))

      expect(subagentSessions.has(sessionID)).toBe(false)
      expect(syncSubagentSessions.has(sessionID)).toBe(false)

      // when
      const result = await executeSync(args, toolContext, createContext(promptAsync) as never, mockBackgroundManager)

      // then
      expect(result).toContain(`session_id: ${sessionID}`)
      expect(subagentSessions.has(sessionID)).toBe(true)
      expect(syncSubagentSessions.has(sessionID)).toBe(true)
    })

    test("#when execution applies a fallback chain #then it clears that chain in finally", async () => {
      // given
      const sessionID = "ses-reused-fallback"
      mockCreateOrGetSession.mockImplementation(async () => ({ sessionID, isNew: false }))

      const args = { ...createArgs(), session_id: sessionID }
      const toolContext = createToolContext()
      const promptAsync = mock(async () => ({ data: {} }))
      const fallbackChain = [{ providers: ["openai"], model: "gpt-5.4" }]

      // when
      await executeSync(args, toolContext, createContext(promptAsync) as never, mockBackgroundManager, undefined, fallbackChain)

      // then
      expect(mockClearFallbackChain).toHaveBeenCalledWith(sessionID)
    })
  })
})
