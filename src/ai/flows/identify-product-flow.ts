
'use server';
/**
 * @fileOverview Identifies a product from an image and attempts to match it against a list of known products.
 *
 * - identifyProductFromImage - A function that takes an image data URI and a list of known products,
 *   then returns information about the identified product and whether it was found in the list.
 * - IdentifyProductInput - The input type for the identifyProductFromImage function.
 * - IdentifyProductOutput - The return type for the identifyProductFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Product } from '@/types/billing'; // Using existing Product type for knownProducts

const KnownProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
});

const IdentifyProductInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  knownProducts: z.array(KnownProductSchema).describe('A list of known products with their IDs, names, and prices.'),
});
export type IdentifyProductInput = z.infer<typeof IdentifyProductInputSchema>;

const IdentifyProductOutputSchema = z.object({
  productId: z.string().nullable().describe('The ID from the list if a close match is found. If no match, set to null.'),
  name: z.string().describe('The name from the list if a close match is found. If no match, the common name identified from the image.'),
  price: z.number().describe('The price from the list if a close match is found. If no match, the estimated market price for the identified product.'),
  matchFoundInDB: z.boolean().describe('Set to true if a close match was found in the list, false otherwise.'),
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
You will be given an image of a product and a list of known products with their IDs, names, and prices.
Your task is to:
1. Identify the common name of the product in the image.
2. Estimate its typical market price in USD if it's not in the list.
3. Determine if the identified product closely matches any product in the provided list. A close match means it's likely the same item (e.g., "Organic Gala Apples" in image vs. "Organic Apples" in list is a match; "Soda Can" vs "Water Bottle" is not).

List of known products:
{{#each knownProducts}}
- ID: {{id}}, Name: "{{name}}", Price: {{price}}
{{/each}}

Based on the image and the list, provide the following:
- \`productId\`: The ID from the list if a close match is found. If no match, set to \`null\`.
- \`name\`: The name from the list if a close match is found. If no match, provide the common name you identified from the image.
- \`price\`: The price from the list if a close match is found. If no match, provide your estimated market price for the identified product.
- \`matchFoundInDB\`: Set to \`true\` if a close match was found in the list, \`false\` otherwise.

Image: {{media url=photoDataUri}}`,
});

const identifyProductFlow = ai.defineFlow(
  {
    name: 'identifyProductFlow',
    inputSchema: IdentifyProductInputSchema,
    outputSchema: IdentifyProductOutputSchema,
  },
  async input => {
    // In a real scenario with many products, you might filter knownProducts here
    // or use a vector DB for semantic search if the list is very large.
    // For this example, we pass the whole list (or a relevant subset) to the prompt.
    const {output} = await prompt(input);
    return output!;
  }
);
