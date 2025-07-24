
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Search, Lightbulb, Bot, AlertTriangle, Loader2 } from 'lucide-react';
import { generateShowcaseImage } from '@/ai/flows/generate-showcase-image-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const features = [
    {
        icon: Camera,
        title: "Scan & Identify",
        description: "Use your device's camera to instantly identify any product. No barcodes needed.",
    },
    {
        icon: Search,
        title: "AI-Powered Pricing",
        description: "Get accurate, real-time market prices for scanned or manually entered items.",
    },
    {
        icon: Lightbulb,
        title: "Smart Suggestions",
        description: "The AI suggests items that are frequently bought together to help you upsell.",
    },
    {
        icon: Bot,
        title: "Generative UI",
        description: "From product images to final receipts, the UI is generated on the fly by AI.",
    }
];

export function HowItWorks() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await generateShowcaseImage();
        setImageUrl(result.showcaseImageDataUri);
      } catch (err) {
        console.error("Error generating showcase image:", err);
        setError((err as Error).message || "Failed to load AI-generated image. Please try refreshing.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, []);

  return (
    <section className="mb-6 md:mb-8">
      <Card className="shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 md:p-8 flex flex-col justify-center">
                <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-2xl md:text-3xl font-bold font-headline text-primary">The Future of Checkout is Here</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <p className="text-muted-foreground mb-6">
                        SwiftCheckout uses cutting-edge AI to transform your billing process. Forget manual entry and outdated catalogs—just point, scan, and sell.
                    </p>
                    <ul className="space-y-4">
                        {features.map((feature, index) => (
                           <li key={index} className="flex items-start gap-4 animate-fade-in" style={{ animationDelay: `${index * 200}ms` }}>
                                <div className="flex-shrink-0 h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                                    <feature.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">{feature.title}</h4>
                                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </div>
            <div className="relative min-h-[300px] md:min-h-full bg-muted/30 flex items-center justify-center">
                 {isLoading && (
                    <div className="flex flex-col items-center text-primary">
                        <Loader2 className="h-10 w-10 animate-spin" />
                    </div>
                 )}
                 {error && !isLoading && (
                    <div className="p-4">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Image Generation Failed</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </div>
                 )}
                 {imageUrl && !isLoading && !error && (
                    <>
                        <Image
                            src={imageUrl}
                            alt="An AI-generated image of a modern, futuristic point-of-sale system in a stylish retail environment."
                            fill
                            className="object-cover animate-fade-in"
                            data-ai-hint="touchscreen checkout"
                            key={imageUrl} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent md:bg-gradient-to-r"></div>
                    </>
                 )}
            </div>
        </div>
      </Card>
    </section>
  );
}
