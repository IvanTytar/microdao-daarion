/**
 * SceneTransition Component
 * 
 * Анімація переходу між сценами
 */

import React from 'react';
import type { OnboardingScene } from '../types/onboarding';

interface SceneTransitionProps {
  from: OnboardingScene;
  to: OnboardingScene;
  onComplete: () => void;
}

const SCENE_COLORS: Record<OnboardingScene, string> = {
  arrival: 'from-purple-500 to-blue-500',
  passkey: 'from-blue-500 to-cyan-500',
  matrix: 'from-cyan-500 to-teal-500',
  wallet: 'from-teal-500 to-green-500',
  avatar: 'from-green-500 to-yellow-500',
  portal: 'from-yellow-500 to-orange-500',
};

export function SceneTransition({ from, to, onComplete }: SceneTransitionProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${SCENE_COLORS[to]} opacity-0 animate-fadeIn`}
      />
      
      {/* Content */}
      <div className="relative z-10 text-center text-white">
        <div className="animate-pulse">
          <div className="text-6xl mb-4">🌟</div>
          <div className="text-2xl font-bold">Перехід...</div>
        </div>
      </div>
    </div>
  );
}

