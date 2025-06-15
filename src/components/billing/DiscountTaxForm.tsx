"use client";

import React from 'react';
import { useForm, Controller }
from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Percent, Tag, Settings2 } from 'lucide-react';

const DiscountTaxSchema = z.object({
  discountPercentage: z.number().min(0, "Min 0%").max(100, "Max 100%").optional(),
  taxPercentage: z.number().min(0, "Min 0%").max(100, "Max 100%").optional(),
});

type DiscountTaxFormValues = z.infer<typeof DiscountTaxSchema>;

interface DiscountTaxFormProps {
  onApplyDiscount: (percentage: number) => void;
  onApplyTax: (percentage: number) => void;
  currentDiscount: number;
  currentTax: number;
}

export function DiscountTaxForm({ onApplyDiscount, onApplyTax, currentDiscount, currentTax }: DiscountTaxFormProps) {
  const { control, handleSubmit, setValue } = useForm<DiscountTaxFormValues>({
    resolver: zodResolver(DiscountTaxSchema),
    defaultValues: {
      discountPercentage: currentDiscount,
      taxPercentage: currentTax,
    },
  });

  React.useEffect(() => {
    setValue('discountPercentage', currentDiscount);
    setValue('taxPercentage', currentTax);
  }, [currentDiscount, currentTax, setValue]);


  const onSubmit = (data: DiscountTaxFormValues) => {
    if (data.discountPercentage !== undefined) {
      onApplyDiscount(data.discountPercentage);
    }
    if (data.taxPercentage !== undefined) {
      onApplyTax(data.taxPercentage);
    }
  };
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline">
          <Settings2 className="mr-2 h-6 w-6 text-primary" /> Adjustments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="discountPercentage" className="font-medium flex items-center">
              <Tag className="mr-2 h-4 w-4 text-accent" /> Discount (%)
            </Label>
            <Controller
              name="discountPercentage"
              control={control}
              render={({ field }) => (
                <Input 
                  id="discountPercentage" 
                  type="number" 
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                  placeholder="e.g. 10 for 10%" 
                  min="0" max="100"
                  aria-label="Discount Percentage"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxPercentage" className="font-medium flex items-center">
              <Percent className="mr-2 h-4 w-4 text-accent" /> Tax (%)
            </Label>
            <Controller
              name="taxPercentage"
              control={control}
              render={({ field }) => (
                <Input 
                  id="taxPercentage" 
                  type="number" 
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                  placeholder="e.g. 5 for 5%" 
                  min="0" max="100"
                  aria-label="Tax Percentage"
                />
              )}
            />
          </div>
          <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" aria-label="Apply adjustments">
            Apply Adjustments
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
