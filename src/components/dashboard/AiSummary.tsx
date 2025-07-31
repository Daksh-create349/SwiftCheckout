
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';

interface AiSummaryProps {
  summary: string;
}

export default function AiSummary({ summary }: AiSummaryProps) {
  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline">
          <Bot className="mr-2 h-6 w-6 text-primary" /> AI-Powered Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {summary}
        </p>
      </CardContent>
    </Card>
  );
}
