export const approvedTextModel = 'gpt-6.1-terra';
export const maximumOutputTokens = 2048;

// Standard USD 1 / 5 per million tokens. Budgeting rate CHF 1.10 per USD.
export function textCostChfMicros(inputTokens: number, outputTokens: number) {
  return Math.ceil((inputTokens + 5 * outputTokens) * 11 / 10);
}

export function maximumLetterCostChfMicros(input: string, instructions: string) {
  // Bound byte-level tokenization and leave room for provider framing.
  const inputBound = Buffer.byteLength(input, 'utf8') + Buffer.byteLength(instructions, 'utf8') + 2048;
  return textCostChfMicros(inputBound, maximumOutputTokens);
}

export function providerUsageCost(usage: unknown) {
  if (!usage || typeof usage !== 'object') return undefined;
  const { input_tokens: input, output_tokens: output } = usage as Record<string, unknown>;
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 0 ||
      typeof output !== 'number' || !Number.isSafeInteger(output) || output < 0) return undefined;
  return textCostChfMicros(input, output);
}
