import "server-only";

import { z } from "zod";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_NVIDIA_MODEL = "mistralai/mistral-small-4-119b-2603";
const DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const optionalString = z.preprocess(
  blankToUndefined,
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(blankToUndefined, z.string().url().optional());
const optionalSecret = z.preprocess(
  blankToUndefined,
  z.string().min(32).optional(),
);

const envSchema = z
  .object({
    AI_PROVIDER: z
      .preprocess(blankToUndefined, z.enum(["nvidia", "gemini"]).optional())
      .default("gemini"),
    APP_URL: optionalUrl,
    DATABASE_URL: optionalString,
    GEMINI_API_KEY: optionalString,
    GEMINI_MODEL: z
      .preprocess(blankToUndefined, z.string().min(1).optional())
      .default(DEFAULT_GEMINI_MODEL),
    NVIDIA_API_KEY: optionalString,
    NVIDIA_BASE_URL: z
      .preprocess(blankToUndefined, z.string().url().optional())
      .default(DEFAULT_NVIDIA_BASE_URL),
    NVIDIA_MODEL: z
      .preprocess(blankToUndefined, z.string().min(1).optional())
      .default(DEFAULT_NVIDIA_MODEL),
    MOCK_AI: z
      .preprocess(blankToUndefined, z.enum(["true", "false"]).optional())
      .default("false"),
    EPHEMERAL_STORAGE: z
      .preprocess(blankToUndefined, z.enum(["true", "false"]).optional())
      .default("false"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SESSION_SECRET: optionalSecret,
    AUTH_SECRET: optionalSecret,
    NEXTAUTH_SECRET: optionalSecret,
  })
  .passthrough()
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") {
      return;
    }

    if (!env.DATABASE_URL && env.EPHEMERAL_STORAGE !== "true") {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message:
          "DATABASE_URL is required in production unless EPHEMERAL_STORAGE=true.",
      });
    }

    if (!env.APP_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "APP_URL is required in production.",
      });
    }

    if (
      env.MOCK_AI !== "true" &&
      env.AI_PROVIDER === "gemini" &&
      !env.GEMINI_API_KEY
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["GEMINI_API_KEY"],
        message: "GEMINI_API_KEY is required in production when MOCK_AI=false.",
      });
    }

    if (
      env.MOCK_AI !== "true" &&
      env.AI_PROVIDER === "nvidia" &&
      !env.NVIDIA_API_KEY
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["NVIDIA_API_KEY"],
        message:
          "NVIDIA_API_KEY is required in production when AI_PROVIDER=nvidia and MOCK_AI=false.",
      });
    }

    if (!getSessionSecretValue(env)) {
      ctx.addIssue({
        code: "custom",
        path: ["SESSION_SECRET"],
        message:
          "SESSION_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET is required in production.",
      });
    }
  });

export type ServerEnv = z.infer<typeof envSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(formatEnvError(parsed.error));
  }

  return parsed.data;
}

export function getGeminiModel(): string {
  return getServerEnv().GEMINI_MODEL;
}

export function getAiProviderName(): "nvidia" | "gemini" {
  return getServerEnv().AI_PROVIDER;
}

export function isMockAiEnabled(): boolean {
  const env = getServerEnv();
  return env.MOCK_AI === "true" || env.NODE_ENV === "test";
}

export function isEphemeralStorageEnabled(): boolean {
  return getServerEnv().EPHEMERAL_STORAGE === "true";
}

export function getSessionSecret(): string | null {
  const secret =
    process.env.SESSION_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    null;

  if (secret && secret.length < 32) {
    throw new Error(
      "Invalid server environment configuration. SESSION_SECRET must be at least 32 characters.",
    );
  }

  return secret;
}

function getSessionSecretValue(
  env: Pick<ServerEnv, "SESSION_SECRET" | "AUTH_SECRET" | "NEXTAUTH_SECRET">,
): string | null {
  return env.SESSION_SECRET ?? env.AUTH_SECRET ?? env.NEXTAUTH_SECRET ?? null;
}

function blankToUndefined(value: unknown): unknown {
  return value === "" ? undefined : value;
}

function formatEnvError(error: z.ZodError): string {
  const details = error.issues
    .map((issue) => {
      const key = issue.path.join(".") || "environment";
      return `${key}: ${issue.message}`;
    })
    .join("; ");

  return `Invalid server environment configuration. ${details}`;
}
