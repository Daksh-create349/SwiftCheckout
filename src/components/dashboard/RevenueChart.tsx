
"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { DailySales } from '@/ai/flows/analyze-sales-flow';
import { format, parseISO } from 'date-fns';

interface RevenueChartProps {
  data: DailySales[];
  currencySymbol: string;
}

export default function RevenueChart({ data, currencySymbol }: RevenueChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    // Format date for display on the X-axis
    formattedDate: format(parseISO(item.date), 'MMM d'),
  }));

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline">
          <TrendingUp className="mr-2 h-6 w-6 text-primary" /> Revenue Over Time
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] w-full">
         <ResponsiveContainer width="100%" height="100%">
           {data.length > 0 ? (
            <LineChart
                data={formattedData}
                margin={{
                top: 5,
                right: 20,
                left: 0,
                bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                    dataKey="formattedDate" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${currencySymbol}${value}`}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Legend />
                <Line 
                    type="monotone" 
                    dataKey="totalRevenue" 
                    name="Revenue"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 8, fill: 'hsl(var(--primary))' }}
                />
            </LineChart>
           ) : (
             <div className="flex items-center justify-center h-full text-muted-foreground">
               <p>No daily sales data to display.</p>
             </div>
           )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
