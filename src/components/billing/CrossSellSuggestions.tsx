"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, AlertCircle } from 'lucide-react';

interface CrossSellSuggestionsProps {
  suggestions: string[];
  isLoading: boolean;
  error?: string | null;
}

export function CrossSellSuggestions({ suggestions, isLoading, error }: CrossSellSuggestionsProps) {
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
          <ul className="space-y-2 list-disc list-inside text-sm">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="animate-fade-in" style={{animationDelay: `${index * 100}ms`}}>
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
