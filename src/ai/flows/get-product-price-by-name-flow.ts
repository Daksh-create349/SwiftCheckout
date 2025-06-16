'use server';
/**
 * @fileOverview Estimates the price of a product given its name and a target currency.
 *
 * - getProductPriceByName - A function that takes a product name and currency code,
 *   then returns an estimated price for that product in the specified currency.
 * - GetProductPriceByNameInput - The input type for the getProductPriceByName function.
 * - GetProductPriceByNameOutput - The return type for the getProductPriceByName function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetProductPriceByNameInputSchema = z.object({
  productName: z.string().describe('The name or identifier of the product (e.g., from a barcode scan).'),
  currencyCode: z.string().describe('The currency code for the price estimate (e.g., USD, EUR, JPY).'),
});
export type GetProductPriceByNameInput = z.infer<typeof GetProductPriceByNameInputSchema>;

const GetProductPriceByNameOutputSchema = z.object({
  name: z.string().describe('The product name provided as input.'),
  price: z.number().describe('The estimated market price in the specified currency for the product.'),
});
export type GetProductPriceByNameOutput = z.infer<typeof GetProductPriceByNameOutputSchema>;

export async function getProductPriceByName(input: GetProductPriceByNameInput): Promise<GetProductPriceByNameOutput> {
  return getProductPriceByNameFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getProductPriceByNamePrompt',
  input: {schema: GetProductPriceByNameInputSchema},
  output: {schema: GetProductPriceByNameOutputSchema},
  prompt: `You are a pricing expert.
You will be given a product name/identifier and a target currency code.
Your task is to:
1. Estimate its typical market price in the currency specified by {{currencyCode}}.
2. Return the original product name/identifier and the estimated price.

Product Name/Identifier: {{productName}}
Target Currency: {{currencyCode}}`,
});

const getProductPriceByNameFlow = ai.defineFlow(
  {
    name: 'getProductPriceByNameFlow',
    inputSchema: GetProductPriceByNameInputSchema,
    outputSchema: GetProductPriceByNameOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure the output name matches the input name, as the AI might slightly alter it.
    return { ...output!, name: input.productName };
  }
);
