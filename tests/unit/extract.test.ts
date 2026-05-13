import { describe, expect, it } from "vitest";

import {
  cleanExtractedPdfText,
  extractTextFromUpload,
} from "@/lib/document/extract";
import { sanitizeFilename } from "@/lib/document/text";

describe("document extraction helpers", () => {
  it("extracts text files and normalizes filenames", async () => {
    const file = new File(
      ["Hello contract\r\nPayment due in 30 days."],
      "../bad<>name.txt",
      {
        type: "text/plain",
      },
    );

    const extracted = await extractTextFromUpload(file);

    expect(extracted.filename).toBe("bad_name.txt");
    expect(extracted.text).toContain("Payment due in 30 days.");
  });

  it("rejects unsupported filenames", () => {
    expect(sanitizeFilename("../../secret.pdf")).toBe("secret.pdf");
  });

  it("removes pdf-parse page markers when checking extracted PDF text", () => {
    expect(cleanExtractedPdfText("-- 1 of 1 --")).toBe("");
    expect(cleanExtractedPdfText("Agreement text\n\n-- 1 of 1 --")).toBe(
      "Agreement text",
    );
  });
});
