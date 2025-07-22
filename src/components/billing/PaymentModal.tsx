
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Smartphone, CircleDollarSign, X, ArrowLeft, ShieldCheck, MessageSquareWarning, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSelect: (method: string) => void;
  grandTotal: number;
  currencySymbol: string;
}

const paymentOptions = [
  { name: 'Credit Card', icon: CreditCard, id: 'credit_card' },
  { name: 'Mobile Payment', icon: Smartphone, id: 'mobile_payment' },
  { name: 'Cash', icon: CircleDollarSign, id: 'cash' },
];

const CreditCardSchema = z.object({
    cardNumber: z.string()
      .min(16, "Card number must be 16 digits.")
      .max(16, "Card number must be 16 digits.")
      .regex(/^\d{16}$/, "Card number must be 16 digits."),
    cardName: z.string().min(2, "Cardholder name is required."),
    expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, "Invalid format. Use MM/YY."),
    cvc: z.string()
        .min(3, "CVC must be 3 or 4 digits.")
        .max(4, "CVC must be 3 or 4 digits.")
        .regex(/^\d{3,4}$/, "Invalid CVC."),
});
type CreditCardFormValues = z.infer<typeof CreditCardSchema>;

type PaymentStep = 'selectMethod' | 'enterMobile' | 'enterOtp' | 'enterCreditCard';

export function PaymentModal({ isOpen, onClose, onPaymentSelect, grandTotal, currencySymbol }: PaymentModalProps) {
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('selectMethod');
  const [mobileNumber, setMobileNumber] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, reset: resetCardForm } = useForm<CreditCardFormValues>({
    resolver: zodResolver(CreditCardSchema),
  });

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens or re-opens
      setPaymentStep('selectMethod');
      setMobileNumber('');
      setEnteredOtp('');
      setSimulatedOtp('');
      setErrorMessage(null);
      resetCardForm();
    }
  }, [isOpen, resetCardForm]);

  const handlePaymentOptionClick = (optionId: string) => {
    if (optionId === 'mobile_payment') {
      setPaymentStep('enterMobile');
      setErrorMessage(null);
    } else if (optionId === 'credit_card') {
      setPaymentStep('enterCreditCard');
      setErrorMessage(null);
    } else {
      onPaymentSelect(optionId);
    }
  };

  const handleSendOtp = () => {
    setErrorMessage(null);
    if (!/^\d{10}$/.test(mobileNumber)) { // Basic 10-digit validation
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4-digit OTP
    setSimulatedOtp(otp);
    setEnteredOtp(''); // Clear previous OTP entry on resend
    toast({
      title: "OTP Sent (Simulation)",
      description: `For testing, your OTP is: ${otp}`,
      duration: 10000, // Keep it visible longer for testing
    });
    if (paymentStep !== 'enterOtp') { // Only transition if not already on OTP screen (i.e., initial send)
        setPaymentStep('enterOtp');
    }
  };

  const handleVerifyOtp = () => {
    setErrorMessage(null);
    if (enteredOtp === simulatedOtp) {
      onPaymentSelect('mobile_payment');
    } else {
      setErrorMessage("Invalid OTP. Please try again or resend.");
    }
  };

  const handleCreditCardSubmit = (data: CreditCardFormValues) => {
    console.log("Credit Card Details (Simulated):", data);
    onPaymentSelect('credit_card');
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (paymentStep === 'enterOtp') {
      setPaymentStep('enterMobile');
      setEnteredOtp('');
    } else if (paymentStep === 'enterMobile' || paymentStep === 'enterCreditCard') {
      setPaymentStep('selectMethod');
      setMobileNumber('');
      resetCardForm();
    }
  };


  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-center text-primary">
            {paymentStep === 'selectMethod' && 'Complete Payment'}
            {paymentStep === 'enterMobile' && 'Mobile Payment'}
            {paymentStep === 'enterOtp' && 'Verify OTP'}
            {paymentStep === 'enterCreditCard' && 'Enter Card Details'}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Total amount due: <span className="font-bold text-foreground">{currencySymbol}{grandTotal.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive" className="my-4">
            <MessageSquareWarning className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {paymentStep === 'selectMethod' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6">
            {paymentOptions.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2 text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 ease-in-out transform hover:scale-105"
                onClick={() => handlePaymentOptionClick(option.id)}
                aria-label={`Pay with ${option.name}`}
              >
                <option.icon className="h-8 w-8" />
                <span className="text-sm font-medium">{option.name}</span>
              </Button>
            ))}
          </div>
        )}

        {paymentStep === 'enterMobile' && (
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="mobileNumber" className="font-medium">Enter Mobile Number</Label>
              <Input
                id="mobileNumber"
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="e.g., 1234567890"
                className="text-base"
                maxLength={10}
              />
            </div>
            <Button onClick={handleSendOtp} className="w-full bg-primary hover:bg-primary/90">
              Send OTP
            </Button>
          </div>
        )}

        {paymentStep === 'enterOtp' && (
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="otp" className="font-medium">Enter OTP</Label>
              <Input
                id="otp"
                type="text" 
                inputMode="numeric" 
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                placeholder="4-digit OTP"
                className="text-base tracking-widest text-center"
                maxLength={4}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleVerifyOtp} className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <ShieldCheck className="mr-2 h-5 w-5" /> Verify & Pay
                </Button>
                <Button variant="outline" onClick={handleSendOtp} className="w-full sm:w-auto">
                    <RefreshCw className="mr-2 h-4 w-4" /> Resend OTP
                </Button>
            </div>
          </div>
        )}

        {paymentStep === 'enterCreditCard' && (
          <form onSubmit={handleSubmit(handleCreditCardSubmit)} className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input id="cardNumber" {...register("cardNumber")} placeholder="0000 0000 0000 0000" maxLength={16} />
              {errors.cardNumber && <p className="text-sm text-destructive">{errors.cardNumber.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="cardName">Cardholder Name</Label>
              <Input id="cardName" {...register("cardName")} placeholder="John Doe" />
              {errors.cardName && <p className="text-sm text-destructive">{errors.cardName.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input id="expiryDate" {...register("expiryDate")} placeholder="MM/YY" />
                {errors.expiryDate && <p className="text-sm text-destructive">{errors.expiryDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input id="cvc" {...register("cvc")} placeholder="123" maxLength={4} />
                {errors.cvc && <p className="text-sm text-destructive">{errors.cvc.message}</p>}
              </div>
            </div>
             <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">
                <ShieldCheck className="mr-2 h-5 w-5" /> Pay {currencySymbol}{grandTotal.toFixed(2)}
            </Button>
          </form>
        )}

        <DialogFooter className="sm:justify-center">
          {paymentStep !== 'selectMethod' && (
            <Button variant="outline" onClick={handleBack} className="absolute left-4 bottom-4 sm:left-6 sm:bottom-6 text-muted-foreground hover:bg-muted" aria-label="Go back">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:bg-muted" aria-label="Cancel payment">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
