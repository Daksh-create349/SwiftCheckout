
'use server';
/**
 * @fileOverview Generates an image of a bill/receipt with a specified currency symbol.
 *
 * - generateBillImage - A function that takes bill details (including currency symbol) and returns an image data URI.
 * - GenerateBillImageInput - The input type for the generateBillImage function.
 * - GenerateBillImageOutput - The return type for the generateBillImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BillItemSchema = z.object({
  name: z.string().describe('The name of the item.'),
  quantity: z.number().describe('The quantity of the item.'),
  price: z.number().describe('The price per unit of the item.'),
  total: z.number().describe('The total price for this item (quantity * price).'),
});

const GenerateBillImageInputSchema = z.object({
  storeName: z.string().describe('The name of the store for the receipt header.'),
  items: z.array(BillItemSchema).describe('A list of items on the bill.'),
  subtotal: z.number().describe('The subtotal amount before discounts and taxes.'),
  discountPercentage: z.number().describe('The discount percentage applied.'),
  discountAmount: z.number().describe('The total discount amount.'),
  taxPercentage: z.number().describe('The tax percentage applied.'),
  taxAmount: z.number().describe('The total tax amount.'),
  grandTotal: z.number().describe('The final grand total amount.'),
  currentDate: z.string().describe("The current date for the receipt (e.g., 'MM/DD/YYYY')."),
  currencySymbol: z.string().describe('The currency symbol to use for all monetary values (e.g., $, €, £).'),
});
export type GenerateBillImageInput = z.infer<typeof GenerateBillImageInputSchema>;

const GenerateBillImageOutputSchema = z.object({
  billImageDataUri: z
    .string()
    .describe(
      "The generated bill image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."
    ),
});
export type GenerateBillImageOutput = z.infer<typeof GenerateBillImageOutputSchema>;

export async function generateBillImage(input: GenerateBillImageInput): Promise<GenerateBillImageOutput> {
  return generateBillImageFlow(input);
}

// Helper function to format items for the prompt
function formatItemsForPrompt(items: Array<z.infer<typeof BillItemSchema>>, currencySymbol: string): string {
  return items
    .map(
      (item) =>
        `${item.quantity} x ${item.name} @ ${currencySymbol}${item.price.toFixed(2)} ea.  (Total: ${currencySymbol}${item.total.toFixed(2)})`
    )
    .join('\n');
}

const generateBillImageFlow = ai.defineFlow(
  {
    name: 'generateBillImageFlow',
    inputSchema: GenerateBillImageInputSchema,
    outputSchema: GenerateBillImageOutputSchema,
  },
  async (input) => {
    const formattedItems = formatItemsForPrompt(input.items, input.currencySymbol);

    const promptText = `
Generate an image that looks like a typical store receipt.

Store Name: ${input.storeName}
Date: ${input.currentDate}

------------------------------------
Items:
${formattedItems}
------------------------------------

Subtotal: ${input.currencySymbol}${input.subtotal.toFixed(2)}
Discount (${input.discountPercentage.toFixed(2)}%): -${input.currencySymbol}${input.discountAmount.toFixed(2)}
Tax (${input.taxPercentage.toFixed(2)}%): +${input.currencySymbol}${input.taxAmount.toFixed(2)}

------------------------------------
GRAND TOTAL: ${input.currencySymbol}${input.grandTotal.toFixed(2)}
------------------------------------

Thank you for your purchase!
Please make the image clear, legible, and resemble a printed paper receipt. Use a monospaced font if possible.
The background should be white or off-white, and text should be dark (black or dark grey).
The receipt should be vertically oriented.
`;

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', 
      prompt: promptText,
      config: {
        responseModalities: ['IMAGE', 'TEXT'], 
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed or returned no media URL.');
    }

    return { billImageDataUri: media.url };
  }
);
