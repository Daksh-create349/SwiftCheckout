"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Smartphone, CircleDollarSign, X } from 'lucide-react'; // Updated DollarSign to CircleDollarSign

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSelect: (method: string) => void;
  grandTotal: number;
}

const paymentOptions = [
  { name: 'Credit Card', icon: CreditCard, id: 'credit_card' },
  { name: 'Mobile Payment', icon: Smartphone, id: 'mobile_payment' },
  { name: 'Cash', icon: CircleDollarSign, id: 'cash' },
];

export function PaymentModal({ isOpen, onClose, onPaymentSelect, grandTotal }: PaymentModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-center text-primary">Complete Payment</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Total amount due: <span className="font-bold text-foreground">${grandTotal.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6">
          {paymentOptions.map((option) => (
            <Button
              key={option.id}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center space-y-2 text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 ease-in-out transform hover:scale-105"
              onClick={() => onPaymentSelect(option.id)}
              aria-label={`Pay with ${option.name}`}
            >
              <option.icon className="h-8 w-8" />
              <span className="text-sm font-medium">{option.name}</span>
            </Button>
          ))}
        </div>

        <DialogFooter className="sm:justify-center">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:bg-muted" aria-label="Cancel payment">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
