/**
 * OnboardingProgress Component
 * 
 * Індикатор прогресу онбордингу
 */

import React from 'react';
import type { OnboardingScene } from '../types/onboarding';

interface OnboardingProgressProps {
  currentScene: OnboardingScene;
  completedScenes: OnboardingScene[];
  scenes: OnboardingScene[];
}

const SCENE_LABELS: Record<OnboardingScene, string> = {
  arrival: 'Прибуття',
  passkey: 'Доступ',
  matrix: 'Matrix',
  wallet: 'Гаманець',
  avatar: 'Аватар',
  portal: 'Портал',
};

const SCENE_ICONS: Record<OnboardingScene, string> = {
  arrival: '🚀',
  passkey: '🔐',
  matrix: '💬',
  wallet: '💰',
  avatar: '👤',
  portal: '🌟',
};

export function OnboardingProgress({
  currentScene,
  completedScenes,
  scenes,
}: OnboardingProgressProps) {
  const currentIndex = scenes.indexOf(currentScene);
  const progress = ((currentIndex + 1) / scenes.length) * 100;
  
  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Прогрес онбордингу
          </span>
          <span className="text-sm font-medium text-blue-600">
            {currentIndex + 1} з {scenes.length}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Steps */}
      <div className="grid grid-cols-6 gap-2">
        {scenes.map((scene, index) => {
          const isCompleted = completedScenes.includes(scene);
          const isCurrent = scene === currentScene;
          const isPast = index < currentIndex;
          
          return (
            <div
              key={scene}
              className="flex flex-col items-center"
            >
              {/* Step Circle */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mb-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                    : isPast
                    ? 'bg-gray-300 text-gray-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isCompleted ? '✓' : SCENE_ICONS[scene]}
              </div>
              
              {/* Step Label */}
              <span
                className={`text-xs text-center font-medium ${
                  isCurrent ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                {SCENE_LABELS[scene]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

