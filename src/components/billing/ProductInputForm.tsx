
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, XCircle, Camera, Zap, AlertTriangleIcon, ScanSearch } from 'lucide-react'; // Removed DollarSign
import { useToast } from '@/hooks/use-toast';
import { identifyProductFromImage, type IdentifyProductInput, type IdentifyProductOutput } from '@/ai/flows/identify-product-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

const FormSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
  manualPrice: z.number().optional(),
  overridePrice: z.boolean().optional(),
});

type ProductInputFormValues = z.infer<typeof FormSchema>;

interface ProductInputFormProps {
  onAddItem: (name: string, price: number, quantity: number, originalPrice: number) => void;
  selectedCurrencyCode: string;
  selectedCurrencySymbol: string;
}

export function ProductInputForm({ onAddItem, selectedCurrencyCode, selectedCurrencySymbol }: ProductInputFormProps) {
  const { toast } = useToast();
  const [identifiedProduct, setIdentifiedProduct] = useState<IdentifyProductOutput | null>(null);

  const { control, handleSubmit, watch, setValue, reset, setFocus, formState: { errors } } = useForm<ProductInputFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      quantity: 1,
      overridePrice: false,
      manualPrice: undefined,
    },
  });

  const overridePrice = watch('overridePrice');

  useEffect(() => {
    if (identifiedProduct && !overridePrice) {
      setValue('manualPrice', identifiedProduct.price);
    } else if (!identifiedProduct && !overridePrice) {
      setValue('manualPrice', undefined);
    }
  }, [identifiedProduct, overridePrice, setValue]);

  const [isCameraMode, setIsCameraMode] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const requestCameraPermission = useCallback(async () => {
    setCameraError(null);
    setHasCameraPermission(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera API is not supported by your browser.");
      setHasCameraPermission(false);
      toast({ variant: "destructive", title: "Camera Error", description: "Camera API not supported." });
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(mediaStream);
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
           if (videoRef.current) videoRef.current.play();
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      const errorName = (error as Error).name;
      let errorMsg = 'Could not access the camera.';
      if (errorName === 'NotAllowedError') errorMsg = 'Camera permission was denied. Please enable it in browser settings.';
      else if (errorName === 'NotFoundError') errorMsg = 'No camera found. Ensure a camera is connected.';
      else if (errorName === 'NotReadableError') errorMsg = 'Camera is in use by another app or hardware error.';

      setCameraError(errorMsg);
      setHasCameraPermission(false);
      toast({ variant: 'destructive', title: 'Camera Access Error', description: errorMsg });
    }
  }, [toast]);

  useEffect(() => {
    if (isCameraMode) {
      requestCameraPermission();
    } else {
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setHasCameraPermission(null);
      setCameraError(null);
    }
    return () => {
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraMode, requestCameraPermission]);


  const handleToggleCameraMode = () => {
    setIsCameraMode(prev => !prev);
    if (!isCameraMode) {
      setIdentifiedProduct(null);
      reset({ quantity: 1, overridePrice: false, manualPrice: undefined });
    }
  };

  const handleCaptureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current || !stream || hasCameraPermission !== true) {
       toast({ variant: "destructive", title: "Capture Error", description: "Camera not ready or permission denied." });
       return;
    }
    setIsIdentifying(true);
    setCameraError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
        toast({ variant: "destructive", title: "Canvas Error", description: "Could not get canvas context." });
        setIsIdentifying(false);
        return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoDataUri = canvas.toDataURL('image/jpeg');

    try {
      const input: IdentifyProductInput = { photoDataUri, currencyCode: selectedCurrencyCode };
      const result = await identifyProductFromImage(input);
      setIdentifiedProduct(result);
      setValue('manualPrice', result.price);
      setValue('overridePrice', false);
      toast({ title: "Product Identified", description: `AI identified: ${result.name} at ${selectedCurrencySymbol}${result.price.toFixed(2)}. Adjust if needed.` });
      handleToggleCameraMode();
      setFocus('quantity');
    } catch (error) {
      console.error("Error identifying product:", error);
      setIdentifiedProduct(null);
      toast({ variant: "destructive", title: "AI Error", description: (error as Error).message || `Failed to identify product in ${selectedCurrencyCode}.` });
    } finally {
      setIsIdentifying(false);
    }
  };

  const onSubmit: SubmitHandler<ProductInputFormValues> = (data) => {
    if (!identifiedProduct) {
      toast({
        variant: "destructive",
        title: "No Product Identified",
        description: "Please scan a product using the camera first.",
      });
      return;
    }

    const priceToUse = data.overridePrice && data.manualPrice !== undefined
      ? data.manualPrice
      : identifiedProduct.price;

    onAddItem(identifiedProduct.name, priceToUse, data.quantity, identifiedProduct.price);

    reset();
    setIdentifiedProduct(null);
    if (isCameraMode) handleToggleCameraMode();
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-xl font-headline">
            <ScanSearch className="mr-2 h-6 w-6 text-primary" /> Add Product via Camera
          </CardTitle>
          <Button variant="outline" onClick={handleToggleCameraMode} size="sm">
            <Camera className="mr-2 h-4 w-4" /> {isCameraMode ? 'Close Camera' : 'Scan Product'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isCameraMode ? (
          <div className="mb-4 p-4 border rounded-md bg-muted/30">
            <h3 className="text-lg font-medium mb-2 text-center">Camera View</h3>
            <div className="relative aspect-video bg-slate-800 rounded-md overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {isIdentifying && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                    <Zap className="h-12 w-12 text-primary animate-pulse mb-2" />
                    <p className="text-primary-foreground font-semibold">Identifying Product (in {selectedCurrencyCode})...</p>
                    <Skeleton className="h-4 w-3/4 mt-2 bg-slate-700" />
                    <Skeleton className="h-4 w-1/2 mt-1 bg-slate-700" />
                 </div>
              )}
            </div>
            {(hasCameraPermission === false || (cameraError && hasCameraPermission !== null)) && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertTitle>{cameraError && hasCameraPermission === null ? "Camera Error" : "Camera Access Required"}</AlertTitle>
                <AlertDescription>
                  {cameraError || "Please enable camera permissions."}
                </AlertDescription>
              </Alert>
            )}
            <Button
              onClick={handleCaptureAndIdentify}
              disabled={isIdentifying || hasCameraPermission !== true}
              className="w-full mt-4 bg-primary hover:bg-primary/90"
            >
              {isIdentifying ? 'Processing...' : (hasCameraPermission !== true ? 'Awaiting Camera...' : 'Capture & Identify Product')}
            </Button>
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {identifiedProduct && (
              <Card className="p-4 bg-primary/10 border-primary/30">
                <p className="text-sm text-foreground">
                  Identified: <span className="font-semibold">{identifiedProduct.name}</span>
                </p>
                <p className="text-sm text-foreground">
                  AI Estimated Price: <span className="font-semibold">{selectedCurrencySymbol}{identifiedProduct.price.toFixed(2)}</span>
                </p>
              </Card>
            )}

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
                <Label htmlFor="manualPrice" className="font-medium">Price ({selectedCurrencySymbol})</Label>
                <Controller
                  name="manualPrice"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground">{selectedCurrencySymbol}</span>
                      <Input
                        id="manualPrice"
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                        disabled={!overridePrice && !identifiedProduct}
                        className="pl-8"
                        aria-label="Manual Price"
                        placeholder={identifiedProduct && !overridePrice ? identifiedProduct.price.toFixed(2) : "0.00"}
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
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    disabled={!identifiedProduct}
                    aria-labelledby="overridePriceLabel"
                  />
                )}
              />
              <Label htmlFor="overridePrice" id="overridePriceLabel" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Override AI Price
              </Label>
            </div>

            <div className="flex justify-end space-x-3">
               <Button type="button" variant="outline" onClick={() => { reset(); setIdentifiedProduct(null); }} aria-label="Clear form">
                <XCircle className="mr-2 h-4 w-4" /> Clear
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Add item to bill" disabled={!identifiedProduct}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item to Bill
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
