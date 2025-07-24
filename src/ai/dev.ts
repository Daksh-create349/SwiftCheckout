
import { config } from 'dotenv';
config();

import '@/ai/flows/cross-sell-suggestion.ts';
import '@/ai/flows/identify-product-flow.ts';
import '@/ai/flows/generate-bill-image-flow.ts';
import '@/ai/flows/get-product-price-by-name-flow.ts';
import '@/ai/flows/generate-product-image-flow.ts';
import '@/ai/flows/generate-showcase-video-flow.ts';
