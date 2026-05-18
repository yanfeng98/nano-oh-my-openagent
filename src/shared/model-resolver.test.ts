import { describe, expect, test } from "bun:test"
import { resolveModel, type ModelResolutionInput } from "./model-resolver"

describe("resolveModel", () => {
  describe("priority chain", () => {
    test("returns userModel when all three are set", () => {
      const input: ModelResolutionInput = {
        userModel: "anthropic/claude-opus-4-6",
        inheritedModel: "openai/gpt-5.4",
        systemDefault: "google/gemini-3.1-pro",
      }

      const result = resolveModel(input)

      expect(result).toBe("anthropic/claude-opus-4-6")
    })

    test("returns inheritedModel when userModel is undefined", () => {
      const input: ModelResolutionInput = {
        userModel: undefined,
        inheritedModel: "openai/gpt-5.4",
        systemDefault: "google/gemini-3.1-pro",
      }

      const result = resolveModel(input)

      expect(result).toBe("openai/gpt-5.4")
    })

    test("returns systemDefault when both userModel and inheritedModel are undefined", () => {
      const input: ModelResolutionInput = {
        userModel: undefined,
        inheritedModel: undefined,
        systemDefault: "google/gemini-3.1-pro",
      }

      const result = resolveModel(input)

      expect(result).toBe("google/gemini-3.1-pro")
    })
  })

  describe("empty string handling", () => {
    test("treats empty string as unset, uses fallback", () => {
      const input: ModelResolutionInput = {
        userModel: "",
        inheritedModel: "openai/gpt-5.4",
        systemDefault: "google/gemini-3.1-pro",
      }

      const result = resolveModel(input)

      expect(result).toBe("openai/gpt-5.4")
    })

    test("treats whitespace-only string as unset, uses fallback", () => {
      const input: ModelResolutionInput = {
        userModel: "   ",
        inheritedModel: "",
        systemDefault: "google/gemini-3.1-pro",
      }

      const result = resolveModel(input)

      expect(result).toBe("google/gemini-3.1-pro")
    })
  })

  describe("purity", () => {
    test("same input returns same output (referential transparency)", () => {
      const input: ModelResolutionInput = {
        userModel: "anthropic/claude-opus-4-6",
        inheritedModel: "openai/gpt-5.4",
        systemDefault: "google/gemini-3.1-pro",
      }

      const result1 = resolveModel(input)
      const result2 = resolveModel(input)

      expect(result1).toBe(result2)
    })
  })
})
