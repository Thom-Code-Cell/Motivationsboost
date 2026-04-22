
'use server';
/**
 * @fileOverview An AI agent that generates a professional headshot from a user's photo.
 *
 * - generateProfessionalPhoto - A function that handles the photo generation.
 * - GenerateProfessionalPhotoInput - The input type for the function.
 * - GenerateProfessionalPhotoOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  GenerateProfessionalPhotoInputSchema,
  GenerateProfessionalPhotoOutputSchema,
  type GenerateProfessionalPhotoInput,
  type GenerateProfessionalPhotoOutput,
} from '@/ai/schemas';

const stylePrompts: Record<string, string> = {
    business: "a formal business suit, neutral studio background, professional lighting",
    modern: "a smart casual outfit (e.g., blazer, open-collar shirt), soft-focused office or urban background",
    creative: "an artistic but professional outfit, interesting, textured, monochromatic background, slightly more dramatic lighting",
};


export async function generateProfessionalPhoto(input: GenerateProfessionalPhotoInput): Promise<GenerateProfessionalPhotoOutput> {
  return generateProfessionalPhotoFlow(input);
}

const generateProfessionalPhotoFlow = ai.defineFlow(
  {
    name: 'generateProfessionalPhotoFlow',
    inputSchema: GenerateProfessionalPhotoInputSchema,
    outputSchema: GenerateProfessionalPhotoOutputSchema,
  },
  async ({ userPhoto, style, prompt: userPrompt }) => {

    const styleInstruction = stylePrompts[style] || stylePrompts.business;
    
    const finalPrompt = `Generate a professional headshot for a job application based on the provided photo. 
The subject should be looking at the camera.
The final image should be clean, high-resolution, and suitable for a CV or professional profile.
Apply the following style: ${styleInstruction}.
${userPrompt ? `Additional user instructions: ${userPrompt}`: ''}
`;

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        { media: { url: userPhoto } },
        { text: finalPrompt },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed to return a valid image URL. The response from the AI was empty or malformed.');
    }

    return {
      generatedPhoto: media.url,
    };
  }
);
