
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
      "The generated bill image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'"
    ),
});
export type GenerateBillImageOutput = z.infer<typeof GenerateBillImageOutputSchema>;

export async function generateBillImage(input: GenerateBillImageInput): Promise<GenerateBillImageOutput> {
  return generateBillImageFlow(input);
}

// Helper function to format items for the prompt, aligning them for better output
function formatItemsForPrompt(items: Array<z.infer<typeof BillItemSchema>>, currencySymbol: string): string {
    const NAME_WIDTH = 20;
    const QTY_WIDTH = 4;
    const PRICE_WIDTH = 8;
    const TOTAL_WIDTH = 10;

    let header = 'Item'.padEnd(NAME_WIDTH) + 'Qty'.padStart(QTY_WIDTH) + 'Price'.padStart(PRICE_WIDTH) + 'Total'.padStart(TOTAL_WIDTH);
    let separator = '-'.repeat(header.length);

    let itemLines = items.map(item => {
        const name = item.name.length > NAME_WIDTH ? item.name.substring(0, NAME_WIDTH - 3) + '...' : item.name;
        const qty = item.quantity.toString();
        const price = `${currencySymbol}${item.price.toFixed(2)}`;
        const total = `${currencySymbol}${item.total.toFixed(2)}`;

        return name.padEnd(NAME_WIDTH) +
               qty.padStart(QTY_WIDTH) +
               price.padStart(PRICE_WIDTH) +
               total.padStart(TOTAL_WIDTH);
    }).join('\n');

    return `${header}\n${separator}\n${itemLines}`;
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
Generate a highly realistic image of a standard store receipt. The receipt should be vertically oriented, clear, legible, and look like it was printed on white paper from a thermal printer.

**Receipt Details:**

************************************
        ${input.storeName}
         Date: ${input.currentDate}
************************************

${formattedItems}

------------------------------------
Subtotal:${input.currencySymbol}${input.subtotal.toFixed(2).padStart(29)}
Discount (${input.discountPercentage.toFixed(2)}%):${`-${input.currencySymbol}${input.discountAmount.toFixed(2)}`.padStart(22)}
Tax (${input.taxPercentage.toFixed(2)}%):${`+${input.currencySymbol}${input.taxAmount.toFixed(2)}`.padStart(26)}
------------------------------------
GRAND TOTAL:${input.currencySymbol}${input.grandTotal.toFixed(2).padStart(26)}
************************************
Thank you for your purchase!
************************************

**Instructions for Generation:**
1.  **Layout & Font:** Strictly follow the layout and spacing provided above. Use a simple, clean, monospaced font commonly used on thermal receipt printers (e.g., Courier, Lucida Console). All text must be sharp and easy to read.
2.  **Appearance:** The background must be plain white. All text must be dark (black or very dark grey). The receipt must be vertically oriented.
3.  **Simplicity & Accuracy:** Do NOT add any artistic embellishments, table lines, decorative elements, logos, or any extra text/graphics not explicitly requested in the 'Receipt Details'. Render all text and numbers *exactly* as provided. Avoid blurriness or distortion.
`;
    try {
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
        throw new Error('Image generation failed to return a valid media URL.');
      }

      return { billImageDataUri: media.url };
    } catch (error) {
       console.error("Error in generateBillImageFlow:", error);
       throw new Error('Image generation failed. The service may be unavailable, the prompt was blocked by safety filters, or environment variables may be missing.');
    }
  }
);
