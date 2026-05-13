import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getSessionIdFromRequest,
  SESSION_COOKIE_NAME,
  setSessionCookie,
} from "@/lib/security/session";

describe("anonymous session cookie signing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts signed cookies and rejects forged values when a secret is configured", () => {
    vi.stubEnv("SESSION_SECRET", "test-secret-with-at-least-32-characters");
    const sessionId = "11111111-1111-4111-8111-111111111111";
    const response = NextResponse.json({ ok: true });

    setSessionCookie(response, sessionId);
    const cookieValue = response.cookies.get(SESSION_COOKIE_NAME)?.value;

    expect(cookieValue).toMatch(`${sessionId}.`);
    expect(getSessionIdFromRequest(requestWithCookie(cookieValue ?? ""))).toBe(
      sessionId,
    );
    expect(
      getSessionIdFromRequest(
        requestWithCookie(
          "22222222-2222-4222-8222-222222222222." + cookieValue?.split(".")[1],
        ),
      ),
    ).toBeNull();
  });
});

function requestWithCookie(cookieValue: string): NextRequest {
  return new NextRequest("http://localhost:3000", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${cookieValue}`,
    },
  });
}
