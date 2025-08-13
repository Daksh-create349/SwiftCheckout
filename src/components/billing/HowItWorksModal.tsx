
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Camera, Search, Lightbulb, Bot, Wand2, Mic, Receipt, LineChart, Move3d } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
    {
      icon: Camera,
      title: "Camera & Barcode Scanning",
      description: "Use your device's camera to instantly identify any product just by pointing at it. The AI recognizes the object and fetches its name and estimated market price. It works on standard barcodes, too!",
    },
    {
      icon: Mic,
      title: "Voice Commands",
      description: "Speak directly to the app to add items. For example, saying \"Add two avocados\" will transcribe your voice, identify the product and quantity, and populate the form for you to confirm.",
    },
    {
      icon: Search,
      title: "AI-Powered Manual Entry",
      description: "If you prefer typing, the AI assists you. Enter a product name, and the app will fetch its real-time market price in your selected currency, saving you from manual price checks.",
    },
    {
      icon: Bot,
      title: "Generative UI: Product & Bill Images",
      description: "SwiftCheckout generates parts of its own interface. When a product is identified, a photorealistic image is created on the fly. When you finalize a bill, a realistic receipt image is generated instantly.",
    },
    {
      icon: Lightbulb,
      title: "Smart Cross-Sell Suggestions",
      description: "To help increase sales, the AI analyzes the items currently in the cart and suggests other products that are frequently bought together, prompting customers to add more to their purchase.",
    },
    {
      icon: LineChart,
      title: "AI Sales Analytics Dashboard",
      description: "Navigate to the Dashboard to see your business performance. The AI analyzes your sales history to provide key metrics (like total revenue), charts for trends, and a natural-language summary with actionable insights.",
    },
     {
      icon: Wand2,
      title: "Showcase Page",
      description: "The Showcase page allows you to generate sample receipt images from different business scenarios (like a coffee shop or bookstore). It's a great way to create content for a portfolio or social media.",
    },
    {
      icon: Move3d,
      title: "Sensor-Based Scrolling",
      description: "For a touch of futuristic navigation, you can enable sensor-based scrolling. Simply tilt your device up or down to scroll the page, no thumbs required.",
    },
];

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-headline flex items-center justify-center gap-2">
            <Zap className="h-7 w-7 text-primary" /> How SwiftCheckout Works
          </DialogTitle>
          <DialogDescription>
            A breakdown of the AI-powered features that make billing fast and intelligent.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] p-4 pr-6">
            <div className="space-y-6">
                {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-4">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mt-1">
                            <feature.icon className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg">{feature.title}</h4>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

