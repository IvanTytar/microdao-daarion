/**
 * AvatarScene Component
 * 
 * Сцена 5: Створення аватара
 */

import React, { useEffect } from 'react';
import type { OnboardingMessage, AvatarCreationMethod } from '../types/onboarding';
import { saveAvatar } from '../../../api/onboarding';
import { ApiError } from '../../../api/client';

interface AvatarSceneProps {
  onComplete: (created: boolean, data?: any) => void;
  addMessage: (message: Omit<OnboardingMessage, 'id' | 'timestamp'>) => void;
  setSceneLoading: (loading: boolean) => void;
  setSceneError: (error: string | null) => void;
  userId: string;
}

const avatarPresets: Record<AvatarCreationMethod, { message: string; url: string }> = {
  gallery: {
    message: '🎨 Відкриваю галерею аватарів...\n\n✅ Аватар вибрано!',
    url: '/avatars/gallery-default.png',
  },
  ai: {
    message: '🤖 Генерую аватар за допомогою AI...\n\n✅ Аватар згенеровано!',
    url: '/avatars/ai-default.png',
  },
  custom: {
    message: '✏️ Відкриваю редактор аватарів...\n\n✅ Аватар створено!',
    url: '/avatars/custom-default.png',
  },
};

export function AvatarScene({ onComplete, addMessage, setSceneLoading, setSceneError, userId }: AvatarSceneProps) {
  useEffect(() => {
    setTimeout(() => {
      addMessage({
        author: 'agent',
        text: '👤 Створи свій цифровий образ!\n\nТвій аватар — це твоє представлення в DAARION.city.\n\nОбери спосіб створення:',
        scene: 'avatar',
        actions: [
          {
            id: 'avatar-gallery',
            type: 'button',
            label: '🎨 Вибрати з галереї',
            value: 'gallery',
            onClick: () => handleMethod('gallery'),
          },
          {
            id: 'avatar-ai',
            type: 'button',
            label: '🤖 Згенерувати AI',
            value: 'ai',
            onClick: () => handleMethod('ai'),
          },
          {
            id: 'avatar-custom',
            type: 'button',
            label: '✏️ Налаштувати',
            value: 'custom',
            onClick: () => handleMethod('custom'),
          },
        ],
      });
    }, 500);
  }, [addMessage]);
  
  const handleMethod = async (method: AvatarCreationMethod) => {
    const labels = {
      gallery: '🎨 Вибрати з галереї',
      ai: '🤖 Згенерувати AI',
      custom: '✏️ Налаштувати',
    };
    
    addMessage({
      author: 'user',
      text: labels[method],
      scene: 'avatar',
    });
    
    try {
      setSceneError(null);
      setSceneLoading(true);
      const preset = avatarPresets[method];
      const response = await saveAvatar({
        userId,
        method,
        url: preset.url,
        config: {
          outfit: method,
        },
      });
      
      addMessage({
        author: 'agent',
        text: preset.message,
        scene: 'avatar',
      });
      
      setTimeout(() => {
        onComplete(true, {
          method,
          url: response.avatarUrl,
          config: { outfit: method },
        });
      }, 800);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Не вдалося створити аватар.';
      setSceneError(message);
      addMessage({
        author: 'agent',
        text: `${message}\n\nЗалишимо стандартний аватар — його можна буде змінити пізніше.`,
        scene: 'avatar',
      });
      onComplete(true, {
        method,
        url: avatarPresets[method].url,
        config: { outfit: method },
      });
    } finally {
      setSceneLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6 animate-bounce">
          👤
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Твій Аватар
        </h2>
        <p className="text-lg text-gray-600">
          Створи свій цифровий образ у місті
        </p>
      </div>
    </div>
  );
}

