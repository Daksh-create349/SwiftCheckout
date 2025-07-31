
"use client";

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, LineChart, BarChart, Bot, Sigma, Receipt, AlertTriangle, Loader2 } from 'lucide-react';
import type { BillRecord, AnalyzeSalesInput, AnalyzeSalesOutput } from '@/types/billing';
import { getCurrencyCode } from '@/types/billing';
import { analyzeSales } from '@/ai/flows/analyze-sales-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AiSummary from '@/components/dashboard/AiSummary';
import SalesSummary from '@/components/dashboard/SalesSummary';
import RevenueChart from '@/components/dashboard/RevenueChart';
import TopProductsChart from '@/components/dashboard/TopProductsChart';


export default function DashboardPage() {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<AnalyzeSalesOutput | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [currencySymbol, setCurrencySymbol] = useState<string>('$');

    useEffect(() => {
        const fetchAndAnalyzeData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const storedHistory = localStorage.getItem('swiftCheckoutHistory');
                const billHistory: BillRecord[] = storedHistory ? JSON.parse(storedHistory) : [];

                if (billHistory.length === 0) {
                    setAnalysisResult({
                        metrics: { totalRevenue: 0, totalBills: 0, averageBillValue: 0 },
                        topSellingProducts: [],
                        dailySales: [],
                        aiSummary: "No sales data found. Start a new bill on the main page to see your analytics."
                    });
                    return;
                }

                // Determine currency from the first bill, default to '$'
                const primaryCurrencySymbol = billHistory[0]?.currencySymbol || '$';
                setCurrencySymbol(primaryCurrencySymbol);
                const currencyCode = getCurrencyCode(primaryCurrencySymbol);

                const input: AnalyzeSalesInput = { billHistory, currencyCode };
                const result = await analyzeSales(input);
                setAnalysisResult(result);
                 toast({ title: "Analysis Complete", description: "Your sales dashboard is ready." });
            } catch (err) {
                 const errorMessage = (err as Error).message || "An unknown error occurred during analysis.";
                 console.error("Error analyzing sales data:", err);
                 setError(errorMessage);
                 toast({ variant: "destructive", title: "Analysis Failed", description: errorMessage });
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndAnalyzeData();
    }, [toast]);


    return (
        <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
            <header className="mb-6 md:mb-8 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center">
                    <LineChart className="h-10 w-10 text-primary" />
                    <h1 className="ml-3 text-3xl md:text-4xl font-bold font-headline text-primary">
                        Sales Dashboard
                    </h1>
                </div>
                <Button asChild variant="outline">
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Billing
                    </Link>
                </Button>
            </header>

            {isLoading && (
                <div className="flex flex-col items-center justify-center text-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Analyzing your sales data with AI...</p>
                </div>
            )}

            {error && !isLoading && (
                 <Alert variant="destructive" className="max-w-3xl mx-auto">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Dashboard Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!isLoading && !error && analysisResult && (
                <div className="space-y-6 md:space-y-8 animate-fade-in">
                    <SalesSummary metrics={analysisResult.metrics} currencySymbol={currencySymbol} />
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
                        <div className="lg:col-span-3">
                            <RevenueChart data={analysisResult.dailySales} currencySymbol={currencySymbol} />
                        </div>
                        <div className="lg:col-span-2">
                             <AiSummary summary={analysisResult.aiSummary} />
                        </div>
                    </div>
                    <TopProductsChart data={analysisResult.topSellingProducts} currencySymbol={currencySymbol} />
                </div>
            )}

             <footer className="mt-12 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} SwiftCheckout Dashboard</p>
            </footer>
        </div>
    );
}
