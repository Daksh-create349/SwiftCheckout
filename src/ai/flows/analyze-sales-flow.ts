
'use server';
/**
 * @fileOverview Analyzes sales data from a history of bills and generates insights.
 *
 * - analyzeSales - Takes bill history and returns a structured analysis with metrics and an AI summary.
 * - AnalyzeSalesInput - The input type for the analyzeSales function.
 * - AnalyzeSalesOutput - The return type for the analyzeSales function.
 */

import {ai} from '@/ai/genkit';
import type { BillRecord } from '@/types/billing';
import { AnalyzeSalesInputSchema, AnalyzeSalesOutputSchema, type AnalyzeSalesInput, type AnalyzeSalesOutput } from '@/types/billing';


export async function analyzeSales(input: AnalyzeSalesInput): Promise<AnalyzeSalesOutput> {
  return analyzeSalesFlow(input);
}


// Server-side data processing before calling the AI prompt
const processSalesData = (billHistory: BillRecord[], currencyCode: string) => {
    let totalRevenue = 0;
    const totalBills = billHistory.length;
    const productSales: Record<string, { quantitySold: number, revenueGenerated: number }> = {};
    const dailySales: Record<string, number> = {};

    billHistory.forEach(bill => {
        totalRevenue += bill.grandTotal;

        const billDate = bill.date.split('T')[0]; // Get YYYY-MM-DD
        dailySales[billDate] = (dailySales[billDate] || 0) + bill.grandTotal;

        bill.items.forEach(item => {
            if (!productSales[item.name]) {
                productSales[item.name] = { quantitySold: 0, revenueGenerated: 0 };
            }
            productSales[item.name].quantitySold += item.quantity;
            productSales[item.name].revenueGenerated += item.quantity * item.price;
        });
    });

    const averageBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;

    const topSellingProducts = Object.entries(productSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
        .slice(0, 10); // Limit to top 10

    const dailySalesArray = Object.entries(dailySales)
        .map(([date, totalRevenue]) => ({ date, totalRevenue }))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    return {
        metrics: { totalRevenue, totalBills, averageBillValue },
        topSellingProducts,
        dailySales: dailySalesArray,
    };
};


const prompt = ai.definePrompt({
  name: 'salesAnalysisPrompt',
  input: { schema: AnalyzeSalesInputSchema },
  output: { schema: AnalyzeSalesOutputSchema },
  prompt: `You are a business intelligence analyst. You have been provided with sales data.
Your task is to analyze this data and provide a concise, insightful summary for a business owner.

Here is the sales data:
- Currency: {{currencyCode}}
- Total Bills: {{billHistory.length}}
- All Bills:
{{#each billHistory}}
  - Bill ID: {{id}} on {{date}}
    - Total: {{currencySymbol}}{{grandTotal}}
    - Items:
    {{#each items}}
      - {{quantity}}x {{name}} at {{price}}
    {{/each}}
{{/each}}

Please perform the following:
1.  Calculate the key metrics: total revenue, total number of bills, and average bill value.
2.  Identify the top 5 selling products by revenue generated.
3.  Summarize the daily sales trend.
4.  Generate a concise, natural-language "aiSummary" of the most important insights. Highlight trends, top-performing products, and any actionable advice you can offer. For example, mention if sales are concentrated on specific days or if a particular product is a standout success.
`,
});

const analyzeSalesFlow = ai.defineFlow(
  {
    name: 'analyzeSalesFlow',
    inputSchema: AnalyzeSalesInputSchema,
    outputSchema: AnalyzeSalesOutputSchema,
  },
  async (input) => {
    if (input.billHistory.length === 0) {
        return {
            metrics: { totalRevenue: 0, totalBills: 0, averageBillValue: 0 },
            topSellingProducts: [],
            dailySales: [],
            aiSummary: "No sales data available to analyze. Please complete some transactions first."
        };
    }

    const processedData = processSalesData(input.billHistory, input.currencyCode);
    
    // We can use the server-processed data to get structured output
    // and call the LLM for the AI summary part.
    const { output } = await prompt(input);

    // Combine server-processed data with the AI-generated summary
    return {
      metrics: processedData.metrics,
      topSellingProducts: processedData.topSellingProducts,
      dailySales: processedData.dailySales,
      aiSummary: output!.aiSummary, // Use the summary from the LLM
    };
  }
);
