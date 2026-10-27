// Adapter retaining the existing AI flow interface while switching ALL text generation
// to OpenAI Responses API. Secrets are read only in server-side code.
import Handlebars from 'handlebars';
import { z, type ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { callOpenAI } from '@/lib/server/openai-client';

type ResponseContent = { type?: string; text?: string; refusal?: string };
type ResponseMessage = { type?: string; content?: ResponseContent[] };
type OpenAIResponse = { status?: string; output?: ResponseMessage[]; output_text?: string; error?: unknown };

async function generateJson(prompt: string, name: string, schema: Record<string, unknown>): Promise<string> {
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  if (!/^gpt-[a-z0-9.-]+$/.test(model)) throw new Error('Ungültiges OpenAI-Modell.');
  const response = await callOpenAI('/responses', {
    model,
    store: false,
    input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
    text: { format: { type: 'json_schema', name, schema, strict: false } },
    max_output_tokens: 8192,
  });
  const data = await response.json() as OpenAIResponse;
  if (data.status && data.status !== 'completed') throw new Error('OpenAI hat die Antwort nicht abgeschlossen.');
  const text = data.output_text ?? data.output?.flatMap(message =>
    (message.type === 'message' || !message.type ? (message.content ?? []) : [])
      .filter(part => part.type === 'output_text' || !part.type)
      .map(part => part.text ?? '')
  ).join('');
  if (!text?.trim()) throw new Error('OpenAI hat keine verwertbare Antwort geliefert.');
  return text;
}

function definePrompt<I extends ZodTypeAny, O extends ZodTypeAny>(config: {
  name: string;
  input: { schema: I };
  output: { schema: O };
  prompt: string;
  model?: string;
}) {
  const render = Handlebars.compile(config.prompt, { noEscape: true, strict: false });
  const jsonSchema = zodToJsonSchema(config.output.schema, { $refStrategy: 'none' });
  const { $schema: _meta, ...schema } = jsonSchema;
  const name = config.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return async (input: z.input<I>): Promise<{ output: z.output<O> }> => {
    const parsed = config.input.schema.parse(input);
    const raw = await generateJson(render(parsed), name, schema as Record<string, unknown>);
    try { return { output: config.output.schema.parse(JSON.parse(raw)) }; }
    catch { throw new Error('Die OpenAI-Antwort hat ein ungültiges Format. Bitte erneut versuchen.'); }
  };
}

function defineFlow<I extends ZodTypeAny, O extends ZodTypeAny>(
  config: { name: string; inputSchema: I; outputSchema: O },
  run: (input: z.output<I>) => Promise<z.input<O>>
) {
  return async (input: z.input<I>): Promise<z.output<O>> =>
    config.outputSchema.parse(await run(config.inputSchema.parse(input)));
}

// Photo and audio flows use dedicated OpenAI endpoints. Do not silently fallback to Gemini.
export const ai = { definePrompt, defineFlow };
