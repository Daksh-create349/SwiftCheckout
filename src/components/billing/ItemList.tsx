
"use client";

import React from 'react';
import type { CartItem } from '@/types/billing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react'; // Removed Edit3
import { Input } from '../ui/input';

interface ItemListProps {
  items: CartItem[];
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  currencySymbol: string;
  disabled?: boolean;
}

export function ItemList({ items, onRemoveItem, onUpdateQuantity, currencySymbol, disabled = false }: ItemListProps) {

  const handleQuantityChange = (itemId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity >= 1) {
      onUpdateQuantity(itemId, newQuantity);
    } else if (newQuantity === 0) {
      onRemoveItem(itemId);
    }
  };

  const handleManualQuantityInput = (itemId: string, value: string) => {
    const newQuantity = parseInt(value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 1) {
      onUpdateQuantity(itemId, newQuantity);
    } else if (!isNaN(newQuantity) && newQuantity <= 0) {
       onRemoveItem(itemId);
    }
  };


  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline">
          <ShoppingCart className="mr-2 h-6 w-6 text-primary" /> Current Bill
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-[calc(100%-0px)] sm:h-[300px] md:h-[400px] lg:h-[calc(100vh-450px)] min-h-[200px]">
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-full p-6">
              <p className="text-muted-foreground">Scan products using the camera to add them.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Item</TableHead>
                  <TableHead className="text-center w-[25%]">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="animate-fade-in">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          disabled={disabled}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity.toString()}
                          onChange={(e) => handleManualQuantityInput(item.id, e.target.value)}
                          className="w-12 h-8 text-center appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min="1"
                          aria-label={`Quantity of ${item.name}`}
                          disabled={disabled}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          disabled={disabled}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{currencySymbol}{item.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/80 h-8 w-8"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Remove ${item.name} from bill`}
                        disabled={disabled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
      {items.length > 0 && (
        <CardFooter className="p-4 border-t">
          <p className="text-sm text-muted-foreground">Total items: {items.reduce((sum, item) => sum + item.quantity, 0)}</p>
        </CardFooter>
      )}
    </Card>
  );
}
