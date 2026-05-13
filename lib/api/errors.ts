import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toPublicError(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof ApiError) {
    return { message: error.message, status: error.status };
  }

  if (error instanceof ZodError) {
    return {
      message:
        "The request was invalid. Check the document text and try again.",
      status: 400,
    };
  }

  if (error instanceof Error && error.name === "AiProviderError") {
    const providerError = error as Error & {
      code?: string;
      providerStatus?: number;
    };

    if (providerError.code === "timeout") {
      return {
        message:
          "The analysis provider took too long to process this document. Try a shorter file or split the document into smaller sections.",
        status: 504,
      };
    }

    if (providerError.code === "malformed_json") {
      return {
        message:
          "The analysis provider returned an unusable response. Try again, or use a shorter document if this repeats.",
        status: 502,
      };
    }

    if (
      providerError.providerStatus &&
      [400, 413, 422].includes(providerError.providerStatus)
    ) {
      return {
        message:
          "The analysis provider rejected this document. Try a shorter or cleaner text extraction, or split the file into smaller sections.",
        status: 502,
      };
    }

    if (providerError.providerStatus === 429) {
      return {
        message:
          "The analysis provider is rate limiting requests. Please wait a moment and try again.",
        status: 502,
      };
    }

    if (
      providerError.providerStatus &&
      [401, 403].includes(providerError.providerStatus)
    ) {
      return {
        message:
          "The analysis provider is not authorized for this model. Please check the server provider configuration.",
        status: 502,
      };
    }

    return {
      message: "The analysis provider is unavailable. Please try again later.",
      status: 502,
    };
  }

  if (
    error instanceof Error &&
    (error.message.includes("server environment configuration") ||
      error.message.includes("SESSION_SECRET is required in production") ||
      error.message.includes("DATABASE_URL is required in production"))
  ) {
    return {
      message: "The server is not fully configured. Please contact support.",
      status: 500,
    };
  }

  if (error instanceof Error && "status" in error) {
    const status = Number((error as { status?: number }).status);
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      return { message: error.message, status };
    }
  }

  return {
    message: "Something went wrong while processing the request.",
    status: 500,
  };
}
