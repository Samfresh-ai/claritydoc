import type { z } from "zod";

import type { AiUsage } from "@/lib/ai/schemas";

export type AiJsonRequest<T> = {
  system: string;
  user: string;
  schema: z.ZodSchema<T>;
  maxTokens?: number;
};

export type AiJsonResponse<T> = {
  data: T;
  model: string;
  usage: AiUsage;
};

export interface AiProvider {
  completeJson<T>(request: AiJsonRequest<T>): Promise<AiJsonResponse<T>>;
}
