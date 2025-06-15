'use server';

/**
 * @fileOverview Provides cross-sell suggestions based on the current items in the cart.
 *
 * - getCrossSellSuggestions - A function that takes the current cart items and returns cross-sell suggestions.
 * - CrossSellSuggestionInput - The input type for the getCrossSellSuggestions function.
 * - CrossSellSuggestionOutput - The return type for the getCrossSellSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CrossSellSuggestionInputSchema = z.object({
  cartItems: z
    .array(
      z.object({
        name: z.string().describe('The name of the item in the cart.'),
        quantity: z.number().describe('The quantity of the item in the cart.'),
      })
    )
    .describe('The items currently in the cart.'),
});
export type CrossSellSuggestionInput = z.infer<typeof CrossSellSuggestionInputSchema>;

const CrossSellSuggestionOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('A list of product names that are frequently bought together with the items in the cart.'),
});
export type CrossSellSuggestionOutput = z.infer<typeof CrossSellSuggestionOutputSchema>;

export async function getCrossSellSuggestions(input: CrossSellSuggestionInput): Promise<CrossSellSuggestionOutput> {
  return crossSellSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'crossSellSuggestionPrompt',
  input: {schema: CrossSellSuggestionInputSchema},
  output: {schema: CrossSellSuggestionOutputSchema},
  prompt: `You are a helpful shopping assistant that suggests products frequently bought together with the current items in the cart.

  Here are the items currently in the cart:
  {{#each cartItems}}
  - {{quantity}} x {{name}}
  {{/each}}

  Suggest 3 products that are frequently bought together with these items. Only suggest product names and nothing else.
  Format output as JSON array of string.
  `, // Ensure output is a JSON array of strings
});

const crossSellSuggestionFlow = ai.defineFlow(
  {
    name: 'crossSellSuggestionFlow',
    inputSchema: CrossSellSuggestionInputSchema,
    outputSchema: CrossSellSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
