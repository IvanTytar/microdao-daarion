/**
 * MatrixScene Component
 * 
 * Сцена 3: Підключення Matrix (для зв'язку з месенджерами)
 */

import React, { useEffect } from 'react';
import type { OnboardingMessage } from '../types/onboarding';
import { connectMatrix } from '../../../api/onboarding';
import { ApiError } from '../../../api/client';

interface MatrixSceneProps {
  onComplete: (enabled: boolean, data?: any) => void;
  addMessage: (message: Omit<OnboardingMessage, 'id' | 'timestamp'>) => void;
  setSceneLoading: (loading: boolean) => void;
  setSceneError: (error: string | null) => void;
  userId: string;
}

export function MatrixScene({
  onComplete,
  addMessage,
  setSceneLoading,
  setSceneError,
  userId,
}: MatrixSceneProps) {
  useEffect(() => {
    setTimeout(() => {
      addMessage({
        author: 'agent',
        text: '💬 Хочеш підключити Matrix?\n\nMatrix — це відкритий протокол для спілкування. Завдяки йому ти зможеш:\n\n✅ Спілкуватися через Telegram\n✅ Інтегруватися з Discord\n✅ Використовувати інші месенджери\n\nПідключити зараз?',
        scene: 'matrix',
        actions: [
          {
            id: 'matrix-yes',
            type: 'button',
            label: 'Так, підключити',
            value: 'yes',
            onClick: () => handleChoice(true),
          },
          {
            id: 'matrix-no',
            type: 'button',
            label: 'Пропустити',
            value: 'no',
            onClick: () => handleChoice(false),
          },
        ],
      });
    }, 500);
  }, [addMessage]);
  
  const handleChoice = async (enabled: boolean) => {
    addMessage({
      author: 'user',
      text: enabled ? 'Так, підключити' : 'Пропустити',
      scene: 'matrix',
    });
    
    if (!enabled) {
      setTimeout(() => {
        addMessage({
          author: 'agent',
          text: 'Без проблем! Ти зможеш підключити Matrix пізніше в налаштуваннях.',
          scene: 'matrix',
        });
        setTimeout(() => onComplete(false), 800);
      }, 400);
      return;
    }
    
    try {
      setSceneError(null);
      setSceneLoading(true);
      const response = await connectMatrix({
        userId,
        displayName: userId,
        homeserver: 'https://matrix.daarion.city',
      });
      
      addMessage({
        author: 'agent',
        text: `Чудово! Matrix підключено 💬\n\nТвій Matrix ID: ${response.matrixUserId}`,
        scene: 'matrix',
      });
      
      setTimeout(() => {
        onComplete(true, {
          matrixUserId: response.matrixUserId,
          accessToken: response.accessToken,
          homeserver: response.homeserver,
        });
      }, 800);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Не вдалося підключити Matrix.';
      setSceneError(message);
      addMessage({
        author: 'agent',
        text: `${message}\n\nПродовжимо без Matrix — ти завжди зможеш підключити його пізніше.`,
        scene: 'matrix',
      });
      onComplete(true, {
        matrixUserId: `@${userId}:daarion.city`,
        accessToken: 'offline-token',
        homeserver: 'https://matrix.daarion.city',
      });
    } finally {
      setSceneLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6 animate-bounce">
          💬
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Matrix Protocol
        </h2>
        <p className="text-lg text-gray-600">
          Підключи інтеграцію з месенджерами
        </p>
      </div>
    </div>
  );
}

