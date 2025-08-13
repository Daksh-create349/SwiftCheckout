
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Percent, Tag, Settings2 } from 'lucide-react';

interface DiscountTaxFormProps {
  onApplyDiscount: (percentage: number) => void;
  onApplyTax: (percentage: number) => void;
  currentDiscount: number;
  currentTax: number;
  disabled?: boolean;
}

export function DiscountTaxForm({ onApplyDiscount, onApplyTax, currentDiscount, currentTax, disabled = false }: DiscountTaxFormProps) {

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const percentage = parseFloat(value);
    onApplyDiscount(isNaN(percentage) || percentage < 0 ? 0 : percentage);
  };
  
  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const percentage = parseFloat(value);
    onApplyTax(isNaN(percentage) || percentage < 0 ? 0 : percentage);
  };
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline">
          <Settings2 className="mr-2 h-6 w-6 text-primary" /> Adjustments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="discountPercentage" className="font-medium flex items-center">
              <Tag className="mr-2 h-4 w-4 text-accent" /> Discount (%)
            </Label>
            <Input 
              id="discountPercentage" 
              type="number"
              value={currentDiscount.toString()}
              onChange={handleDiscountChange}
              onFocus={(e) => e.target.select()}
              placeholder="e.g. 10" 
              min="0" max="100"
              aria-label="Discount Percentage"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxPercentage" className="font-medium flex items-center">
              <Percent className="mr-2 h-4 w-4 text-accent" /> Tax (%)
            </Label>
            <Input 
              id="taxPercentage" 
              type="number"
              value={currentTax.toString()}
              onChange={handleTaxChange}
              onFocus={(e) => e.target.select()}
              placeholder="e.g. 5" 
              min="0" max="100"
              aria-label="Tax Percentage"
              disabled={disabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
