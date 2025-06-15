"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ProductInputForm } from '@/components/billing/ProductInputForm';
import { ItemList } from '@/components/billing/ItemList';
import { TotalsDisplay } from '@/components/billing/TotalsDisplay';
import { DiscountTaxForm } from '@/components/billing/DiscountTaxForm';
import { CrossSellSuggestions } from '@/components/billing/CrossSellSuggestions';
import { PaymentModal } from '@/components/billing/PaymentModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Product, CartItem } from '@/types/billing';
import { getCrossSellSuggestions, type CrossSellSuggestionInput } from '@/ai/flows/cross-sell-suggestion';
import { Zap, AlertTriangle, CheckCircle, ShoppingBag } from 'lucide-react';

export default function SwiftCheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [crossSellSuggestions, setCrossSellSuggestions] = useState<string[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState<boolean>(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isBillFinalized, setIsBillFinalized] = useState<boolean>(false);

  const { toast } = useToast();

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
    }, 500); // Debounce AI calls
    return () => clearTimeout(debounceTimer);
  }, [cartItems, fetchCrossSellSuggestions]);

  const handleAddItem = (product: Product, quantity: number, manualPrice?: number) => {
    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.productId === product.id);
      const priceToUse = manualPrice !== undefined ? manualPrice : product.price;

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        updatedItems[existingItemIndex].price = priceToUse; // Update price if overridden
        updatedItems[existingItemIndex].originalPrice = product.price;
        return updatedItems;
      } else {
        return [...prevItems, { 
          productId: product.id, 
          name: product.name, 
          price: priceToUse, 
          quantity,
          originalPrice: product.price,
        }];
      }
    });
    toast({ title: "Item Added", description: `${product.name} added to bill.`, className: "bg-green-500 text-white" });
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.productId !== productId));
    toast({ title: "Item Removed", description: `Item removed from bill.`, variant: "destructive" });
  };
  
  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.productId === productId ? { ...item, quantity: newQuantity } : item
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

  const handleFinalizeBill = () => {
    if (cartItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Bill",
        description: "Cannot finalize an empty bill. Please add items.",
      });
      return;
    }
    setIsBillFinalized(true);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSelect = (method: string) => {
    setIsPaymentModalOpen(false);
    // Reset for new bill
    setCartItems([]);
    setDiscountPercentage(0);
    setTaxPercentage(0);
    setCrossSellSuggestions([]);
    setIsBillFinalized(false);

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
              disabled={cartItems.length === 0 || isBillFinalized}
              aria-label="Finalize Bill and Proceed to Payment"
            >
              <CheckCircle className="mr-2 h-5 w-5" /> Finalize Bill
            </Button>
          </div>
        </Card>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column: Product Input and Item List */}
        <section className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
          {!isBillFinalized && (
            <ProductInputForm onAddItem={handleAddItem} />
          )}
          {isBillFinalized && cartItems.length > 0 && (
             <Card className="p-6 text-center bg-green-50 border-green-200 shadow-md">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <h2 className="text-xl font-semibold text-green-700 font-headline">Bill Finalized</h2>
              <p className="text-green-600">Proceed to payment or review summary.</p>
            </Card>
          )}
          <ItemList items={cartItems} onRemoveItem={handleRemoveItem} onUpdateQuantity={handleUpdateQuantity} />
        </section>

        {/* Right Column: Totals, Adjustments, Suggestions */}
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
