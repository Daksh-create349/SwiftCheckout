
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package } from 'lucide-react';
import type { AnalyzeSalesOutput } from '@/types/billing';

interface TopProductsChartProps {
  data: AnalyzeSalesOutput['topSellingProducts'];
  currencySymbol: string;
}

export default function TopProductsChart({ data, currencySymbol }: TopProductsChartProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-headline">
          <Package className="mr-2 h-6 w-6 text-primary" /> Top Selling Products by Revenue
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[350px] w-full">
         <ResponsiveContainer width="100%" height="100%">
          {data.length > 0 ? (
            <BarChart 
                data={data} 
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${currencySymbol}${value}`}
              />
              <YAxis 
                type="category" 
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip
                cursor={{ fill: 'hsla(var(--muted), 0.5)' }}
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                }}
              />
              <Legend />
              <Bar 
                dataKey="revenueGenerated" 
                name="Revenue" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]} 
            />
            </BarChart>
          ) : (
             <div className="flex items-center justify-center h-full text-muted-foreground">
               <p>No product sales data to display.</p>
             </div>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
