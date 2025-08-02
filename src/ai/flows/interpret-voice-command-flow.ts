
'use server';
/**
 * @fileOverview Interprets a voice command to add items to a shopping cart.
 *
 * - interpretVoiceCommand - Transcribes audio, identifies products and quantities,
 *   fetches their prices, and returns a structured list of items to add to the cart.
 * - InterpretVoiceCommandInput - The input type for the interpretVoiceCommand function.
 * - InterpretVoiceCommandOutput - The return type for the interpretVoiceCommand function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getProductPriceByName, type GetProductPriceByNameInput } from './get-product-price-by-name-flow';
import type { IdentifiedItem, InterpretVoiceCommandInput, InterpretVoiceCommandOutput } from '@/types/billing';
import { InterpretVoiceCommandInputSchema, InterpretVoiceCommandOutputSchema, VoiceInterpretationSchema } from '@/types/billing';


export async function interpretVoiceCommand(input: InterpretVoiceCommandInput): Promise<InterpretVoiceCommandOutput> {
  return interpretVoiceCommandFlow(input);
}

// Prompt to extract structured data from transcribed text
const interpretationPrompt = ai.definePrompt({
    name: 'interpretationPrompt',
    input: { schema: z.object({ text: z.string() }) },
    output: { schema: VoiceInterpretationSchema },
    prompt: `You are an expert at interpreting shopping commands.
    From the following text, extract the products and their quantities.

    Text: "{{text}}"`,
});

const interpretVoiceCommandFlow = ai.defineFlow(
  {
    name: 'interpretVoiceCommandFlow',
    inputSchema: InterpretVoiceCommandInputSchema,
    outputSchema: InterpretVoiceCommandOutputSchema,
  },
  async ({ audioDataUri, currencyCode }) => {
    // 1. Transcribe audio to text
    const { text } = await ai.generate({
      prompt: [{ media: { url: audioDataUri } }],
      model: 'googleai/gemini-2.0-flash',
      config: {
        responseModalities: ['TEXT'],
      }
    });

    if (!text) {
        throw new Error("Failed to transcribe audio command.");
    }
    const transcribedText = text.trim();
    if (!transcribedText) {
        return { transcribedText: "Could not understand audio.", itemsToAdd: [] };
    }

    // 2. Interpret the transcribed text to get product names and quantities
    const interpretationResult = await interpretationPrompt({ text: transcribedText });
    const { items: interpretedItems } = interpretationResult.output || { items: [] };

    if (!interpretedItems || interpretedItems.length === 0) {
        return { transcribedText, itemsToAdd: [] };
    }

    // 3. For each interpreted item, fetch its price concurrently
    const pricedItemsPromises = interpretedItems.map(async (item) => {
        try {
            const priceInput: GetProductPriceByNameInput = {
                productName: item.productName,
                currencyCode,
            };
            const priceResult = await getProductPriceByName(priceInput);
            return {
                name: priceResult.name,
                price: priceResult.price,
                quantity: item.quantity,
                originalPrice: priceResult.price,
            };
        } catch (error) {
            console.error(`Could not fetch price for '${item.productName}':`, error);
            // Return null for items we couldn't price
            return null;
        }
    });

    const settledItems = await Promise.all(pricedItemsPromises);
    const successfullyPricedItems = settledItems.filter((item): item is IdentifiedItem => item !== null);
    
    return {
      transcribedText,
      itemsToAdd: successfullyPricedItems,
    };
  }
);
