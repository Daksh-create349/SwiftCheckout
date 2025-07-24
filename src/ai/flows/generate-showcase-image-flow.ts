
'use server';
/**
 * @fileOverview Generates a showcase image for the application's hero section.
 *
 * - generateShowcaseImage - A function that returns a data URI for a dynamically generated image.
 * - GenerateShowcaseImageOutput - The return type for the generateShowcaseImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateShowcaseImageOutputSchema = z.object({
  showcaseImageDataUri: z
    .string()
    .describe(
      "The generated showcase image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."
    ),
});
export type GenerateShowcaseImageOutput = z.infer<typeof GenerateShowcaseImageOutputSchema>;

export async function generateShowcaseImage(): Promise<GenerateShowcaseImageOutput> {
  return generateShowcaseImageFlow();
}

const generateShowcaseImageFlow = ai.defineFlow(
  {
    name: 'generateShowcaseImageFlow',
    inputSchema: z.void(),
    outputSchema: GenerateShowcaseImageOutputSchema,
  },
  async () => {
    const promptText = `
Generate a visually stunning, photorealistic image of a futuristic point-of-sale (POS) system in a modern, stylish retail environment.

Key elements to include:
- A sleek, minimalist touchscreen interface displaying a transaction in progress.
- A customer interacting with the device, perhaps with a gentle tap or a futuristic payment method (e.g., biometric scan, glowing card).
- The background should be a clean, well-lit, and slightly blurred retail space (e.g., a high-end boutique, a modern cafe).
- The overall mood should be professional, innovative, and efficient.
- Use a cinematic lighting style with soft shadows and highlights.
`;

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: promptText,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
         safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed or returned no media URL.');
    }

    return { showcaseImageDataUri: media.url };
  }
);
