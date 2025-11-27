/**
 * ArrivalScene Component
 * 
 * Сцена 1: Прибуття до DAARION.city
 */

import React, { useEffect } from 'react';
import type { OnboardingMessage } from '../types/onboarding';

interface ArrivalSceneProps {
  onComplete: (name: string, locale: 'uk' | 'en') => void;
  addMessage: (message: Omit<OnboardingMessage, 'id' | 'timestamp'>) => void;
}

export function ArrivalScene({ onComplete, addMessage }: ArrivalSceneProps) {
  const [step, setStep] = React.useState<'greeting' | 'name' | 'locale'>('greeting');
  const [userName, setUserName] = React.useState('');
  
  // Greeting при завантаженні
  useEffect(() => {
    setTimeout(() => {
      addMessage({
        author: 'agent',
        text: '🚀 Привіт! Вітаю тебе у DAARION.city!\n\nЯ — твій провідник по цьому дивовижному місту AI-агентів та автономних спільнот.\n\nЗараз ми разом пройдемо короткий онбординг, і ти станеш громадянином цифрового міста майбутнього!\n\nЯк до тебе звертатися?',
        scene: 'arrival',
      });
      setStep('name');
    }, 500);
  }, [addMessage]);
  
  const handleNameSubmit = (name: string) => {
    if (!name.trim()) return;
    
    setUserName(name.trim());
    
    // Додаємо повідомлення користувача
    addMessage({
      author: 'user',
      text: name.trim(),
      scene: 'arrival',
    });
    
    // Відповідь агента
    setTimeout(() => {
      addMessage({
        author: 'agent',
        text: `Приємно познайомитися, ${name.trim()}! 👋\n\nЯкою мовою тобі зручніше спілкуватися?`,
        scene: 'arrival',
        actions: [
          {
            id: 'locale-uk',
            type: 'button',
            label: '🇺🇦 Українська',
            value: 'uk',
            onClick: () => handleLocaleSelect('uk'),
          },
          {
            id: 'locale-en',
            type: 'button',
            label: '🇬🇧 English',
            value: 'en',
            onClick: () => handleLocaleSelect('en'),
          },
        ],
      });
      setStep('locale');
    }, 800);
  };
  
  const handleLocaleSelect = (locale: 'uk' | 'en') => {
    // Додаємо повідомлення користувача
    addMessage({
      author: 'user',
      text: locale === 'uk' ? '🇺🇦 Українська' : '🇬🇧 English',
      scene: 'arrival',
    });
    
    // Відповідь агента
    setTimeout(() => {
      const message = locale === 'uk'
        ? `Чудово! Продовжимо українською 🇺🇦\n\nТепер налаштуємо твій доступ до міста!`
        : `Great! Let's continue in English 🇬🇧\n\nNow let's set up your city access!`;
      
      addMessage({
        author: 'agent',
        text: message,
        scene: 'arrival',
      });
      
      // Завершуємо сцену через 1.5 секунди
      setTimeout(() => {
        onComplete(userName, locale);
      }, 1500);
    }, 500);
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 animate-gradient" />
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-float-delayed" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl">
        {step === 'greeting' && (
          <div className="animate-fadeIn">
            {/* Welcome Animation */}
            <div className="text-8xl mb-6 animate-bounce-slow">
              🌟
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Ласкаво просимо до DAARION.city
            </h1>
            <p className="text-xl text-gray-600">
              Місто AI-агентів і автономних спільнот
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

