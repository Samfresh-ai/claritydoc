import { readFileSync, existsSync } from "node:fs";

loadLocalEnv();

process.env.MOCK_AI = "false";
process.env.AI_PROVIDER = "nvidia";

async function main() {
  if (!process.env.NVIDIA_API_KEY) {
    throw new Error(
      "NVIDIA_API_KEY is required for the real NVIDIA smoke test.",
    );
  }

  const [
    { analyzeDocumentText },
    { analysisResultSchema },
    { SAMPLE_CONTRACT },
  ] = await Promise.all([
    import("../lib/ai/analyze-document"),
    import("../lib/ai/schemas"),
    import("../lib/sample-contract"),
  ]);

  const analysis = await analyzeDocumentText(SAMPLE_CONTRACT);
  const result = analysisResultSchema.parse(analysis.result);

  console.log(
    JSON.stringify(
      {
        provider: "nvidia",
        model: analysis.model,
        verdict: result.verdict,
        risks: result.risks.length,
        obligations: result.obligations.length,
        actions: result.actions.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : "Unknown smoke test failure.";
  console.error(`NVIDIA smoke test failed: ${redactSecret(message)}`);
  process.exitCode = 1;
});

function redactSecret(message: string): string {
  const apiKey = process.env.NVIDIA_API_KEY;
  return apiKey ? message.replaceAll(apiKey, "[redacted]") : message;
}

function loadLocalEnv(): void {
  if (!existsSync(".env")) {
    return;
  }

  const text = readFileSync(".env", "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = unquoteEnvValue(match[2]);
  }
}

function unquoteEnvValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}
