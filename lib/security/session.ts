import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type { NextRequest, NextResponse } from "next/server";

import { getSessionSecret } from "@/lib/env";

export const SESSION_COOKIE_NAME = "claritydoc_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_PATTERN = /^[0-9a-f-]{36}$/i;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function getSessionIdFromRequest(request: NextRequest): string | null {
  const value = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!value) {
    return null;
  }

  const [sessionId, signature] = value.split(".");
  if (!SESSION_PATTERN.test(sessionId)) {
    return null;
  }

  const secret = getSessionSecret();
  if (!secret) {
    return process.env.NODE_ENV === "production" ? null : sessionId;
  }

  if (!signature || !SIGNATURE_PATTERN.test(signature)) {
    return null;
  }

  return isValidSignature(sessionId, signature, secret) ? sessionId : null;
}

export function createSessionId(): string {
  return randomUUID();
}

export function setSessionCookie(
  response: NextResponse,
  sessionId: string,
): void {
  response.cookies.set(SESSION_COOKIE_NAME, serializeSessionId(sessionId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export function ensureSessionId(
  request: NextRequest,
  response: NextResponse,
): string {
  const existing = getSessionIdFromRequest(request);
  const sessionId = existing ?? randomUUID();

  if (!existing) {
    setSessionCookie(response, sessionId);
  }

  return sessionId;
}

function serializeSessionId(sessionId: string): string {
  const secret = getSessionSecret();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is required in production.");
    }

    return sessionId;
  }

  return `${sessionId}.${signSessionId(sessionId, secret)}`;
}

function signSessionId(sessionId: string, secret: string): string {
  return createHmac("sha256", secret).update(sessionId).digest("base64url");
}

function isValidSignature(
  sessionId: string,
  signature: string,
  secret: string,
): boolean {
  const expected = Buffer.from(signSessionId(sessionId, secret), "base64url");
  const actual = Buffer.from(signature, "base64url");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
