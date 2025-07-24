
'use server';
/**
 * @fileOverview Generates a showcase video for the SwiftCheckout application.
 *
 * - generateShowcaseVideo - A function that generates a video and returns it as a data URI.
 * - GenerateShowcaseVideoOutput - The return type for the generateShowcaseVideo function.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';
import {MediaPart} from 'genkit/model';
import * as fs from 'fs';
import {Readable} from 'stream';

const GenerateShowcaseVideoOutputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "The generated video as a data URI. Expected format: 'data:video/mp4;base64,<encoded_data>'."
    ),
});
export type GenerateShowcaseVideoOutput = z.infer<typeof GenerateShowcaseVideoOutputSchema>;

// This helper function is for server-side saving, which we won't use to send to the client.
// Instead, we will base64 encode the buffer and send it in a data URI.
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const generateShowcaseVideoFlow = ai.defineFlow(
  {
    name: 'generateShowcaseVideoFlow',
    inputSchema: z.void(),
    outputSchema: GenerateShowcaseVideoOutputSchema,
  },
  async () => {
    const prompt =
      'A cinematic, high-tech video showcasing a futuristic point-of-sale application called SwiftCheckout. ' +
      'Show a person quickly scanning items with a tablet. The user interface on the tablet is sleek and modern, displaying product information and prices instantly. ' +
      'Animate icons representing AI, cloud computing, and security. The video should have a clean, professional, and slightly futuristic aesthetic. ' +
      'End with a shot of a stylized digital receipt being generated on the screen with the SwiftCheckout logo. Aspect ratio 16:9.';

    let {operation} = await ai.generate({
      model: googleAI.model('veo-2.0-generate-001'),
      prompt: prompt,
      config: {
        durationSeconds: 8,
        aspectRatio: '16:9',
        personGeneration: 'allow_adult',
      },
    });

    if (!operation) {
      throw new Error('Expected the model to return an operation.');
    }

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5s
      operation = await ai.checkOperation(operation);
    }

    if (operation.error) {
      console.error('Video generation failed:', operation.error);
      throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const videoPart = operation.output?.message?.content.find(p => !!p.media && p.media.contentType?.startsWith('video/'));
    if (!videoPart || !videoPart.media) {
      throw new Error('No video found in the generation result.');
    }
    
    // The media URL requires the API key to be appended for direct fetching.
    // This is a necessary step for accessing the raw video data.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in the environment variables.");
    }

    const fetch = (await import('node-fetch')).default;
    const videoDownloadResponse = await fetch(`${videoPart.media.url}&key=${apiKey}`);

    if (!videoDownloadResponse.ok || !videoDownloadResponse.body) {
        throw new Error(`Failed to download video file. Status: ${videoDownloadResponse.status}`);
    }

    // Convert the downloaded video stream to a base64 string
    const videoBuffer = await streamToBuffer(videoDownloadResponse.body);
    const videoBase64 = videoBuffer.toString('base64');
    
    return {
      videoDataUri: `data:video/mp4;base64,${videoBase64}`,
    };
  }
);


export async function generateShowcaseVideo(): Promise<GenerateShowcaseVideoOutput> {
    return generateShowcaseVideoFlow();
}
