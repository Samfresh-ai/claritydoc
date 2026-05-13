import { z } from "zod";

export const extractUploadSchema = z
  .object({
    file: z.custom<File>((value) => value instanceof File, {
      message: "Attach a .txt, .pdf, or .docx file.",
    }),
  })
  .strict();

export const analysisIdParamsSchema = z
  .object({
    id: z
      .string()
      .min(8)
      .max(80)
      .regex(/^[a-z0-9_-]+$/i, "Invalid analysis id."),
  })
  .strict();
