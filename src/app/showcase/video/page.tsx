
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Video, Download, ArrowLeft, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateShowcaseVideo } from '@/ai/flows/generate-showcase-video-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export default function VideoShowcasePage() {
  const { toast } = useToast();
  const [videoDataUri, setVideoDataUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateVideo = async () => {
    setIsLoading(true);
    setError(null);
    setVideoDataUri(null);

    toast({
      title: 'Starting Video Generation...',
      description: 'The AI is warming up. This can take up to a minute, please be patient.',
      duration: 10000,
    });

    try {
      const result = await generateShowcaseVideo();
      setVideoDataUri(result.videoDataUri);
      toast({
        title: 'Video Generated Successfully!',
        description: 'Your showcase video is ready to be played and downloaded.',
        className: 'bg-green-500 text-white',
      });
    } catch (err) {
      const errorMessage = (err as Error).message || 'An unknown error occurred.';
      console.error('Error generating showcase video:', err);
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Video Generation Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!videoDataUri) return;
    const link = document.createElement('a');
    link.href = videoDataUri;
    link.download = `swiftcheckout-showcase-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <header className="mb-6 md:mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <Wand2 className="h-10 w-10 text-primary" />
          <h1 className="ml-3 text-3xl md:text-4xl font-bold font-headline text-primary">
            AI Video Showcase
          </h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/showcase">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Image Showcase
          </Link>
        </Button>
      </header>

      <div className="text-center max-w-2xl mx-auto mb-10">
        <p className="text-muted-foreground">
          Click the button below to generate a unique, AI-created video showcasing the SwiftCheckout app.
          Once generated, you can download it to use on your LinkedIn profile or portfolio.
        </p>
      </div>

      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Showcase Video Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full aspect-video flex items-center justify-center bg-muted/30 rounded-md p-4 mb-4">
            {isLoading && (
              <div className="flex flex-col items-center text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">
                  AI is generating your video.
                  <br />
                  This process can take up to a minute. Please wait...
                </p>
              </div>
            )}
            {error && !isLoading && (
              <Alert variant="destructive">
                <AlertTitle>Generation Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {videoDataUri && !isLoading && (
              <video
                src={videoDataUri}
                controls
                className="rounded-md border-2 border-border shadow-2xl object-contain max-h-full w-auto"
              />
            )}
            {!videoDataUri && !isLoading && !error && (
              <div className="text-center text-muted-foreground">
                <p>Your generated video will appear here.</p>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleGenerateVideo}
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground flex-1"
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Video className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Generating Video...' : 'Generate AI Video'}
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isLoading || !videoDataUri}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex-1"
              size="lg"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Video
            </Button>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SwiftCheckout Showcase</p>
      </footer>
    </div>
  );
}
