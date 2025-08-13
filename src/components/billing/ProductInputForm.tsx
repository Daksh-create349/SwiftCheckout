
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, XCircle, Camera, Zap, AlertTriangleIcon, ScanSearch, Barcode, Loader2, Search, Edit, Mic, MicOff, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { identifyProductFromImage, type IdentifyProductInput, type IdentifyProductOutput } from '@/ai/flows/identify-product-flow';
import { getProductPriceByName, type GetProductPriceByNameInput } from '@/ai/flows/get-product-price-by-name-flow';
import { generateProductImageByName } from '@/ai/flows/generate-product-image-flow';
import { interpretVoiceCommand } from '@/ai/flows/interpret-voice-command-flow';
import type { InterpretVoiceCommandInput } from '@/types/billing';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';


const FormSchema = z.object({
  manualProductName: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  manualPrice: z.number().optional(),
  overridePrice: z.boolean().optional(),
});

type ProductInputFormValues = z.infer<typeof FormSchema>;

interface ProductInputFormProps {
  onAddItem: (name: string, price: number, quantity: number, originalPrice: number) => void;
  selectedCurrencyCode: string;
  selectedCurrencySymbol: string;
  disabled?: boolean;
}

export function ProductInputForm({ onAddItem, selectedCurrencyCode, selectedCurrencySymbol, disabled = false }: ProductInputFormProps) {
  const { toast } = useToast();
  const [identifiedProduct, setIdentifiedProduct] = useState<IdentifyProductOutput | null>(null);
  const [productImagePreviewUrl, setProductImagePreviewUrl] = useState<string | null>(null);
  const [isGeneratingProductImage, setIsGeneratingProductImage] = useState<boolean>(false);
  const [productImageError, setProductImageError] = useState<string | null>(null);
  const [isFetchingManualPrice, setIsFetchingManualPrice] = useState(false);

  // State for voice commands
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);


  const { control, handleSubmit, watch, setValue, reset, setFocus, getValues, formState: { errors } } = useForm<ProductInputFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      manualProductName: '',
      quantity: undefined,
      overridePrice: false,
      manualPrice: undefined,
    },
  });

  const overridePrice = watch('overridePrice');
  const manualProductNameWatch = watch('manualProductName');
  const previousCurrencyCodeRef = useRef<string>(selectedCurrencyCode);


  useEffect(() => {
    if (identifiedProduct && !overridePrice) {
      setValue('manualPrice', identifiedProduct.price);
    } else if (!identifiedProduct && !overridePrice) {
       if (!overridePrice) setValue('manualPrice', undefined);
    }
  }, [identifiedProduct, overridePrice, setValue]);

  const [isCameraMode, setIsCameraMode] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const clearProductImageStates = useCallback(() => {
    setProductImagePreviewUrl(null);
    setIsGeneratingProductImage(false);
    setProductImageError(null);
  }, []);

  useEffect(() => {
    if (!identifiedProduct) {
      clearProductImageStates();
    }
  }, [identifiedProduct, clearProductImageStates]);


  const triggerProductImageGeneration = useCallback(async (productName: string) => {
    if (!productName) return;
    setIsGeneratingProductImage(true);
    setProductImagePreviewUrl(null);
    setProductImageError(null);
    try {
      const imageResult = await generateProductImageByName({ productName });
      setProductImagePreviewUrl(imageResult.productImageDataUri);
    } catch (imgError) {
      console.error("Error generating product image:", imgError);
      setProductImageError((imgError as Error).message || "Failed to generate product image.");
    } finally {
      setIsGeneratingProductImage(false);
    }
  }, []);

  const handleToggleCameraMode = () => {
    setIsCameraMode(prev => !prev);
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
  
    const stopCameraStream = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  
    const initializeCamera = async () => {
      stopCameraStream(); // Ensure any previous stream is stopped
      setCameraError(null);
      setHasCameraPermission(null);
      setIdentifiedProduct(null);
      clearProductImageStates();
      reset({ manualProductName: '', quantity: undefined, overridePrice: false, manualPrice: undefined });
  
      if (!navigator.mediaDevices?.getUserMedia) {
        const errorMsg = "Camera API is not supported by your browser.";
        setCameraError(errorMsg);
        setHasCameraPermission(false);
        toast({ variant: 'destructive', title: 'Camera Error', description: errorMsg });
        setIsCameraMode(false);
        return;
      }
  
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play(); // Explicitly wait for the video to play
          setHasCameraPermission(true);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        const errorName = (error as Error).name;
        let errorMsg = 'Could not access the camera.';
        if (errorName === 'NotAllowedError') {
          errorMsg = 'Camera permission was denied. Please enable it in browser settings.';
        } else if (errorName === 'NotFoundError') {
          errorMsg = 'No camera found. Ensure a camera is connected.';
        } else if (errorName === 'NotReadableError') {
          errorMsg = 'Camera is in use by another app or hardware error.';
        }
  
        setCameraError(errorMsg);
        setHasCameraPermission(false);
        toast({ variant: 'destructive', title: 'Camera Access Error', description: errorMsg });
        setIsCameraMode(false); // Turn off camera mode on error
      }
    };
  
    if (isCameraMode) {
      initializeCamera();
    } else {
      stopCameraStream();
      setCameraError(null);
      setIsIdentifying(false); // Reset identifying state when camera closes
    }
  
    // Cleanup function to stop the stream when the component unmounts or mode changes
    return () => {
      stopCameraStream();
    };
  }, [isCameraMode, reset, clearProductImageStates, toast]);


  const handleCaptureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current || hasCameraPermission !== true) {
       toast({ variant: "destructive", title: "Capture Error", description: "Camera not ready or permission denied." });
       return;
    }
    
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.paused || video.ended) {
      toast({ variant: "destructive", title: "Capture Error", description: "Camera stream not yet available. Please try again." });
      return;
    }
    
    setIsIdentifying(true);
    setCameraError(null);
    setIdentifiedProduct(null); 
    clearProductImageStates();

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
      setValue('manualProductName', result.name);
      toast({ title: "Product Identified", description: `AI identified: ${result.name} at ${selectedCurrencySymbol}${result.price.toFixed(2)}. Adjust if needed.` });
      
      if (result.name) {
        triggerProductImageGeneration(result.name);
      }
      
      setIsCameraMode(false);
      setFocus('quantity');
    } catch (error) {
      console.error("Error identifying product:", error);
      setIdentifiedProduct(null);
      setValue('manualProductName', '');
      toast({ variant: "destructive", title: "AI Error", description: (error as Error).message || `Failed to identify product in ${selectedCurrencyCode}.` });
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
    setIdentifiedProduct(null); 
    clearProductImageStates();


    try {
      const result = await getProductPriceByName({ productName, currencyCode: selectedCurrencyCode });
      setIdentifiedProduct({ name: result.name, price: result.price });
      setValue('manualPrice', result.price);
      setValue('overridePrice', false);
      setValue('manualProductName', result.name);
      toast({
        title: "AI Price Fetched",
        description: `Product: ${result.name}. AI Price: ${selectedCurrencySymbol}${result.price.toFixed(2)}. Adjust if needed.`
      });

      if (result.name) {
        triggerProductImageGeneration(result.name);
      }

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

  useEffect(() => {
    const currentProductName = identifiedProduct?.name;

    if (
      previousCurrencyCodeRef.current !== selectedCurrencyCode &&
      currentProductName &&
      !isCameraMode &&
      !isIdentifying &&
      !isFetchingManualPrice
    ) {
      const reFetchPriceForNewCurrency = async () => {
        try {
          toast({
            title: "Currency Changed",
            description: `Updating AI price for ${currentProductName} to ${selectedCurrencyCode}...`
          });
          const result = await getProductPriceByName({ productName: currentProductName, currencyCode: selectedCurrencyCode });
          
          // Check if the product name in the form still matches the one we initiated the fetch for
          if (getValues('manualProductName') === currentProductName) {
            setIdentifiedProduct({ name: result.name, price: result.price });
            setValue('manualPrice', result.price);
            // Reset override status on currency change
            setValue('overridePrice', false); 
            toast({
              title: "Price Updated",
              description: `AI Price for ${result.name} is now ${selectedCurrencySymbol}${result.price.toFixed(2)}.`
            });
            if (identifiedProduct.name !== result.name && result.name) {
                 triggerProductImageGeneration(result.name);
            }
          } else {
             toast({
              title: "Price Update Skipped",
              description: `Product name was changed during currency update for ${currentProductName}. New price not applied.`
            });
          }
        } catch (apiError) {
          console.error("Error re-fetching price for new currency:", apiError);
          toast({
            variant: "destructive",
            title: "AI Pricing Error",
            description: (apiError as Error).message || `Could not update price for '${currentProductName}' in ${selectedCurrencyCode}.`
          });
        }
      };
      reFetchPriceForNewCurrency();
    }
    previousCurrencyCodeRef.current = selectedCurrencyCode;
  }, [
    selectedCurrencyCode,
    selectedCurrencySymbol,
    identifiedProduct,
    isCameraMode,
    isIdentifying,
    isFetchingManualPrice,
    setValue,
    getValues,
    toast,
    setIdentifiedProduct,
    triggerProductImageGeneration
  ]);

  const startRecording = async () => {
    setVoiceError(null);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
            setIsRecording(false);
            setIsProcessingVoice(true);
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = reader.result as string;
                 if (!base64Audio) {
                    setIsProcessingVoice(false);
                    setVoiceError('Failed to read audio data.');
                    return;
                }
                
                try {
                    const input: InterpretVoiceCommandInput = {
                        audioDataUri: base64Audio,
                        currencyCode: selectedCurrencyCode,
                    };
                    const result = await interpretVoiceCommand(input);
                    const { itemToAdd, transcribedText } = result;

                    if (itemToAdd) {
                        toast({
                            title: "Voice Command: Product Identified",
                            description: `AI heard "${transcribedText}" and identified: ${itemToAdd.name}.`,
                        });
                        // Populate the form instead of adding directly
                        setIdentifiedProduct({name: itemToAdd.name, price: itemToAdd.price});
                        setValue('manualProductName', itemToAdd.name);
                        setValue('quantity', itemToAdd.quantity);
                        setValue('manualPrice', itemToAdd.price);
                        setValue('overridePrice', false);
                        triggerProductImageGeneration(itemToAdd.name);
                        setFocus('quantity');

                    } else {
                         toast({
                            title: "No Product Identified",
                            description: `AI heard: "${transcribedText}", but couldn't identify a specific product. Try again.`,
                            duration: 7000,
                        });
                    }
                } catch (error) {
                    console.error("Error processing voice command:", error);
                    setVoiceError((error as Error).message || "Failed to process your voice command.");
                } finally {
                    setIsProcessingVoice(false);
                }
            };
            // Clean up stream tracks
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
    } catch (error) {
        console.error("Error accessing microphone:", error);
        let errorMsg = 'Could not access the microphone.';
        if ((error as Error).name === 'NotAllowedError') {
            errorMsg = 'Microphone permission was denied. Please enable it in browser settings.';
        }
        setVoiceError(errorMsg);
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
      }
  };

  const handleVoiceButtonClick = () => {
      if (isRecording) {
          stopRecording();
      } else {
          startRecording();
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
    
    if (!identifiedProduct && !data.overridePrice && data.manualPrice === undefined) {
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
    clearProductImageStates();
    if (isCameraMode) setIsCameraMode(false);
  };

  const handleClearForm = () => {
    reset();
    setIdentifiedProduct(null);
    clearProductImageStates();
    if (isCameraMode) setIsCameraMode(false);
  }

  const anyAILoading = isIdentifying || isFetchingManualPrice || isGeneratingProductImage || isProcessingVoice;
  const cameraActiveAndReady = isCameraMode && hasCameraPermission === true;


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <CardTitle className="flex items-center text-xl font-headline">
            <ScanSearch className="mr-2 h-6 w-6 text-primary" /> Add Product
          </CardTitle>
          <div className="flex items-center gap-2">
             <Button 
                variant="outline" 
                onClick={handleVoiceButtonClick} 
                size="sm" 
                disabled={disabled || anyAILoading || isCameraMode}
                className={cn(isRecording && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
                {isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                {isRecording ? 'Stop Recording' : isProcessingVoice ? 'Processing...' : 'Voice Command'}
            </Button>
            <Button variant="outline" onClick={handleToggleCameraMode} size="sm" disabled={disabled || anyAILoading}>
                <Camera className="mr-2 h-4 w-4" /> {isCameraMode ? 'Close Scanner' : 'Scan Product or Barcode'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <canvas ref={canvasRef} className="hidden"></canvas>
        
        {voiceError && (
            <Alert variant="destructive" className="mt-4">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertTitle>Voice Command Error</AlertTitle>
                <AlertDescription>{voiceError}</AlertDescription>
            </Alert>
        )}

        {isCameraMode ? (
          <div className="mb-4 p-4 border rounded-md bg-muted/30">
            <h3 className="text-lg font-medium mb-2 text-center">Scanner Active</h3>
             <p className="text-sm text-muted-foreground text-center mb-4">Center the product or barcode in the frame.</p>
            {hasCameraPermission === null && (
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground mt-2">Initializing camera...</p>
                </div>
            )}

            {hasCameraPermission === false && cameraError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertTitle>Camera Access Issue</AlertTitle>
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            )}
            
            <div className={cn("relative aspect-video bg-slate-800 rounded-md overflow-hidden", !isCameraMode && "hidden")}>
               <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

                {/* Scanner Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3/4 h-1/2 border-4 border-primary/50 rounded-lg shadow-inner" />
                    <ScanLine className="absolute w-3/4 h-1 text-primary animate-pulse" />
                </div>

              {isIdentifying && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                    <Zap className="h-12 w-12 text-primary animate-pulse mb-2" />
                    <p className="text-primary-foreground font-semibold">
                        {`Scanning & Identifying (in ${selectedCurrencyCode})...`}
                    </p>
                    <Skeleton className="h-4 w-3/4 mt-2 bg-slate-700" />
                    <Skeleton className="h-4 w-1/2 mt-1 bg-slate-700" />
                 </div>
              )}
            </div>

            {cameraActiveAndReady && (
              <Button
                onClick={handleCaptureAndIdentify}
                disabled={disabled || isIdentifying}
                className="w-full mt-4 bg-primary hover:bg-primary/90"
                aria-label="Capture image and identify product"
              >
                <Camera className="mr-2 h-4 w-4" />
                {isIdentifying ? 'Processing Scan...' : 'Scan'}
              </Button>
            )}
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
                            disabled={disabled || anyAILoading}
                            onChange={(e) => {
                                field.onChange(e);
                                if (identifiedProduct && e.target.value !== identifiedProduct.name) {
                                    setIdentifiedProduct(null); 
                                    clearProductImageStates();
                                }
                            }}
                            />
                        )}
                    />
                    <Button 
                        type="button" 
                        onClick={handleFetchPriceForManualName} 
                        disabled={disabled || anyAILoading || !manualProductNameWatch?.trim()}
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

            {(isGeneratingProductImage || productImagePreviewUrl || productImageError) && !isCameraMode && (
                <Card className="mt-4 p-4">
                    <CardTitle className="text-sm font-medium mb-2">Product Image Preview</CardTitle>
                    {isGeneratingProductImage && (
                        <div className="flex flex-col items-center justify-center h-32 bg-muted/30 rounded-md">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground mt-2">Generating image...</p>
                        </div>
                    )}
                    {productImageError && !isGeneratingProductImage && (
                        <Alert variant="destructive">
                            <AlertTriangleIcon className="h-4 w-4" />
                            <AlertTitle>Image Generation Error</AlertTitle>
                            <AlertDescription>{productImageError}</AlertDescription>
                        </Alert>
                    )}
                    {productImagePreviewUrl && !isGeneratingProductImage && !productImageError && (
                         <div className="flex justify-center items-center h-32 bg-muted/30 rounded-md overflow-hidden">
                            <Image
                                src={productImagePreviewUrl}
                                alt={identifiedProduct?.name || 'Generated product image'}
                                width={200}
                                height={200}
                                className="rounded-md border shadow-sm object-contain max-h-full w-auto"
                                data-ai-hint={identifiedProduct?.name ? identifiedProduct.name.split(" ").slice(0,2).join(" ").toLowerCase() : "product object"}
                            />
                        </div>
                    )}
                </Card>
            )}

             {!identifiedProduct && !isCameraMode && !anyAILoading && !productImagePreviewUrl && !productImageError && (
                 <div className="text-center py-4 text-muted-foreground border-t border-dashed mt-4 pt-4 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2 opacity-60">
                      <Barcode className="h-8 w-8"/>
                      <span className="text-lg">/</span>
                      <Camera className="h-8 w-8"/>
                    </div>
                    <p className="text-xs mt-2">Use the scanner for image or barcode identification.</p>
                </div>
            )}
            {(isFetchingManualPrice && !isCameraMode) && ( 
                <div className="text-center py-4">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground mt-2">
                        {`Fetching AI price for ${getValues('manualProductName')} in ${selectedCurrencyCode}...`}
                    </p>
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
                      placeholder='1'
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value)}
                      min="1"
                      aria-label="Quantity"
                      disabled={disabled || anyAILoading || (!identifiedProduct && !overridePrice && getValues('manualPrice') === undefined)}
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
                        disabled={disabled || !overridePrice || anyAILoading || (!identifiedProduct && !getValues('manualProductName')?.trim())}
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
                    disabled={disabled || anyAILoading || (!identifiedProduct && !getValues('manualProductName')?.trim())}
                    aria-labelledby="overridePriceLabel"
                  />
                )}
              />
              <Label htmlFor="overridePrice" id="overridePriceLabel" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Override AI / Set Manual Price
              </Label>
            </div>

            <div className="flex justify-end space-x-3 border-t pt-4">
               <Button type="button" variant="outline" onClick={handleClearForm} aria-label="Clear form" disabled={disabled || anyAILoading}>
                <XCircle className="mr-2 h-4 w-4" /> Clear
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground" 
                aria-label="Add item to bill" 
                disabled={disabled || anyAILoading || (!identifiedProduct && !(overridePrice && getValues('manualProductName')?.trim() && getValues('manualPrice') !== undefined)) && !(identifiedProduct && (getValues('manualPrice') !== undefined || !overridePrice) ) }
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
