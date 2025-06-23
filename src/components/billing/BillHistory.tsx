
"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { History, Trash2, Receipt } from 'lucide-react';
import type { BillRecord } from '@/types/billing';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BillHistoryProps {
  history: BillRecord[];
  onClearHistory: () => void;
}

export function BillHistory({ history, onClearHistory }: BillHistoryProps) {
  if (history.length === 0) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center text-xl font-headline">
                <History className="mr-2 h-6 w-6 text-primary" /> Bill History
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">No past bills found.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-xl font-headline">
          <History className="mr-2 h-6 w-6 text-primary" /> Bill History
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onClearHistory} aria-label="Clear all bill history">
          <Trash2 className="mr-2 h-4 w-4" /> Clear All
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[250px] px-6">
            <Accordion type="single" collapsible className="w-full">
            {history.map((bill) => (
                <AccordionItem value={bill.id} key={bill.id}>
                <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4">
                        <span>{new Date(bill.date).toLocaleString()}</span>
                        <span className="font-semibold">{bill.currencySymbol}{bill.grandTotal.toFixed(2)}</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-4">
                    <h4 className="font-semibold">Items:</h4>
                    <ul className="space-y-1 text-sm list-disc pl-5">
                        {bill.items.map((item) => (
                        <li key={item.id}>
                            {item.quantity} x {item.name} ({bill.currencySymbol}{item.price.toFixed(2)} each)
                        </li>
                        ))}
                    </ul>
                    {bill.billImageDataUri ? (
                        <div className="text-center">
                            <Image
                                src={bill.billImageDataUri}
                                alt={`Bill from ${new Date(bill.date).toLocaleString()}`}
                                width={200}
                                height={300}
                                className="rounded-md border shadow-sm mx-auto"
                                data-ai-hint="receipt bill"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center p-4 rounded-md bg-muted text-muted-foreground">
                           <Receipt className="mr-2 h-4 w-4" /> No bill image was saved.
                        </div>
                    )}
                    </div>
                </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
        </ScrollArea>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground p-4 border-t">
        <p>Showing last {history.length > 50 ? '50+' : history.length} bill(s).</p>
      </CardFooter>
    </Card>
  );
}
