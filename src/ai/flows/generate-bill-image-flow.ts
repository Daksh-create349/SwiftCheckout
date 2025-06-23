
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
Generate a highly realistic image of a standard store receipt. The image should be very clear, legible, and look like a printed paper receipt.

**Receipt Details:**

**Store Name:** ${input.storeName}
**Date:** ${input.currentDate}

------------------------------------
**Items:**
${formattedItems}
------------------------------------

**Subtotal:** ${input.currencySymbol}${input.subtotal.toFixed(2)}
**Discount (${input.discountPercentage.toFixed(2)}%):** -${input.currencySymbol}${input.discountAmount.toFixed(2)}
**Tax (${input.taxPercentage.toFixed(2)}%):** +${input.currencySymbol}${input.taxAmount.toFixed(2)}

------------------------------------
**GRAND TOTAL: ${input.currencySymbol}${input.grandTotal.toFixed(2)}**
------------------------------------

**Instructions for Generation:**
1.  **Layout:** Strictly follow the layout provided above. Ensure items are listed clearly, one per line if possible, with quantity, name, unit price, and item total.
2.  **Text Rendering:** Render ALL text, especially product names, quantities, and ALL monetary values (prices, totals, subtotal, grand total, discount, tax amounts), *exactly* as provided in the 'Receipt Details' section. All text must be extremely sharp, clear, and easy to read.
3.  **Font:** Use a simple, clean, monospaced font, like those used on typical thermal receipt printers.
4.  **Appearance:** The receipt must be vertically oriented. The background should be plain white or very light off-white. All text should be dark (black or very dark grey).
5.  **Simplicity & Accuracy:** Do NOT add any artistic embellishments, decorative elements, logos (unless the store name itself implies one, render it simply as text), or any extra text/graphics not explicitly requested in the 'Receipt Details'. The image must be purely functional and accurately represent a real-world printed receipt. Avoid any blurriness or distortion.
`;

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
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
