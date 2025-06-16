
'use server';
/**
 * @fileOverview Identifies a product from an image and estimates its price in a specified currency.
 *
 * - identifyProductFromImage - A function that takes an image data URI and currency code,
 *   then returns information about the identified product including its name and estimated price in that currency.
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
  currencyCode: z.string().describe('The currency code for the price estimate (e.g., USD, EUR, JPY).'),
});
export type IdentifyProductInput = z.infer<typeof IdentifyProductInputSchema>;

const IdentifyProductOutputSchema = z.object({
  name: z.string().describe('The common name identified from the image.'),
  price: z.number().describe('The estimated market price in the specified currency for the identified product.'),
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
You will be given an image of a product and a target currency code.
Your task is to:
1. Identify the common name of the product in the image.
2. Estimate its typical market price in the currency specified by {{currencyCode}}.

Return only the name and the estimated price in the specified currency.

Image: {{media url=photoDataUri}}
Target Currency: {{currencyCode}}`,
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
