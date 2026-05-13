import { afterEach, describe, expect, it, vi } from "vitest";

import { mockSampleAnalysis } from "@/lib/ai/providers/mock";

describe("analysis persistence session isolation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not allow another anonymous session to read or delete an analysis", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { deleteAnalysis, getAnalysis, saveAnalysis } =
      await import("@/lib/repositories/analyses");

    const saved = await saveAnalysis({
      sessionId: "session-a",
      text: "FREELANCE SERVICE AGREEMENT with enough text for persistence isolation coverage.",
      originalFilename: "sample.txt",
      storeFullText: false,
      result: mockSampleAnalysis,
      modelUsed: "mock",
      usage: { inputTokens: 0, outputTokens: 0 },
    });

    await expect(getAnalysis(saved.id, "session-b")).resolves.toBeNull();
    await expect(deleteAnalysis(saved.id, "session-b")).resolves.toBe(false);
    await expect(getAnalysis(saved.id, "session-a")).resolves.toMatchObject({
      id: saved.id,
      sessionId: "session-a",
    });
  });

  it("does not silently use in-memory persistence in production", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EPHEMERAL_STORAGE", "false");
    const { saveAnalysis } = await import("@/lib/repositories/analyses");

    await expect(
      saveAnalysis({
        sessionId: "session-production",
        text: "FREELANCE SERVICE AGREEMENT with enough text for production persistence coverage.",
        originalFilename: "sample.txt",
        storeFullText: false,
        result: mockSampleAnalysis,
        modelUsed: "mock",
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    ).rejects.toThrow("DATABASE_URL is required in production");
  });

  it("allows explicit in-memory persistence for production demo mode", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOCK_AI", "true");
    vi.stubEnv("EPHEMERAL_STORAGE", "true");
    vi.stubEnv("APP_URL", "https://claritydoc-demo.example.com");
    vi.stubEnv("SESSION_SECRET", "test-secret-with-at-least-32-characters");
    vi.stubEnv("AI_PROVIDER", "gemini");
    const { saveAnalysis } = await import("@/lib/repositories/analyses");

    await expect(
      saveAnalysis({
        sessionId: "session-demo",
        text: "FREELANCE SERVICE AGREEMENT with enough text for production demo persistence coverage.",
        originalFilename: "sample.txt",
        storeFullText: false,
        result: mockSampleAnalysis,
        modelUsed: "mock",
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    ).resolves.toMatchObject({
      sessionId: "session-demo",
      modelUsed: "mock",
    });
  });
});
