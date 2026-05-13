type LogContext = Record<string, string | number | boolean | null | undefined>;

const SECRET_PATTERNS = [
  /nvapi-[A-Za-z0-9_-]+/g,
  /AIza[A-Za-z0-9_-]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
];

export function logServerWarning(message: string, context: LogContext = {}) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console.warn(
    JSON.stringify({
      level: "warn",
      message: redactSecrets(message),
      ...sanitizeContext(context),
    }),
  );
}

export function errorContext(error: unknown): LogContext {
  if (!(error instanceof Error)) {
    return { errorName: "UnknownError" };
  }

  const maybeProviderError = error as Error & {
    code?: string;
    providerStatus?: number;
    transient?: boolean;
  };

  return {
    errorName: error.name,
    errorMessage: redactSecrets(error.message),
    providerCode: maybeProviderError.code,
    providerStatus: maybeProviderError.providerStatus,
    transient: maybeProviderError.transient,
  };
}

function sanitizeContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      typeof value === "string" ? redactSecrets(value) : value,
    ]),
  );
}

function redactSecrets(value: string): string {
  return SECRET_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, "[redacted]"),
    value,
  );
}
