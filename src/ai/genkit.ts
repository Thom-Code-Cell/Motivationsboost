
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Use GOOGLE_API_KEY as the single source of truth for Google AI services.
const googleApiKey = process.env.GOOGLE_API_KEY;

// Gracefully handle missing API key. The app will build, but AI features will be disabled.
if (!googleApiKey) {
  if (process.env.NODE_ENV === 'production') {
    // In production, this could be a hard error or a logged warning.
    // For this app, we will allow it to continue but AI features will fail.
    console.error('CRITICAL: GOOGLE_API_KEY environment variable is not set. AI features will not work.');
  } else {
    // In development, a warning is sufficient.
    console.warn('GOOGLE_API_KEY environment variable is not set. Genkit features will be disabled.');
  }
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: googleApiKey || '', // Pass empty string if key is missing to avoid crash
    }),
  ],
});
