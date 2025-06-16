
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ListChecks, TrendingUp, PackageMinus, PackagePlus } from 'lucide-react';

interface TotalsDisplayProps {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  currencySymbol: string;
}

export function TotalsDisplay({ subtotal, discountAmount, taxAmount, grandTotal, currencySymbol }: TotalsDisplayProps) {
  return (
    <Card className="shadow-lg sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline">
          <ListChecks className="mr-2 h-6 w-6 text-primary" /> Bill Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{currencySymbol}{subtotal.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center"><PackageMinus className="mr-1 h-4 w-4 text-destructive" /> Discount Applied</span>
          <span className="font-medium text-destructive">-{currencySymbol}{discountAmount.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center"><PackagePlus className="mr-1 h-4 w-4 text-green-600"/> Taxes</span>
          <span className="font-medium">{currencySymbol}{taxAmount.toFixed(2)}</span>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 p-4 rounded-b-lg">
        <div className="flex justify-between items-center w-full">
          <span className="text-lg font-semibold text-foreground flex items-center font-headline">
            <TrendingUp className="mr-2 h-5 w-5 text-primary"/> Grand Total
          </span>
          <span className="text-2xl font-bold text-primary">{currencySymbol}{grandTotal.toFixed(2)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
