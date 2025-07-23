
'use server';
/**
 * @fileOverview Generates an image of a product given its name.
 *
 * - generateProductImageByName - A function that takes a product name and returns an image data URI.
 * - GenerateProductImageByNameInput - The input type for the generateProductImageByName function.
 * - GenerateProductImageByNameOutput - The return type for the generateProductImageByName function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductImageByNameInputSchema = z.object({
  productName: z.string().describe('The name of the product for which to generate an image.'),
});
export type GenerateProductImageByNameInput = z.infer<typeof GenerateProductImageByNameInputSchema>;

const GenerateProductImageByNameOutputSchema = z.object({
  productImageDataUri: z
    .string()
    .describe(
      "The generated product image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."
    ),
});
export type GenerateProductImageByNameOutput = z.infer<typeof GenerateProductImageByNameOutputSchema>;

export async function generateProductImageByName(input: GenerateProductImageByNameInput): Promise<GenerateProductImageByNameOutput> {
  return generateProductImageFlow(input);
}

const generateProductImageFlow = ai.defineFlow(
  {
    name: 'generateProductImageFlow',
    inputSchema: GenerateProductImageByNameInputSchema,
    outputSchema: GenerateProductImageByNameOutputSchema,
  },
  async (input) => {
    const promptText = `Generate a clear, high-quality, photorealistic image of a single '${input.productName}' on a plain white background. The product should be the main focus, well-lit, and centered. Avoid text or logos unless it's inherently part of the product itself.`;

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
      throw new Error(`Image generation failed for '${input.productName}'. The service may be unavailable or the prompt was blocked by safety filters.`);
    }

    return { productImageDataUri: media.url };
  }
);
