
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
import { Barcode, DollarSign, PlusCircle, XCircle, Camera, Zap, AlertTriangleIcon } from 'lucide-react';
import type { Product } from '@/types/billing';
import { MOCK_PRODUCTS_LIST, MOCK_PRODUCTS_MAP } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { identifyProductFromImage, type IdentifyProductInput } from '@/ai/flows/identify-product-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

const FormSchema = z.object({
  productCode: z.string().min(1, "Product code is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  manualPrice: z.number().optional(),
  overridePrice: z.boolean().optional(),
});

type ProductInputFormValues = z.infer<typeof FormSchema>;

interface ProductInputFormProps {
  onAddItem: (product: Product, quantity: number, manualPrice?: number) => void;
}

export function ProductInputForm({ onAddItem }: ProductInputFormProps) {
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const { control, handleSubmit, watch, setValue, reset, setFocus, formState: { errors } } = useForm<ProductInputFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      productCode: '',
      quantity: 1,
      overridePrice: false,
    },
  });

  const productCode = watch('productCode');
  const overridePrice = watch('overridePrice');

  // Camera related state
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (productCode) {
      const product = MOCK_PRODUCTS_MAP.get(productCode);
      if (product) {
        setFoundProduct(product);
        if (!overridePrice) {
          setValue('manualPrice', product.price);
        }
      } else {
        setFoundProduct(null);
         if (!overridePrice) {
          setValue('manualPrice', undefined);
        }
      }
    } else {
      setFoundProduct(null);
      if (!overridePrice) {
        setValue('manualPrice', undefined);
      }
    }
  }, [productCode, overridePrice, setValue]);
  
  useEffect(() => {
    if (foundProduct && !overridePrice) {
      setValue('manualPrice', foundProduct.price);
    }
  }, [foundProduct, overridePrice, setValue]);

  const requestCameraPermission = useCallback(async () => {
    setCameraError(null); // Reset error at the beginning of a request
    setHasCameraPermission(null); // Reset permission status

    if (!videoRef.current && isCameraMode) { // Check if videoRef is available when in camera mode
        console.error("Video element not rendered yet.");
        setCameraError("Video element not ready. Please try toggling camera mode again.");
        setHasCameraPermission(false);
        toast({ variant: "destructive", title: "Internal Error", description: "Video element not ready." });
        return;
    }

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
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      const errorName = (error as Error).name;
      let errorMsg = 'Could not access the camera. Please ensure it is not in use by another application.';
      if (errorName === 'NotAllowedError') {
        errorMsg = 'Camera permission was denied. Please enable it in your browser settings.';
      } else if (errorName === 'NotFoundError') {
        errorMsg = 'No camera was found. Please ensure a camera is connected and enabled.';
      } else if (errorName === 'NotReadableError') {
        errorMsg = 'The camera is currently in use by another application or a hardware error occurred.';
      }
      
      setCameraError(errorMsg);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Error',
        description: errorMsg,
      });
    }
  }, [toast, isCameraMode]); // Added isCameraMode to deps

  useEffect(() => {
    if (isCameraMode) {
      requestCameraPermission();
    } else {
      // Cleanup when camera mode is turned off
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
      }
      setHasCameraPermission(null); 
      setCameraError(null);
    }

    // Cleanup stream on component unmount or if stream/isCameraMode changes
    return () => {
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraMode, requestCameraPermission]); // stream removed from deps to avoid re-running requestCameraPermission if only stream changes. stream specific cleanup is above.


  const handleToggleCameraMode = () => {
    setIsCameraMode(prevIsCameraMode => !prevIsCameraMode);
  };

  const handleCaptureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current || !stream || !hasCameraPermission) {
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
      const input: IdentifyProductInput = { 
        photoDataUri, 
        knownProducts: MOCK_PRODUCTS_LIST.map(p => ({id: p.id, name: p.name, price: p.price}))
      };
      const result = await identifyProductFromImage(input);

      if (result.matchFoundInDB && result.productId) {
        setValue('productCode', result.productId);
        toast({ title: "Product Identified & Found", description: `${result.name} details populated.` });
      } else {
        toast({ 
          title: "Product Identified (Not in Database)", 
          description: `AI identified: ${result.name}. Est. Price: $${result.price.toFixed(2)}. Please enter code manually or add if new.`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error identifying product:", error);
      toast({ variant: "destructive", title: "AI Error", description: (error as Error).message || "Failed to identify product." });
    } finally {
      setIsIdentifying(false);
    }
  };


  const onSubmit: SubmitHandler<ProductInputFormValues> = (data) => {
    const productToSubmit = MOCK_PRODUCTS_MAP.get(data.productCode);
    if (productToSubmit) {
      const priceToUse = data.overridePrice && data.manualPrice !== undefined ? data.manualPrice : productToSubmit.price;
      onAddItem(productToSubmit, data.quantity, priceToUse);
      reset();
      setFoundProduct(null);
      setFocus('productCode');
      if(isCameraMode) handleToggleCameraMode(); 
    } else {
      toast({
        variant: "destructive",
        title: "Product Not Found",
        description: "Please enter a valid product code or use camera scan.",
      });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-xl font-headline">
            <Barcode className="mr-2 h-6 w-6 text-primary" /> Add Product
          </CardTitle>
          <Button variant="outline" onClick={handleToggleCameraMode} size="sm">
            <Camera className="mr-2 h-4 w-4" /> {isCameraMode ? 'Close Camera' : 'Scan with Camera'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isCameraMode ? (
          <div className="mb-4 p-4 border rounded-md bg-muted/30">
            <h3 className="text-lg font-medium mb-2 text-center">Camera View</h3>
            
            <div className="relative aspect-video bg-slate-800 rounded-md overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              {isIdentifying && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                    <Zap className="h-12 w-12 text-primary animate-pulse mb-2" />
                    <p className="text-primary-foreground font-semibold">Identifying Product...</p>
                    <Skeleton className="h-4 w-3/4 mt-2 bg-slate-700" />
                    <Skeleton className="h-4 w-1/2 mt-1 bg-slate-700" />
                 </div>
              )}
            </div>

            {/* Alert for camera permission issues or errors */}
            {(hasCameraPermission === false || (hasCameraPermission === null && cameraError)) && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertTitle>{cameraError && hasCameraPermission !== false ? "Camera Error" : "Camera Access Required"}</AlertTitle>
                <AlertDescription>
                  {cameraError || "Please enable camera permissions in your browser settings and ensure it's not in use by another application."}
                </AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={handleCaptureAndIdentify} 
              disabled={isIdentifying || hasCameraPermission !== true} 
              className="w-full mt-4 bg-primary hover:bg-primary/90"
            >
              {isIdentifying ? 'Processing...' : (hasCameraPermission !== true ? 'Grant Camera Permission' : 'Capture & Identify Product')}
            </Button>
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="productCode" className="font-medium">Product Code</Label>
              <Controller
                name="productCode"
                control={control}
                render={({ field }) => (
                  <Input id="productCode" {...field} placeholder="Scan or type product code" aria-label="Product Code" />
                )}
              />
              {foundProduct && <p className="text-sm text-muted-foreground">Found: {foundProduct.name} - Price: ${foundProduct.price.toFixed(2)}</p>}
              {!foundProduct && productCode && <p className="text-sm text-destructive">Product code not found.</p>}
              {errors.productCode && !productCode && <p className="text-sm text-destructive">{errors.productCode.message}</p>}
            </div>

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
                <Label htmlFor="manualPrice" className="font-medium">Price</Label>
                <Controller
                  name="manualPrice"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        id="manualPrice" 
                        type="number" 
                        step="0.01" 
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                        disabled={!overridePrice && !foundProduct}
                        className="pl-8"
                        aria-label="Manual Price"
                        placeholder={foundProduct && !overridePrice ? foundProduct.price.toFixed(2) : "0.00"}
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
                    disabled={!foundProduct}
                    aria-labelledby="overridePriceLabel"
                  />
                )}
              />
              <Label htmlFor="overridePrice" id="overridePriceLabel" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Override Price
              </Label>
            </div>

            <div className="flex justify-end space-x-3">
               <Button type="button" variant="outline" onClick={() => { reset(); setFoundProduct(null); }} aria-label="Clear form">
                <XCircle className="mr-2 h-4 w-4" /> Clear
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Add item to bill" disabled={!productCode && !foundProduct}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

