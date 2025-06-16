
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import type { CartItem, Currency } from '@/types/billing';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY_CODE, getCurrencySymbol } from '@/types/billing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getCrossSellSuggestions, type CrossSellSuggestionInput } from '@/ai/flows/cross-sell-suggestion';
import { generateBillImage, type GenerateBillImageInput } from '@/ai/flows/generate-bill-image-flow';
import { Zap, AlertTriangle, CheckCircle, Printer, Loader2, CreditCard, Download, Settings, Move3d } from 'lucide-react';

const SCROLL_THROTTLE_MS = 100;
const TILT_THRESHOLD_VERTICAL = 15; // Degrees
const SCROLL_SENSITIVITY_VERTICAL = 2; // Pixels per degree over threshold

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
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(DEFAULT_CURRENCY_CODE);
  const [isSensorScrollingEnabled, setIsSensorScrollingEnabled] = useState<boolean>(false);
  const [sensorError, setSensorError] = useState<string | null>(null);


  const { toast } = useToast();
  const billImageRef = useRef<HTMLImageElement>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const permissionRequestedRef = useRef(false);


  const selectedCurrencySymbol = getCurrencySymbol(selectedCurrencyCode);

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
    setBillImageDataUri(null);

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
        currencySymbol: selectedCurrencySymbol,
      };
      const result = await generateBillImage(billImageInput);
      setBillImageDataUri(result.billImageDataUri);
      toast({ title: "Bill Image Generated", description: "The bill image is ready.", className: "bg-green-500 text-white" });
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
  };

  const handleProceedToPayment = () => {
    if (cartItems.length === 0) {
        toast({ variant: "destructive", title: "Empty Bill", description: "Cannot proceed to payment with an empty bill." });
        return;
    }
    if (!isBillFinalized) {
        toast({ variant: "destructive", title: "Bill Not Finalized", description: "Please finalize the bill first." });
        return;
    }
    setIsPaymentModalOpen(true);
  };

 const handlePrintBill = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && billImageDataUri) {
      printWindow.document.write(
        '<html>' +
          '<head><title>Print Bill</title></head>' +
          '<body style="margin:0; padding:0; display:flex; justify-content:center; align-items:center; min-height:100vh;">' +
            '<img src="' + billImageDataUri + '" style="max-width:100%; max-height:100vh; object-fit:contain;" onload="window.print(); setTimeout(window.close, 100);" />' +
          '</body>' +
        '</html>'
      );
      printWindow.document.close();
    } else {
      toast({ variant: "destructive", title: "Print Error", description: "Could not open print window or no bill image found." });
    }
  };

  const handlePaymentSelect = (method: string) => {
    const currentBillImage = billImageDataUri;
    const paidGrandTotal = grandTotal;

    setIsPaymentModalOpen(false);
    setCartItems([]);
    setDiscountPercentage(0);
    setTaxPercentage(0);
    setCrossSellSuggestions([]);
    setIsBillFinalized(false);
    setBillImageDataUri(null);

    toast({
      title: "Payment Processed",
      description: `Payment of ${selectedCurrencySymbol}${paidGrandTotal.toFixed(2)} via ${method.replace('_', ' ')} successful. New bill started.`,
      className: "bg-primary text-primary-foreground",
      duration: 7000,
      action: currentBillImage ? (
        <ToastAction
          altText="Download Bill"
          onClick={() => {
            const link = document.createElement('a');
            link.href = currentBillImage;
            link.download = `SwiftCheckout-Bill-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Download className="mr-2 h-4 w-4" /> Download Bill
        </ToastAction>
      ) : undefined,
    });
  };

  const handleCurrencyChange = (value: string) => {
    if (cartItems.length > 0) {
        toast({
            variant: "destructive",
            title: "Cannot Change Currency",
            description: "Please clear the current bill before changing currency to avoid pricing inconsistencies.",
        });
        return;
    }
    setSelectedCurrencyCode(value);
    toast({
        title: "Currency Updated",
        description: `Currency changed to ${value} (${getCurrencySymbol(value)}). AI price estimates will now be in ${value}.`,
    });
  };

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (!isSensorScrollingEnabled) return;

    const now = Date.now();
    if (now - lastScrollTimeRef.current < SCROLL_THROTTLE_MS) {
      return;
    }
    lastScrollTimeRef.current = now;

    const beta = event.beta; 

    if (beta === null) { 
        return;
    }

    if (Math.abs(beta) > TILT_THRESHOLD_VERTICAL) {
      let scrollAmount = (Math.abs(beta) - TILT_THRESHOLD_VERTICAL) * SCROLL_SENSITIVITY_VERTICAL;
      if (beta < 0) { 
        scrollAmount = -scrollAmount; 
      }
      window.scrollBy(0, scrollAmount);
    }
  }, [isSensorScrollingEnabled]); 

  const requestAndAddListener = useCallback(async () => {
    setSensorError(null); 

    if (typeof window.DeviceOrientationEvent === 'undefined') {
      const errorMsg = "Device orientation sensors are not supported by this browser.";
      setSensorError(errorMsg);
      toast({ variant: "destructive", title: "Sensor Error", description: errorMsg });
      setIsSensorScrollingEnabled(false); 
      return;
    }
    
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') { // Primarily for iOS Safari
      if (!permissionRequestedRef.current) { // Only request if not already attempted in this "on" cycle
        try {
          const permissionState = await (DeviceOrientationEvent as any).requestPermission();
          permissionRequestedRef.current = true; // Mark that a permission attempt has been made
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
            toast({ title: "Sensor Scrolling Enabled", description: "Tilt your device to scroll." });
          } else {
            const errorMsg = "Permission for device orientation not granted.";
            setSensorError(errorMsg);
            toast({ variant: "destructive", title: "Sensor Permission Denied", description: errorMsg });
            setIsSensorScrollingEnabled(false); // Turn the switch off if permission is explicitly denied
          }
        } catch (error) {
          console.error("Error requesting device orientation permission:", error);
          const errorMsg = "Failed to request device orientation permission. It might be blocked by your browser or OS settings.";
          setSensorError(errorMsg);
          toast({ variant: "destructive", title: "Sensor Request Error", description: errorMsg });
          setIsSensorScrollingEnabled(false); // Turn the switch off on error
        }
      } else {
        // If permissionRequestedRef.current is true, it means a request was made in this "on" cycle.
        // We assume if it wasn't denied (which would've returned/set error), it was granted.
        // This handles cases where the effect might re-run but permission is already sorted for this "session".
         window.addEventListener('deviceorientation', handleOrientation);
         toast({ title: "Sensor Scrolling Re-enabled", description: "Tilt your device to scroll." });
      }
    } else {
      // For other browsers (Desktop, Android Chrome, etc.) that don't use requestPermission()
      window.addEventListener('deviceorientation', handleOrientation);
      toast({ 
        title: "Sensor Scrolling Enabled", 
        description: "Attempting to use device sensors. If tilting does not work, your device/browser may lack support or permissions might be blocking access." 
      });
    }
  }, [handleOrientation, toast, setIsSensorScrollingEnabled]); 


  useEffect(() => {
    if (isSensorScrollingEnabled) {
      requestAndAddListener();
    } else {
      window.removeEventListener('deviceorientation', handleOrientation);
      setSensorError(null); // Clear error when user manually disables or it's disabled programmatically.
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isSensorScrollingEnabled, requestAndAddListener, handleOrientation]);


  const handleToggleSensorScrolling = (checked: boolean) => {
    setIsSensorScrollingEnabled(checked);
    if (checked) {
      permissionRequestedRef.current = false; // Reset for a fresh permission request attempt if needed
      setSensorError(null); 
    } else {
      // SensorError is cleared by the useEffect when isSensorScrollingEnabled becomes false
    }
  };


  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 lg:p-8 bg-background font-body">
      <header className="mb-6 md:mb-8">
        <Card className="shadow-md">
          <div className="p-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center">
              <Zap className="h-10 w-10 text-primary animate-pulse" />
              <h1 className="ml-3 text-3xl md:text-4xl font-bold font-headline text-primary">SwiftCheckout</h1>
            </div>
            <div className="flex items-center space-x-2 flex-wrap">
                <div className="flex items-center space-x-2">
                    <Move3d className={`h-5 w-5 ${isSensorScrollingEnabled && !sensorError ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Label htmlFor="sensor-scrolling-switch" className="text-sm text-muted-foreground whitespace-nowrap">
                        Sensor Scroll
                    </Label>
                    <Switch
                        id="sensor-scrolling-switch"
                        checked={isSensorScrollingEnabled}
                        onCheckedChange={handleToggleSensorScrolling}
                        disabled={!!sensorError && isSensorScrollingEnabled} // Disable if errored while enabled
                        aria-label="Toggle sensor-based scrolling"
                    />
                </div>
                 <Select value={selectedCurrencyCode} onValueChange={handleCurrencyChange}>
                    <SelectTrigger className="w-[120px] bg-card hover:bg-muted/50 transition-colors">
                        <Settings className="h-4 w-4 mr-1 text-muted-foreground" />
                        <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                        {SUPPORTED_CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} ({currency.symbol})
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="default"
                    className="bg-accent hover:bg-accent/80 text-accent-foreground"
                    onClick={handleFinalizeBill}
                    disabled={cartItems.length === 0 || isBillFinalized || isGeneratingBillImage}
                    aria-label="Finalize Bill"
                >
                    {isGeneratingBillImage && !isBillFinalized ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <CheckCircle className="mr-2 h-5 w-5" />
                    )}
                    {isGeneratingBillImage && !isBillFinalized ? "Generating..." : "Finalize Bill"}
                </Button>
            </div>
          </div>
        </Card>
          {sensorError && ( 
             <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Sensor Scrolling Error</AlertTitle>
                <AlertDescription>{sensorError}</AlertDescription>
            </Alert>
        )}
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <section className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
          {!isBillFinalized && (
            <ProductInputForm
                onAddItem={handleAddItem}
                selectedCurrencyCode={selectedCurrencyCode}
                selectedCurrencySymbol={selectedCurrencySymbol}
            />
          )}
          {isBillFinalized && cartItems.length > 0 && (
             <Card className="p-6 text-center bg-card border-border shadow-md">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <h2 className="text-xl font-semibold text-green-700 font-headline">Bill Finalized</h2>

              {isGeneratingBillImage && (
                <div className="my-4">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground mt-2">Generating bill image...</p>
                </div>
              )}

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
              {!isGeneratingBillImage && !billImageDataUri && cartItems.length > 0 && (
                <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Image Generation Failed</AlertTitle>
                    <AlertDescription>
                        Could not generate bill image. You can still proceed to payment.
                    </AlertDescription>
                </Alert>
              )}

              {!isGeneratingBillImage && cartItems.length > 0 && (
                <Button
                    onClick={handleProceedToPayment}
                    className="mt-6 bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                >
                    <CreditCard className="mr-2 h-5 w-5" /> Proceed to Payment
                </Button>
              )}
            </Card>
          )}
          <ItemList
            items={cartItems}
            onRemoveItem={handleRemoveItem}
            onUpdateQuantity={handleUpdateQuantity}
            currencySymbol={selectedCurrencySymbol}
          />
        </section>

        <section className="lg:col-span-1 flex flex-col gap-6 md:gap-8">
          <TotalsDisplay
            subtotal={subtotal}
            discountAmount={discountAmount}
            taxAmount={taxAmount}
            grandTotal={grandTotal}
            currencySymbol={selectedCurrencySymbol}
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
        currencySymbol={selectedCurrencySymbol}
      />

      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SwiftCheckout. Efficiency at your fingertips.</p>
      </footer>
    </div>
  );
}

