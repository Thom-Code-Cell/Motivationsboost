
'use server';
/**
 * @fileOverview A flow to convert text into speech using a Genkit model.
 *
 * - generateAudioFromText - A function that handles the text-to-speech conversion.
 * - GenerateAudioFromTextInput - The input type for the function.
 * - GenerateAudioFromTextOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';
import wav from 'wav';
import {
  GenerateAudioFromTextInputSchema,
  GenerateAudioFromTextOutputSchema,
  type GenerateAudioFromTextInput,
  type GenerateAudioFromTextOutput,
  type Language,
} from '@/ai/schemas';


export async function generateAudioFromText(input: GenerateAudioFromTextInput): Promise<GenerateAudioFromTextOutput> {
  return generateAudioFromTextFlow(input);
}


// Helper function to convert raw PCM audio buffer to a Base64-encoded WAV string.
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (chunk) => bufs.push(chunk));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
}

const generateAudioFromTextFlow = ai.defineFlow(
  {
    name: 'generateAudioFromTextFlow',
    inputSchema: GenerateAudioFromTextInputSchema,
    outputSchema: GenerateAudioFromTextOutputSchema,
  },
  async (input) => {
    const voiceMap: Record<Language, 'Algenib' | 'Spica' | 'Enif' | 'Regulus'> = {
        'de': 'Algenib', // German
        'en': 'Spica',   // English
        'fr': 'Enif',    // French
        'it': 'Regulus', // Italian
    };
    const voice = voiceMap[input.language] || 'Algenib';

    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
      prompt: input.text,
    });
    
    if (!media || !media.url) {
      throw new Error('No audio media was returned from the model.');
    }

    // The media URL is a data URI with base64-encoded raw PCM data.
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    // Convert the PCM buffer to a WAV buffer and then to a base64 string.
    const wavBase64 = await toWav(audioBuffer);

    return {
      audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);
