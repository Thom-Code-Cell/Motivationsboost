export const approvedTextModel = 'gpt-6.1-terra';
export const previewTextModel = 'gpt-4.1-mini';
export type ApprovedTextModel = typeof approvedTextModel | typeof previewTextModel;
export const maximumOutputTokens = 2048;

const standardRates = {
  [approvedTextModel]: { input: 10, output: 50 },
  [previewTextModel]: { input: 4, output: 16 },
} as const;

// Standard prices in tenths of a USD per million tokens. Reserve CHF 1.10 per USD.
export function textCostChfMicros(inputTokens: number, outputTokens: number, model: ApprovedTextModel = approvedTextModel) {
  const { input, output } = standardRates[model];
  return Math.ceil((input * inputTokens + output * outputTokens) * 11 / 100);
}

export function maximumLetterCostChfMicros(input: string, instructions: string, model: ApprovedTextModel = approvedTextModel, outputLimit = maximumOutputTokens) {
  // Bound byte-level tokenization and leave room for provider framing.
  const inputBound = Buffer.byteLength(input, 'utf8') + Buffer.byteLength(instructions, 'utf8') + 2048;
  return textCostChfMicros(inputBound, outputLimit, model);
}

export function providerTokenCounts(usage: unknown) {
  if (!usage || typeof usage !== 'object') return undefined;
  const { input_tokens: input, output_tokens: output } = usage as Record<string, unknown>;
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 0 ||
      typeof output !== 'number' || !Number.isSafeInteger(output) || output < 0) return undefined;
  return { input, output };
}

export function providerUsageCost(usage: unknown, model: ApprovedTextModel = approvedTextModel) {
  const tokens = providerTokenCounts(usage);
  if (tokens) return textCostChfMicros(tokens.input, tokens.output, model);
}