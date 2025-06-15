
'use server';
/**
 * @fileOverview Identifies a product from an image.
 *
 * - identifyProductFromImage - A function that takes an image data URI and
 *   then returns information about the identified product including its name and estimated price.
 * - IdentifyProductInput - The input type for the identifyProductFromImage function.
 * - IdentifyProductOutput - The return type for the identifyProductFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyProductInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type IdentifyProductInput = z.infer<typeof IdentifyProductInputSchema>;

const IdentifyProductOutputSchema = z.object({
  name: z.string().describe('The common name identified from the image.'),
  price: z.number().describe('The estimated market price in USD for the identified product.'),
});
export type IdentifyProductOutput = z.infer<typeof IdentifyProductOutputSchema>;

export async function identifyProductFromImage(input: IdentifyProductInput): Promise<IdentifyProductOutput> {
  return identifyProductFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyProductPrompt',
  input: {schema: IdentifyProductInputSchema},
  output: {schema: IdentifyProductOutputSchema},
  prompt: `You are an expert product identifier.
You will be given an image of a product.
Your task is to:
1. Identify the common name of the product in the image.
2. Estimate its typical market price in USD.

Return only the name and the estimated price.

Image: {{media url=photoDataUri}}`,
});

const identifyProductFlow = ai.defineFlow(
  {
    name: 'identifyProductFlow',
    inputSchema: IdentifyProductInputSchema,
    outputSchema: IdentifyProductOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
