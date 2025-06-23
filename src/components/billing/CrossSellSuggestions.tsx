
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, AlertCircle, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { CartItem } from '@/types/billing';

interface CrossSellSuggestionsProps {
  suggestions: string[];
  isLoading: boolean;
  error?: string | null;
  onAddSuggestion: (productName: string) => Promise<void>;
  cartItems: CartItem[];
}

export function CrossSellSuggestions({ suggestions, isLoading, error, onAddSuggestion, cartItems }: CrossSellSuggestionsProps) {
  const [isAdding, setIsAdding] = useState<string | null>(null);

  const handleCheckChange = async (productName: string) => {
      setIsAdding(productName);
      try {
        await onAddSuggestion(productName);
      } finally {
        setIsAdding(null);
      }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline">
          <Lightbulb className="mr-2 h-6 w-6 text-primary" /> You Might Also Like
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        )}
        {error && !isLoading && (
           <div className="flex items-center text-destructive">
            <AlertCircle className="mr-2 h-5 w-5" />
            <p>Could not load suggestions: {error}</p>
          </div>
        )}
        {!isLoading && !error && suggestions.length === 0 && (
          <p className="text-sm text-muted-foreground">Add items to see suggestions.</p>
        )}
        {!isLoading && !error && suggestions.length > 0 && (
          <ul className="space-y-3">
            {suggestions.map((suggestion, index) => {
              const isInCart = cartItems.some(item => item.name.toLowerCase() === suggestion.toLowerCase());
              const currentlyAdding = isAdding === suggestion;
              const checkboxId = `suggestion-${index}`;

              return (
                <li key={index} className="flex items-center space-x-3 animate-fade-in" style={{animationDelay: `${index * 100}ms`}}>
                  <Checkbox
                    id={checkboxId}
                    checked={isInCart}
                    disabled={isInCart || currentlyAdding}
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        handleCheckChange(suggestion);
                      }
                    }}
                    aria-label={`Add ${suggestion} to cart`}
                  />
                   <Label htmlFor={checkboxId} className={`flex-1 text-sm ${isInCart ? 'text-muted-foreground line-through' : 'text-foreground'} cursor-pointer`}>
                    {suggestion}
                  </Label>
                  {currentlyAdding && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
