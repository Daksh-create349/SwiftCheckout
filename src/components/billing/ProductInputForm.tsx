"use client";

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Barcode, DollarSign, PlusCircle, XCircle } from 'lucide-react';
import type { Product } from '@/types/billing';
import { MOCK_PRODUCTS_MAP } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';

const FormSchema = z.object({
  productCode: z.string().min(1, "Product code is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  manualPrice: z.number().optional(),
  overridePrice: z.boolean().optional(),
});

type ProductInputFormValues = z.infer<typeof FormSchema>;

interface ProductInputFormProps {
  onAddItem: (product: Product, quantity: number, manualPrice?: number) => void;
}

export function ProductInputForm({ onAddItem }: ProductInputFormProps) {
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const { control, handleSubmit, watch, setValue, reset, setFocus, formState: { errors } } = useForm<ProductInputFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      productCode: '',
      quantity: 1,
      overridePrice: false,
    },
  });

  const productCode = watch('productCode');
  const overridePrice = watch('overridePrice');

  useEffect(() => {
    if (productCode) {
      const product = MOCK_PRODUCTS_MAP.get(productCode);
      if (product) {
        setFoundProduct(product);
        if (!overridePrice) {
          setValue('manualPrice', product.price);
        }
      } else {
        setFoundProduct(null);
         if (!overridePrice) {
          setValue('manualPrice', undefined);
        }
      }
    } else {
      setFoundProduct(null);
      if (!overridePrice) {
        setValue('manualPrice', undefined);
      }
    }
  }, [productCode, overridePrice, setValue]);
  
  useEffect(() => {
    if (foundProduct && !overridePrice) {
      setValue('manualPrice', foundProduct.price);
    }
  }, [foundProduct, overridePrice, setValue]);


  const onSubmit: SubmitHandler<ProductInputFormValues> = (data) => {
    if (foundProduct) {
      const priceToUse = data.overridePrice && data.manualPrice !== undefined ? data.manualPrice : foundProduct.price;
      onAddItem(foundProduct, data.quantity, priceToUse);
      reset();
      setFoundProduct(null);
      setFocus('productCode');
    } else {
      toast({
        variant: "destructive",
        title: "Product Not Found",
        description: "Please enter a valid product code.",
      });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline">
          <Barcode className="mr-2 h-6 w-6 text-primary" /> Add Product
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="productCode" className="font-medium">Product Code</Label>
            <Controller
              name="productCode"
              control={control}
              render={({ field }) => (
                <Input id="productCode" {...field} placeholder="Scan or type product code" aria-label="Product Code" />
              )}
            />
            {foundProduct && <p className="text-sm text-muted-foreground">Found: {foundProduct.name} - Price: ${foundProduct.price.toFixed(2)}</p>}
            {errors.productCode && <p className="text-sm text-destructive">{errors.productCode.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="font-medium">Quantity</Label>
               <Controller
                name="quantity"
                control={control}
                render={({ field }) => (
                  <Input 
                    id="quantity" 
                    type="number" 
                    {...field} 
                    onChange={e => field.onChange(parseInt(e.target.value,10) || 1)}
                    min="1"
                    aria-label="Quantity"
                  />
                )}
              />
              {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="manualPrice" className="font-medium">Price</Label>
              <Controller
                name="manualPrice"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      id="manualPrice" 
                      type="number" 
                      step="0.01" 
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                      disabled={!overridePrice && !foundProduct}
                      className="pl-8"
                      aria-label="Manual Price"
                    />
                  </div>
                )}
              />
               {errors.manualPrice && <p className="text-sm text-destructive">{errors.manualPrice.message}</p>}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Controller
              name="overridePrice"
              control={control}
              render={({ field }) => (
                 <Checkbox 
                  id="overridePrice" 
                  checked={field.value} 
                  onCheckedChange={field.onChange}
                  disabled={!foundProduct}
                  aria-labelledby="overridePriceLabel"
                />
              )}
            />
            <Label htmlFor="overridePrice" id="overridePriceLabel" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Override Price
            </Label>
          </div>

          <div className="flex justify-end space-x-3">
             <Button type="button" variant="outline" onClick={() => { reset(); setFoundProduct(null); }} aria-label="Clear form">
              <XCircle className="mr-2 h-4 w-4" /> Clear
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Add item to bill">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
