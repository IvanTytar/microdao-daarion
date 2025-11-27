/**
 * PortalScene Component
 * 
 * Сцена 6: Вхід до міста через портал
 */

import { useEffect } from 'react';
import type { OnboardingMessage } from '../types/onboarding';
import { enterCity } from '../../../api/onboarding';
import { ApiError } from '../../../api/client';

interface PortalSceneProps {
  onComplete: (redirectUrl?: string) => void;
  addMessage: (message: Omit<OnboardingMessage, 'id' | 'timestamp'>) => void;
  userName: string;
  userId: string;
  setSceneLoading: (loading: boolean) => void;
  setSceneError: (error: string | null) => void;
  onCleanup?: () => void;
}

export function PortalScene({
  onComplete,
  addMessage,
  userName,
  userId,
  setSceneLoading,
  setSceneError,
  onCleanup,
}: PortalSceneProps) {
  useEffect(() => {
    setTimeout(() => {
      addMessage({
        author: 'agent',
        text: `🌟 Вітаю, ${userName}!\n\nОнбординг завершено! Ти готовий увійти до DAARION.city.\n\nПеред тобою відкривається місто AI-агентів та автономних спільнот. Що хочеш зробити першим?`,
        scene: 'portal',
        actions: [
          {
            id: 'portal-city',
            type: 'button',
            label: '🏙️ Дослідити місто',
            value: 'city',
            onClick: () => handleChoice('city'),
          },
          {
            id: 'portal-microdao',
            type: 'button',
            label: '🏛️ Створити MicroDAO',
            value: 'microdao',
            onClick: () => handleChoice('microdao'),
          },
          {
            id: 'portal-join',
            type: 'button',
            label: '👥 Приєднатися до спільноти',
            value: 'join',
            onClick: () => handleChoice('join'),
          },
        ],
      });
    }, 500);
  }, [addMessage, userName]);
  
  const handleChoice = async (choice: string) => {
    const labels = {
      city: '🏙️ Дослідити місто',
      microdao: '🏛️ Створити MicroDAO',
      join: '👥 Приєднатися до спільноти',
    };
    
    addMessage({
      author: 'user',
      text: labels[choice as keyof typeof labels],
      scene: 'portal',
    });
    
    try {
      setSceneError(null);
      setSceneLoading(true);
      const response = await enterCity({
        userId,
        completedOnboarding: true,
      });
      
      addMessage({
        author: 'agent',
        text: '✨ Чудовий вибір!\n\nВідкриваю портал до DAARION.city...\n\n🚀 Ласкаво просимо до міста майбутнього!',
        scene: 'portal',
      });
      
      setTimeout(() => {
        // Cleanup перед переходом
        if (onCleanup) {
          onCleanup();
        }
        onComplete(response.redirectUrl);
      }, 1200);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Не вдалося синхронізуватися з містом.';
      setSceneError(message);
      addMessage({
        author: 'agent',
        text: `${message}\n\nВідкриваю портал у офлайн-режимі.`,
        scene: 'portal',
      });
      
      // Cleanup навіть при помилці
      if (onCleanup) {
        onCleanup();
      }
      onComplete('/city');
    } finally {
      setSceneLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8 relative overflow-hidden">
      {/* Animated Portal Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900 opacity-80" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full blur-3xl animate-pulse" />
      </div>
      
      <div className="text-center max-w-md relative z-10">
        <div className="text-8xl mb-6 animate-spin-slow">
          🌀
        </div>
        <h2 className="text-4xl font-bold text-white mb-4">
          Портал відкрито
        </h2>
        <p className="text-xl text-cyan-200">
          Ласкаво просимо до DAARION.city
        </p>
      </div>
    </div>
  );
}

