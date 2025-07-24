
"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Search, Lightbulb, Bot } from 'lucide-react';

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
            <div className="relative min-h-[300px] md:min-h-full">
                 <Image
                    src="https://placehold.co/600x400.png"
                    alt="A cashier using a modern, AI-powered point-of-sale system"
                    fill
                    className="object-cover"
                    data-ai-hint="retail cashier modern"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent md:bg-gradient-to-r"></div>
            </div>
        </div>
      </Card>
    </section>
  );
}
