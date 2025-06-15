
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ProductInputForm } from '@/components/billing/ProductInputForm';
import { ItemList } from '@/components/billing/ItemList';
import { TotalsDisplay } from '@/components/billing/TotalsDisplay';
import { DiscountTaxForm } from '@/components/billing/DiscountTaxForm';
import { CrossSellSuggestions } from '@/components/billing/CrossSellSuggestions';
import { PaymentModal } from '@/components/billing/PaymentModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { CartItem } from '@/types/billing';
import { getCrossSellSuggestions, type CrossSellSuggestionInput } from '@/ai/flows/cross-sell-suggestion';
import { generateBillImage, type GenerateBillImageInput } from '@/ai/flows/generate-bill-image-flow';
import { Zap, AlertTriangle, CheckCircle, ShoppingBag, Printer, Loader2 } from 'lucide-react';

export default function SwiftCheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [crossSellSuggestions, setCrossSellSuggestions] = useState<string[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState<boolean>(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isBillFinalized, setIsBillFinalized] = useState<boolean>(false);
  const [billImageDataUri, setBillImageDataUri] = useState<string | null>(null);
  const [isGeneratingBillImage, setIsGeneratingBillImage] = useState<boolean>(false);

  const { toast } = useToast();
  const billImageRef = useRef<HTMLImageElement>(null);

  const calculateSubtotal = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const [subtotal, setSubtotal] = useState(calculateSubtotal());
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    const currentSubtotal = calculateSubtotal();
    const currentDiscountAmount = currentSubtotal * (discountPercentage / 100);
    const taxableAmount = currentSubtotal - currentDiscountAmount;
    const currentTaxAmount = taxableAmount * (taxPercentage / 100);
    const currentGrandTotal = taxableAmount + currentTaxAmount;

    setSubtotal(currentSubtotal);
    setDiscountAmount(currentDiscountAmount);
    setTaxAmount(currentTaxAmount);
    setGrandTotal(currentGrandTotal);
  }, [cartItems, discountPercentage, taxPercentage, calculateSubtotal]);


  const fetchCrossSellSuggestions = useCallback(async () => {
    if (cartItems.length === 0) {
      setCrossSellSuggestions([]);
      return;
    }
    setIsSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const input: CrossSellSuggestionInput = {
        cartItems: cartItems.map(item => ({ name: item.name, quantity: item.quantity })),
      };
      const result = await getCrossSellSuggestions(input);
      setCrossSellSuggestions(result.suggestions);
    } catch (error) {
      console.error("Error fetching cross-sell suggestions:", error);
      setSuggestionsError((error as Error).message || "Failed to load suggestions.");
      setCrossSellSuggestions([]);
    } finally {
      setIsSuggestionsLoading(false);
    }
  }, [cartItems]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchCrossSellSuggestions();
    }, 500); 
    return () => clearTimeout(debounceTimer);
  }, [cartItems, fetchCrossSellSuggestions]);

  const handleAddItem = (name: string, price: number, quantity: number, originalPrice: number) => {
    setCartItems(prevItems => {
      const newItemId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const existingItemIndex = prevItems.findIndex(item => item.name.toLowerCase() === name.toLowerCase());

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        updatedItems[existingItemIndex].price = price; 
        updatedItems[existingItemIndex].originalPrice = originalPrice;
        toast({ title: "Item Updated", description: `${name} quantity increased.`, className: "bg-green-500 text-white" });
        return updatedItems;
      } else {
         toast({ title: "Item Added", description: `${name} added to bill.`, className: "bg-green-500 text-white" });
        return [...prevItems, { 
          id: newItemId,
          productId: name, 
          name: name, 
          price: price, 
          quantity,
          originalPrice: originalPrice,
        }];
      }
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
    toast({ title: "Item Removed", description: `Item removed from bill.`, variant: "destructive" });
  };
  
  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleApplyDiscount = (percentage: number) => {
    setDiscountPercentage(percentage);
    toast({ title: "Discount Updated", description: `Discount set to ${percentage}%.` });
  };

  const handleApplyTax = (percentage: number) => {
    setTaxPercentage(percentage);
    toast({ title: "Tax Updated", description: `Tax rate set to ${percentage}%.` });
  };

  const handleFinalizeBill = async () => {
    if (cartItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Bill",
        description: "Cannot finalize an empty bill. Please add items.",
      });
      return;
    }

    setIsGeneratingBillImage(true);
    setBillImageDataUri(null); // Clear previous image

    try {
      const billImageInput: GenerateBillImageInput = {
        storeName: "SwiftCheckout",
        items: cartItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        subtotal,
        discountPercentage,
        discountAmount,
        taxPercentage,
        taxAmount,
        grandTotal,
        currentDate: new Date().toLocaleDateString(),
      };
      const result = await generateBillImage(billImageInput);
      setBillImageDataUri(result.billImageDataUri);
      toast({ title: "Bill Image Generated", description: "The bill image is ready for printing.", className: "bg-green-500 text-white" });
    } catch (error) {
      console.error("Error generating bill image:", error);
      toast({
        variant: "destructive",
        title: "Image Generation Failed",
        description: (error as Error).message || "Could not generate bill image.",
      });
    } finally {
      setIsGeneratingBillImage(false);
    }
    
    setIsBillFinalized(true);
    setIsPaymentModalOpen(true);
  };

  const handlePrintBill = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && billImageDataUri) {
      printWindow.document.write(`
        <html>
          <head><title>Print Bill</title></head>
          <body style="margin:0; padding:0; display:flex; justify-content:center; align-items:center; min-height:100vh;">
            <img src="${billImageDataUri}" style="max-width:100%; max-height:100vh; object-fit:contain;" onload="window.print(); setTimeout(window.close, 100);" />
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      toast({ variant: "destructive", title: "Print Error", description: "Could not open print window or no bill image found." });
    }
  };

  const handlePaymentSelect = (method: string) => {
    setIsPaymentModalOpen(false);
    setCartItems([]);
    setDiscountPercentage(0);
    setTaxPercentage(0);
    setCrossSellSuggestions([]);
    setIsBillFinalized(false);
    setBillImageDataUri(null);

    toast({
      title: "Payment Processed",
      description: `Payment of $${grandTotal.toFixed(2)} via ${method.replace('_', ' ')} successful. New bill started.`,
      className: "bg-primary text-primary-foreground"
    });
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 lg:p-8 bg-background font-body">
      <header className="mb-6 md:mb-8">
        <Card className="shadow-md">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="h-10 w-10 text-primary animate-pulse" />
              <h1 className="ml-3 text-3xl md:text-4xl font-bold font-headline text-primary">SwiftCheckout</h1>
            </div>
            <Button 
              variant="default"
              className="bg-accent hover:bg-accent/80 text-accent-foreground" 
              onClick={handleFinalizeBill}
              disabled={cartItems.length === 0 || isBillFinalized || isGeneratingBillImage}
              aria-label="Finalize Bill and Proceed to Payment"
            >
              {isGeneratingBillImage ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-5 w-5" />
              )}
              {isGeneratingBillImage ? "Generating Bill..." : "Finalize Bill"}
            </Button>
          </div>
        </Card>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <section className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
          {!isBillFinalized && (
            <ProductInputForm onAddItem={handleAddItem} />
          )}
          {isBillFinalized && cartItems.length > 0 && (
             <Card className="p-6 text-center bg-green-50 border-green-200 shadow-md">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <h2 className="text-xl font-semibold text-green-700 font-headline">Bill Finalized</h2>
              {isGeneratingBillImage && <p className="text-muted-foreground">Generating bill image...</p>}
              {!isGeneratingBillImage && billImageDataUri && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Generated Bill Image:</h3>
                  <Image 
                    ref={billImageRef}
                    src={billImageDataUri} 
                    alt="Generated Bill" 
                    width={400} 
                    height={600} 
                    className="rounded-md border shadow-sm mx-auto"
                    data-ai-hint="receipt bill"
                  />
                  <Button onClick={handlePrintBill} className="mt-4 bg-primary hover:bg-primary/90">
                    <Printer className="mr-2 h-5 w-5" /> Print Bill
                  </Button>
                </div>
              )}
              {!isGeneratingBillImage && !billImageDataUri && <p className="text-red-600">Could not generate bill image. Proceed to payment.</p>}
              {isGeneratingBillImage ? null : <p className="text-green-600 mt-2">Proceed to payment or review summary.</p>}
            </Card>
          )}
          <ItemList items={cartItems} onRemoveItem={handleRemoveItem} onUpdateQuantity={handleUpdateQuantity} />
        </section>

        <section className="lg:col-span-1 flex flex-col gap-6 md:gap-8">
          <TotalsDisplay 
            subtotal={subtotal} 
            discountAmount={discountAmount} 
            taxAmount={taxAmount} 
            grandTotal={grandTotal} 
          />
          {!isBillFinalized && (
            <DiscountTaxForm 
              onApplyDiscount={handleApplyDiscount} 
              onApplyTax={handleApplyTax}
              currentDiscount={discountPercentage}
              currentTax={taxPercentage}
            />
          )}
          <CrossSellSuggestions 
            suggestions={crossSellSuggestions} 
            isLoading={isSuggestionsLoading}
            error={suggestionsError}
          />
        </section>
      </main>
      
      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentSelect={handlePaymentSelect}
        grandTotal={grandTotal}
      />

      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SwiftCheckout. Efficiency at your fingertips.</p>
      </footer>
    </div>
  );
}
