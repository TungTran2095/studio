// Avoid importing genkit at build-time to prevent handlebars loader errors
// If needed in the future, switch to dynamic import inside functions
// import { genkit } from 'genkit';
// import {googleAI} from '@genkit-ai/googleai';

// Comment out genkit usage to prevent build errors
// export const ai = genkit({
//   promptDir: './prompts',
//   plugins: [
//     googleAI({
//       apiKey: process.env.GOOGLE_GENAI_API_KEY,
//     }),
//   ],
//   model: 'googleai/gemini-2.0-flash',
// });

// Temporary placeholder to prevent build errors
export const ai = {
  // Placeholder implementation
  generateResponse: async () => {
    console.warn('Genkit AI is temporarily disabled');
    return { text: 'AI service temporarily unavailable' };
  }
};
