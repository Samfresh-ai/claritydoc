import { afterEach, describe, expect, it, vi } from "vitest";

describe("server environment validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed in production without database, app URL, provider key, and session secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOCK_AI", "false");
    vi.stubEnv("EPHEMERAL_STORAGE", "false");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("AI_PROVIDER", "nvidia");
    vi.stubEnv("NVIDIA_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");

    const { getServerEnv } = await import("@/lib/env");

    expect(() => getServerEnv()).toThrow(/DATABASE_URL is required/);
    expect(() => getServerEnv()).toThrow(/APP_URL is required/);
    expect(() => getServerEnv()).toThrow(/NVIDIA_API_KEY is required/);
    expect(() => getServerEnv()).toThrow(/SESSION_SECRET/);
  });

  it("allows mock AI in production but still requires database, app URL, and session secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOCK_AI", "true");
    vi.stubEnv("EPHEMERAL_STORAGE", "false");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://claritydoc:claritydoc@localhost:5432/claritydoc",
    );
    vi.stubEnv("APP_URL", "https://claritydoc.example.com");
    vi.stubEnv("SESSION_SECRET", "test-secret-with-at-least-32-characters");
    vi.stubEnv("AI_PROVIDER", "nvidia");
    vi.stubEnv("NVIDIA_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");

    const { getServerEnv } = await import("@/lib/env");

    expect(getServerEnv()).toMatchObject({
      AI_PROVIDER: "nvidia",
      MOCK_AI: "true",
      EPHEMERAL_STORAGE: "false",
      NVIDIA_MODEL: "mistralai/mistral-small-4-119b-2603",
    });
  });

  it("allows explicit ephemeral storage for short-lived production demos", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOCK_AI", "true");
    vi.stubEnv("EPHEMERAL_STORAGE", "true");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("APP_URL", "https://claritydoc-demo.example.com");
    vi.stubEnv("SESSION_SECRET", "test-secret-with-at-least-32-characters");
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("NVIDIA_API_KEY", "");

    const { getServerEnv } = await import("@/lib/env");

    expect(getServerEnv()).toMatchObject({
      MOCK_AI: "true",
      EPHEMERAL_STORAGE: "true",
      DATABASE_URL: undefined,
    });
  });
});
