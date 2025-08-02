
'use server';
/**
 * @fileOverview Interprets a voice command to add items to a shopping cart.
 *
 * - interpretVoiceCommand - Transcribes audio, identifies the first product mentioned,
 *   fetches its price, and returns a structured item to populate the input form.
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
    From the following text, extract the product(s) and their quantities.

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
        return { transcribedText: "Could not understand audio.", itemToAdd: null };
    }

    // 2. Interpret the transcribed text to get product names and quantities
    const interpretationResult = await interpretationPrompt({ text: transcribedText });
    const { items: interpretedItems } = interpretationResult.output || { items: [] };

    if (!interpretedItems || interpretedItems.length === 0) {
        return { transcribedText, itemToAdd: null };
    }
    
    // 3. Take only the FIRST interpreted item and fetch its price.
    const firstItem = interpretedItems[0];
    let pricedItem: IdentifiedItem | null = null;

    try {
        const priceInput: GetProductPriceByNameInput = {
            productName: firstItem.productName,
            currencyCode,
        };
        const priceResult = await getProductPriceByName(priceInput);
        pricedItem = {
            name: priceResult.name,
            price: priceResult.price,
            quantity: firstItem.quantity,
            originalPrice: priceResult.price,
        };
    } catch (error) {
        console.error(`Could not fetch price for '${firstItem.productName}':`, error);
        // If pricing fails, we still return the transcribed text but no item.
        return { transcribedText, itemToAdd: null };
    }
    
    return {
      transcribedText,
      itemToAdd: pricedItem,
    };
  }
);
