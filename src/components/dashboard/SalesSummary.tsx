
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sigma, Receipt, CircleDollarSign } from 'lucide-react';
import type { AnalyzeSalesOutput } from '@/types/billing';

interface SalesSummaryProps {
  metrics: AnalyzeSalesOutput['metrics'];
  currencySymbol: string;
}

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string, icon: React.ElementType }) => (
    <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);


export default function SalesSummary({ metrics, currencySymbol }: SalesSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
            title="Total Revenue"
            value={`${currencySymbol}${metrics.totalRevenue.toFixed(2)}`}
            icon={Sigma}
        />
        <StatCard 
            title="Total Bills"
            value={metrics.totalBills.toString()}
            icon={Receipt}
        />
        <StatCard 
            title="Average Bill Value"
            value={`${currencySymbol}${metrics.averageBillValue.toFixed(2)}`}
            icon={CircleDollarSign}
        />
    </div>
  );
}
