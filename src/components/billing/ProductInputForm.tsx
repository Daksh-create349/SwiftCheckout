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
import { PlusCircle, XCircle, Camera, Zap, AlertTriangleIcon, ScanSearch, Barcode, Loader2, Search, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { identifyProductFromImage, type IdentifyProductInput, type IdentifyProductOutput } from '@/ai/flows/identify-product-flow';
import { getProductPriceByName, type GetProductPriceByNameInput, type GetProductPriceByNameOutput } from '@/ai/flows/get-product-price-by-name-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException } from '@zxing/library';


const FormSchema = z.object({
  manualProductName: z.string().optional(),
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

  const { control, handleSubmit, watch, setValue, reset, setFocus, getValues, formState: { errors } } = useForm<ProductInputFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      manualProductName: '',
      quantity: 1,
      overridePrice: false,
      manualPrice: undefined,
    },
  });

  const overridePrice = watch('overridePrice');
  const manualProductNameWatch = watch('manualProductName');

  useEffect(() => {
    if (identifiedProduct && !overridePrice) {
      setValue('manualPrice', identifiedProduct.price);
    } else if (!identifiedProduct && !overridePrice) {
       // Keep manualPrice if overridePrice is checked, otherwise clear it.
       if (!overridePrice) setValue('manualPrice', undefined);
    }
  }, [identifiedProduct, overridePrice, setValue]);

  const [isCameraMode, setIsCameraMode] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
  const [isFetchingManualPrice, setIsFetchingManualPrice] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const stopCameraStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const handleToggleCameraMode = useCallback(() => {
    setIsCameraMode(prevIsCameraMode => {
      const nextIsCameraMode = !prevIsCameraMode;
      if (nextIsCameraMode) {
        setIdentifiedProduct(null);
        reset({ manualProductName: '', quantity: 1, overridePrice: false, manualPrice: undefined });
      }
      return nextIsCameraMode;
    });
  }, [setIsCameraMode, setIdentifiedProduct, reset]);


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
           if (videoRef.current) videoRef.current.play().catch(e => console.error("Video play failed",e));
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
      stopCameraStream();
    }
  }, [toast, stopCameraStream]);


  useEffect(() => {
    if (isCameraMode) {
      requestCameraPermission();
    } else {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
      stopCameraStream();
      setHasCameraPermission(null);
      setCameraError(null);
      setIsProcessingBarcode(false);
    }

    return () => {
      if (isCameraMode) {
        if (codeReaderRef.current) {
          codeReaderRef.current.reset();
          codeReaderRef.current = null;
        }
        stopCameraStream();
      }
    };
  }, [isCameraMode, requestCameraPermission, stopCameraStream]);


  useEffect(() => {
    if (isCameraMode && hasCameraPermission === true && videoRef.current && videoRef.current.readyState >= videoRef.current.HAVE_METADATA) {
      if (!codeReaderRef.current && !isProcessingBarcode && !isIdentifying && !isFetchingManualPrice) {
        const reader = new BrowserMultiFormatReader();
        codeReaderRef.current = reader;

        reader.decodeFromContinuously(videoRef.current, (result, error) => {
          if (result && !isProcessingBarcode && codeReaderRef.current && !isIdentifying && !isFetchingManualPrice) {
            setIsProcessingBarcode(true);
            setIsIdentifying(true);

            const barcodeText = result.getText();

            getProductPriceByName({ productName: barcodeText, currencyCode: selectedCurrencyCode })
              .then(aiResult => {
                setIdentifiedProduct({ name: aiResult.name, price: aiResult.price });
                setValue('manualPrice', aiResult.price);
                setValue('overridePrice', false);
                setValue('manualProductName', aiResult.name);
                toast({
                  title: "Barcode Scanned",
                  description: `Product: ${aiResult.name}. AI Price: ${selectedCurrencySymbol}${aiResult.price.toFixed(2)}. Adjust if needed.`
                });
                handleToggleCameraMode();
                setFocus('quantity');
              })
              .catch(apiError => {
                console.error("Error getting price for barcode:", apiError);
                toast({
                  variant: "destructive",
                  title: "AI Error (Barcode)",
                  description: (apiError as Error).message || `Failed to get price for product '${barcodeText}'.`
                });
                setIsProcessingBarcode(false);
              })
              .finally(() => {
                setIsIdentifying(false);
                 if (codeReaderRef.current) {
                    codeReaderRef.current.reset();
                    codeReaderRef.current = null; // Ensure it's reset for next attempt
                }
              });
          }
          if (error && !(error instanceof NotFoundException) && !(error instanceof ChecksumException) && !(error instanceof FormatException)) {
            // console.warn('Barcode scanning error:', error);
          }
        }).catch(startError => {
          console.error("Failed to start barcode continuous decoding:", startError);
          if(!(startError instanceof DOMException && startError.name === 'NotSupportedError')){
            toast({ variant: "destructive", title: "Scanner Error", description: "Could not start barcode scanner." });
          }
          if (codeReaderRef.current) {
              codeReaderRef.current.reset();
              codeReaderRef.current = null;
          }
          setIsProcessingBarcode(false);
        });
      }
    }
     return () => {
        if (codeReaderRef.current) {
            codeReaderRef.current.reset();
            codeReaderRef.current = null;
        }
    };
  }, [
    isCameraMode,
    hasCameraPermission,
    videoRef.current?.readyState,
    isProcessingBarcode,
    isIdentifying,
    selectedCurrencyCode,
    selectedCurrencySymbol,
    setValue,
    toast,
    handleToggleCameraMode,
    setFocus,
    setIdentifiedProduct,
    isFetchingManualPrice
  ]);


  const handleCaptureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current || !stream || hasCameraPermission !== true) {
       toast({ variant: "destructive", title: "Capture Error", description: "Camera not ready or permission denied." });
       return;
    }
    if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
    }
    setIsProcessingBarcode(true);
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
        setIsProcessingBarcode(false);
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
      setValue('manualProductName', result.name);
      toast({ title: "Product Identified", description: `AI identified: ${result.name} at ${selectedCurrencySymbol}${result.price.toFixed(2)}. Adjust if needed.` });
      handleToggleCameraMode();
      setFocus('quantity');
    } catch (error) {
      console.error("Error identifying product:", error);
      setIdentifiedProduct(null);
      setValue('manualProductName', '');
      toast({ variant: "destructive", title: "AI Error", description: (error as Error).message || `Failed to identify product in ${selectedCurrencyCode}.` });
      setIsProcessingBarcode(false);
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleFetchPriceForManualName = async () => {
    const productName = getValues('manualProductName');
    if (!productName || productName.trim() === '') {
      toast({ variant: 'destructive', title: 'Missing Product Name', description: 'Please enter a product name to fetch its price.' });
      return;
    }
    setIsFetchingManualPrice(true);
    setIdentifiedProduct(null); // Clear previous identification
    try {
      const result = await getProductPriceByName({ productName, currencyCode: selectedCurrencyCode });
      setIdentifiedProduct({ name: result.name, price: result.price }); // Use AI returned name for consistency
      setValue('manualPrice', result.price);
      setValue('overridePrice', false);
      setValue('manualProductName', result.name); // Update with AI's version of the name
      toast({
        title: "AI Price Fetched",
        description: `Product: ${result.name}. AI Price: ${selectedCurrencySymbol}${result.price.toFixed(2)}. Adjust if needed.`
      });
      setFocus('quantity');
    } catch (apiError) {
      console.error("Error getting price for manual product name:", apiError);
      setIdentifiedProduct(null);
      toast({
        variant: "destructive",
        title: "AI Pricing Error",
        description: (apiError as Error).message || `Failed to get price for product '${productName}'.`
      });
    } finally {
      setIsFetchingManualPrice(false);
    }
  };


  const onSubmit: SubmitHandler<ProductInputFormValues> = (data) => {
    const currentProductName = identifiedProduct?.name || data.manualProductName;

    if (!currentProductName || currentProductName.trim() === '') {
       toast({
        variant: "destructive",
        title: "No Product Name",
        description: "Please enter a product name or scan a product using the camera.",
      });
      return;
    }
    
    if (!identifiedProduct && !data.overridePrice) {
      toast({
        variant: "destructive",
        title: "Price Not Set",
        description: "Please fetch AI price or override price manually for the entered product.",
      });
      return;
    }
    
    const priceToUse = data.overridePrice && data.manualPrice !== undefined
      ? data.manualPrice
      : identifiedProduct?.price;

    if (priceToUse === undefined) {
         toast({
            variant: "destructive",
            title: "Price Not Available",
            description: "Please ensure a price is set (either by AI or manually).",
        });
        return;
    }

    onAddItem(currentProductName, priceToUse, data.quantity, identifiedProduct?.price ?? priceToUse);

    reset();
    setIdentifiedProduct(null);
    if (isCameraMode) handleToggleCameraMode();
  };

  const handleClearForm = () => {
    reset();
    setIdentifiedProduct(null);
    if (isCameraMode) handleToggleCameraMode();
  }

  const anyLoading = isIdentifying || isProcessingBarcode || isFetchingManualPrice;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-xl font-headline">
            <ScanSearch className="mr-2 h-6 w-6 text-primary" /> Add Product
          </CardTitle>
          <Button variant="outline" onClick={handleToggleCameraMode} size="sm" disabled={anyLoading}>
            <Camera className="mr-2 h-4 w-4" /> {isCameraMode ? 'Close Camera' : 'Scan with Camera'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isCameraMode ? (
          <div className="mb-4 p-4 border rounded-md bg-muted/30">
            <h3 className="text-lg font-medium mb-2 text-center">Camera View</h3>
            {hasCameraPermission === true && <p className="text-center text-sm text-muted-foreground mb-2">Scanning for barcodes... Or use button for image identification.</p>}
            <div className="relative aspect-video bg-slate-800 rounded-md overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
              {(isIdentifying || isProcessingBarcode) && hasCameraPermission === true && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                    <Zap className="h-12 w-12 text-primary animate-pulse mb-2" />
                    <p className="text-primary-foreground font-semibold">
                        {isProcessingBarcode && isIdentifying ? "Processing Barcode..." : (isIdentifying ? `Identifying Product (in ${selectedCurrencyCode})...` : "Loading...")}
                    </p>
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
                  {!cameraError && <Button variant="link" onClick={requestCameraPermission} className="p-0 h-auto">Retry camera permission</Button>}
                </AlertDescription>
              </Alert>
            )}
            {hasCameraPermission === null && !cameraError && (
                 <div className="mt-4 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground mt-2">Requesting camera permission...</p>
                </div>
            )}
            <Button
              onClick={handleCaptureAndIdentify}
              disabled={isIdentifying || isProcessingBarcode || hasCameraPermission !== true}
              className="w-full mt-4 bg-primary hover:bg-primary/90"
              aria-label="Capture image and identify product"
            >
              <Camera className="mr-2 h-4 w-4" />
              {isIdentifying && !isProcessingBarcode ? 'Processing Image...' : (hasCameraPermission !== true ? 'Awaiting Camera...' : 'Capture Image & Identify Product')}
            </Button>
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-2">
                <Label htmlFor="manualProductName" className="font-medium flex items-center">
                    <Edit className="mr-2 h-4 w-4 text-muted-foreground" /> Product Name (Manual Entry)
                </Label>
                <div className="flex space-x-2">
                    <Controller
                        name="manualProductName"
                        control={control}
                        render={({ field }) => (
                            <Input
                            id="manualProductName"
                            type="text"
                            {...field}
                            placeholder="Type product name here"
                            aria-label="Manual Product Name"
                            disabled={anyLoading}
                            />
                        )}
                    />
                    <Button 
                        type="button" 
                        onClick={handleFetchPriceForManualName} 
                        disabled={anyLoading || !manualProductNameWatch?.trim()}
                        variant="outline"
                    >
                        {isFetchingManualPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Get AI Price
                    </Button>
                </div>
                {errors.manualProductName && <p className="text-sm text-destructive">{errors.manualProductName.message}</p>}
            </div>


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
             {!identifiedProduct && !isCameraMode && !isFetchingManualPrice && (
                 <div className="text-center py-4 text-muted-foreground border-t border-dashed mt-4 pt-4">
                    <Barcode className="mx-auto h-8 w-8 mb-2 opacity-50"/>
                    <p className="text-xs">Or use 'Scan with Camera' to use barcode/image identification.</p>
                </div>
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
                      value={field.value || 1}
                      onChange={e => field.onChange(parseInt(e.target.value,10) || 1)}
                      min="1"
                      aria-label="Quantity"
                      disabled={anyLoading || (!identifiedProduct && !overridePrice)}
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
                        min="0"
                        {...field}
                        value={field.value === undefined ? '' : field.value}
                        onChange={e => {
                            const rawValue = e.target.value;
                            if (rawValue === '') {
                                field.onChange(undefined);
                            } else {
                                const numValue = parseFloat(rawValue);
                                field.onChange(isNaN(numValue) ? undefined : numValue);
                            }
                        }}
                        disabled={!overridePrice || anyLoading || (!identifiedProduct && !getValues('manualProductName')?.trim())}
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
                    disabled={anyLoading || (!identifiedProduct && !getValues('manualProductName')?.trim())}
                    aria-labelledby="overridePriceLabel"
                  />
                )}
              />
              <Label htmlFor="overridePrice" id="overridePriceLabel" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Override AI / Set Manual Price
              </Label>
            </div>

            <div className="flex justify-end space-x-3 border-t pt-4">
               <Button type="button" variant="outline" onClick={handleClearForm} aria-label="Clear form" disabled={anyLoading}>
                <XCircle className="mr-2 h-4 w-4" /> Clear
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground" 
                aria-label="Add item to bill" 
                disabled={anyLoading || (!identifiedProduct && !(overridePrice && getValues('manualProductName')?.trim() && getValues('manualPrice') !== undefined))}
               >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item to Bill
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
