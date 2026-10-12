// Small, schema-validated Gemini adapter. No telemetry server or development runtime
// is included in production. The existing flow API keeps component imports stable.
import Handlebars from 'handlebars';
import { z, type ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { isLocalMode } from '@/lib/local-mode';
import { generateLocal } from '@/lib/server/ollama';

type PromptPart = { text: string } | { media: { url: string } };
type Options = { model?: string; prompt: string | PromptPart[]; config?: Record<string, unknown> };
type Result = { text: string; media?: { url: string } };
async function generate(options: Options): Promise<Result> {
  if (isLocalMode()) {
    if (typeof options.prompt !== 'string' || options.model) throw new Error('Diese Medienfunktion benötigt eine separate lokale Komponente und ist hier nicht verfügbar.');
    return generateLocal(options.prompt, options.config?.responseJsonSchema);
  }
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('Der KI-Dienst ist noch nicht konfiguriert.');
  const model = (options.model || process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash').replace(/^googleai\//, '');
  if (!/^gemini-[a-z0-9.-]+$/.test(model)) throw new Error('Ungültige Modellkonfiguration.');
  const parts = typeof options.prompt === 'string' ? [{ text: options.prompt }] : options.prompt.map(part => {
    if ('text' in part) return part;
    const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/.exec(part.media.url);
    if (!match || part.media.url.length > 12_000_000) throw new Error('Ungültige Mediendatei.');
    return { inlineData: { mimeType: match[1], data: match[2] } };
  });
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { maxOutputTokens: 8192, ...options.config } }),
      signal: AbortSignal.timeout(55000), cache: 'no-store',
    });
  } catch { throw new Error('Der KI-Dienst antwortet nicht. Bitte erneut versuchen.'); }
  if (!response.ok) throw new Error(response.status === 429 ? 'Der KI-Dienst ist ausgelastet. Bitte später erneut versuchen.' : 'Der KI-Dienst konnte die Anfrage nicht ausführen.');
  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (!candidate?.content?.parts || (candidate.finishReason && candidate.finishReason !== 'STOP')) throw new Error('Die KI-Antwort ist unvollständig oder wurde blockiert. Bitte erneut versuchen.');
  const outputParts = candidate.content.parts as { text?: string; thought?: boolean; inlineData?: { mimeType: string; data: string } }[];
  const text = outputParts.filter(p => !p.thought).map(p => p.text || '').join('');
  const media = outputParts.find(p => p.inlineData)?.inlineData;
  if (!text && !media) throw new Error('Die KI hat keine verwertbare Antwort geliefert.');
  return { text, ...(media && { media: { url: `data:${media.mimeType};base64,${media.data}` } }) };
}
function definePrompt<I extends ZodTypeAny, O extends ZodTypeAny>(config: { name: string; input: { schema: I }; output: { schema: O }; prompt: string; model?: string }) {
  const render = Handlebars.compile(config.prompt, { noEscape: true, strict: false });
  const schema = zodToJsonSchema(config.output.schema, { $refStrategy: 'none' });
  const { $schema: _meta, ...jsonSchema } = schema;
  return async (input: z.input<I>): Promise<{ output: z.output<O> }> => {
    const parsed = config.input.schema.parse(input);
    const response = await generate({ model: config.model, prompt: render(parsed), config: { responseMimeType: 'application/json', responseJsonSchema: jsonSchema } });
    try { return { output: config.output.schema.parse(JSON.parse(response.text)) }; }
    catch { throw new Error('Die KI-Antwort hat ein ungültiges Format. Bitte erneut versuchen.'); }
  };
}
function defineFlow<I extends ZodTypeAny, O extends ZodTypeAny>(config: { name: string; inputSchema: I; outputSchema: O }, run: (input: z.output<I>) => Promise<z.input<O>>) {
  return async (input: z.input<I>): Promise<z.output<O>> => config.outputSchema.parse(await run(config.inputSchema.parse(input)));
}
export const ai = { definePrompt, defineFlow, generate };
