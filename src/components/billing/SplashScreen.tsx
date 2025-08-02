
"use client";

import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const [animationState, setAnimationState] = useState<'visible' | 'hiding' | 'hidden'>('visible');

  useEffect(() => {
    // This timer controls the "zoom" and "hold" duration for the logo.
    const zoomTimer = setTimeout(() => {
      setAnimationState('hiding');
    }, 2000); // Start hiding after 2 seconds

    // This timer cleans up the component after the fade-out animation is complete.
    const hideTimer = setTimeout(() => {
      setAnimationState('hidden');
      onAnimationComplete();
    }, 2800); // 2s zoom/hold + 0.8s fade-out

    return () => {
      clearTimeout(zoomTimer);
      clearTimeout(hideTimer);
    };
  }, [onAnimationComplete]);

  if (animationState === 'hidden') {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-700 ease-in-out',
        animationState === 'hiding' ? 'opacity-0' : 'opacity-100'
      )}
    >
      <Zap
        className={cn(
          'text-primary transform-gpu animate-splash-zoom'
        )}
        size={128}
      />
    </div>
  );
}
