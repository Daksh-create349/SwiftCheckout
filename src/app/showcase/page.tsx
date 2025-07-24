
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Camera, Wand2, ArrowLeft, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateBillImage, type GenerateBillImageInput } from '@/ai/flows/generate-bill-image-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

// Mock data for different receipt types
const showcaseScenarios: Record<string, GenerateBillImageInput> = {
  coffeeShop: {
    storeName: "The Grind House",
    items: [
      { name: "Espresso", quantity: 2, price: 3.50, total: 7.00 },
      { name: "Almond Croissant", quantity: 1, price: 4.25, total: 4.25 },
      { name: "Latte", quantity: 1, price: 5.00, total: 5.00 },
    ],
    subtotal: 16.25,
    discountPercentage: 10,
    discountAmount: 1.63,
    taxPercentage: 8.5,
    taxAmount: 1.24,
    grandTotal: 15.86,
    currentDate: "10/28/2024",
    currencySymbol: "$",
  },
  bookstore: {
    storeName: "The Reader's Nook",
    items: [
      { name: "Sci-Fi Novel", quantity: 1, price: 15.99, total: 15.99 },
      { name: "Bookmark Set", quantity: 2, price: 4.50, total: 9.00 },
      { name: "Literary Journal", quantity: 1, price: 22.00, total: 22.00 },
    ],
    subtotal: 46.99,
    discountPercentage: 0,
    discountAmount: 0,
    taxPercentage: 5,
    taxAmount: 2.35,
    grandTotal: 49.34,
    currentDate: "11/15/2024",
    currencySymbol: "£",
  },
  groceryStore: {
    storeName: "Farm Fresh Grocers",
    items: [
        { name: "Organic Apples (1kg)", quantity: 1, price: 4.99, total: 4.99 },
        { name: "Sourdough Bread", quantity: 1, price: 5.49, total: 5.49 },
        { name: "Almond Milk", quantity: 2, price: 3.79, total: 7.58 },
        { name: "Free-range Eggs", quantity: 1, price: 6.20, total: 6.20 },
    ],
    subtotal: 24.26,
    discountPercentage: 5,
    discountAmount: 1.21,
    taxPercentage: 2,
    taxAmount: 0.46,
    grandTotal: 23.51,
    currentDate: "12/01/2024",
    currencySymbol: "€",
  },
};

type ShowcaseItem = {
    id: string;
    title: string;
    input: GenerateBillImageInput;
    imageUrl: string | null;
    isLoading: boolean;
    error: string | null;
};

export default function ShowcasePage() {
  const { toast } = useToast();
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([
    { id: 'coffeeShop', title: 'Coffee Shop Receipt', input: showcaseScenarios.coffeeShop, imageUrl: null, isLoading: false, error: null },
    { id: 'bookstore', title: 'Bookstore Receipt', input: showcaseScenarios.bookstore, imageUrl: null, isLoading: false, error: null },
    { id: 'groceryStore', title: 'Grocery Store Receipt', input: showcaseScenarios.groceryStore, imageUrl: null, isLoading: false, error: null },
  ]);

  const handleGenerateImage = async (id: string) => {
    // Update state to show loading
    setShowcaseItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, isLoading: true, error: null, imageUrl: null } : item
      )
    );
    toast({ title: `Generating ${id.replace(/([A-Z])/g, ' $1')}...`, description: 'The AI is creating your image.' });
    
    try {
        const itemToGenerate = showcaseItems.find(item => item.id === id);
        if (!itemToGenerate) return;
        
        const result = await generateBillImage(itemToGenerate.input);

        // Update state with the generated image
        setShowcaseItems(prevItems =>
            prevItems.map(item =>
            item.id === id ? { ...item, isLoading: false, imageUrl: result.billImageDataUri } : item
            )
        );

        toast({ title: "Image Generated!", description: 'Your showcase image is ready.', className: "bg-green-500 text-white" });

    } catch (error) {
        const errorMessage = (error as Error).message || "An unknown error occurred.";
        console.error("Error generating showcase image:", error);
        
        // Update state with the error
        setShowcaseItems(prevItems =>
            prevItems.map(item =>
            item.id === id ? { ...item, isLoading: false, error: errorMessage } : item
            )
        );

        toast({
            variant: "destructive",
            title: "Generation Failed",
            description: errorMessage,
        });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <header className="mb-6 md:mb-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center">
            <Wand2 className="h-10 w-10 text-primary" />
            <h1 className="ml-3 text-3xl md:text-4xl font-bold font-headline text-primary">
                SwiftCheckout Showcase
            </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="default">
              <Link href="/showcase/video">
                  <Video className="mr-2 h-4 w-4" />
                  Generate Video
              </Link>
          </Button>
          <Button asChild variant="outline">
              <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to App
              </Link>
          </Button>
        </div>
      </header>

      <div className="text-center max-w-2xl mx-auto mb-10">
        <p className="text-muted-foreground">
          This page uses the app's built-in AI to generate sample receipts. Click a button to generate a bill image, then right-click or long-press to save it for your LinkedIn profile or portfolio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {showcaseItems.map(item => (
          <Card key={item.id} className="shadow-lg flex flex-col">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
              <div className="w-full h-80 flex items-center justify-center bg-muted/30 rounded-md p-4 mb-4">
                {item.isLoading && (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">AI is generating...</p>
                  </div>
                )}
                {item.error && !item.isLoading && (
                  <Alert variant="destructive">
                    <AlertTitle>Generation Failed</AlertTitle>
                    <AlertDescription>{item.error}</AlertDescription>
                  </Alert>
                )}
                {item.imageUrl && !item.isLoading && (
                   <Image
                        src={item.imageUrl}
                        alt={`Generated receipt for ${item.title}`}
                        width={300}
                        height={450}
                        className="rounded-md border-2 border-border shadow-2xl object-contain max-h-full w-auto"
                        data-ai-hint="receipt showcase"
                    />
                )}
                 {!item.imageUrl && !item.isLoading && !item.error && (
                    <div className="text-center text-muted-foreground">
                        <p>Click the button below to generate this receipt.</p>
                    </div>
                 )}
              </div>
              <Button
                onClick={() => handleGenerateImage(item.id)}
                disabled={item.isLoading}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {item.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                {item.isLoading ? 'Generating...' : `Generate ${item.title}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

       <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SwiftCheckout Showcase</p>
      </footer>
    </div>
  );
}

