import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/db";
import { getServerEnv, type ServerEnv } from "@/lib/env";

export const runtime = "nodejs";

type HealthBody = {
  status: "ok" | "degraded";
  databaseReachable: boolean;
  mockAiEnabled: boolean;
  configurationValid: boolean;
  storageMode: "database" | "ephemeral";
  timestamp: string;
};

export async function GET() {
  const timestamp = new Date().toISOString();
  const env = readValidatedEnv();
  const storageMode = env?.DATABASE_URL ? "database" : "ephemeral";
  const databaseReachable =
    env && storageMode === "database" ? await canReachDatabase() : false;
  const configurationValid = Boolean(env);
  const status =
    configurationValid && (databaseReachable || storageMode === "ephemeral")
      ? ("ok" as const)
      : ("degraded" as const);

  const body: HealthBody = {
    status,
    databaseReachable,
    mockAiEnabled: process.env.MOCK_AI === "true",
    configurationValid,
    storageMode,
    timestamp,
  };

  return NextResponse.json(body, {
    status: status === "ok" ? 200 : 503,
  });
}

function readValidatedEnv(): ServerEnv | null {
  try {
    return getServerEnv();
  } catch {
    return null;
  }
}

async function canReachDatabase(): Promise<boolean> {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
