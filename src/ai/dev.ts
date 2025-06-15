
import { config } from 'dotenv';
config();

import '@/ai/flows/cross-sell-suggestion.ts';
// identify-product-flow.ts is imported and used directly by ProductInputForm.tsx
// No need to register it for dev server direct invocation if not intended for that.
// If you still want to test it via Genkit dev UI, uncomment the line below:
// import '@/ai/flows/identify-product-flow.ts';
