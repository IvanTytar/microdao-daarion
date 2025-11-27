/**
 * PasskeyScene Component
 * 
 * Сцена 2: Налаштування доступу (Passkey / Email / Wallet)
 */

import { useEffect } from 'react';
import type { OnboardingMessage, AuthMethod, OnboardingUserData } from '../types/onboarding';
import { registerPasskey } from '../../../api/onboarding';
import { loginEmail } from '../../../api/auth';
import { ApiError } from '../../../api/client';
import { usePasskeyRegister } from '../../auth/hooks/usePasskeyRegister';
import { usePasskeyLogin } from '../../auth/hooks/usePasskeyLogin';

interface PasskeySceneProps {
  onComplete: (method: AuthMethod, data?: { userId?: string; email?: string; passkeyId?: string }) => void;
  addMessage: (message: Omit<OnboardingMessage, 'id' | 'timestamp'>) => void;
  setSceneLoading: (loading: boolean) => void;
  setSceneError: (error: string | null) => void;
  user: OnboardingUserData;
  error: string | null;
  loading: boolean;
}

export function PasskeyScene({ onComplete, addMessage, setSceneLoading, setSceneError, user, error, loading }: PasskeySceneProps) {
  const { register: registerWebAuthnPasskey } = usePasskeyRegister();
  const { login: loginWebAuthnPasskey } = usePasskeyLogin();
  
  useEffect(() => {
    setTimeout(() => {
      addMessage({
        author: 'agent',
        text: '🔐 Час налаштувати твій доступ до міста!\n\nОбери один з методів входу:\n\n1️⃣ Passkey (біометрія) — найбезпечніше\n2️⃣ Email (magic link) — просто і швидко\n3️⃣ Wallet (Web3) — для крипто-ентузіастів',
        scene: 'passkey',
        actions: [
          {
            id: 'auth-passkey',
            type: 'button',
            label: '🔐 Passkey (Рекомендовано)',
            value: 'passkey',
            onClick: () => !loading && handleAuthMethod('passkey'),
          },
          {
            id: 'auth-email',
            type: 'button',
            label: '✉️ Email Magic Link',
            value: 'email',
            onClick: () => !loading && handleAuthMethod('email'),
          },
          {
            id: 'auth-wallet',
            type: 'button',
            label: '💰 Web3 Wallet',
            value: 'wallet',
            onClick: () => !loading && handleAuthMethod('wallet'),
          },
        ],
      });
    }, 500);
  }, [addMessage]);
  
  const handleAuthMethod = async (method: AuthMethod) => {
    setSceneError(null);
    addMessage({
      author: 'user',
      text: method === 'passkey' ? '🔐 Passkey' : method === 'email' ? '✉️ Email' : '💰 Wallet',
      scene: 'passkey',
    });
    
    try {
      setSceneLoading(true);
      
      if (method === 'passkey') {
        // Use WebAuthn Passkey (Phase 4.5)
        const email = `${user.name?.toLowerCase().replace(/\s+/g, '')}@daarion.city`;
        
        try {
          await registerWebAuthnPasskey(email, user.name, user.name);
          
          addMessage({
            author: 'agent',
            text: '🎉 Passkey створено!\n\nТвій доступ захищено біометрією. Тепер ти можеш входити одним дотиком.\n\n✅ Доступ налаштовано!',
            scene: 'passkey',
          });
          
          setTimeout(() => {
            onComplete('passkey', { email, userId: user.id });
          }, 1000);
        } catch (err) {
          throw new Error('Failed to create passkey. Please try again.');
        }
        return;
      }
      
      if (method === 'email') {
        const email = window.prompt('Введи email для magic link:', '');
        if (!email) {
          setSceneError('Будь ласка, введи email, щоб продовжити.');
          return;
        }
        await loginEmail({ email });
        addMessage({
          author: 'agent',
          text: `Надсилаю magic link на ${email}. Перевір пошту!\n\n✅ Доступ налаштовано!`,
          scene: 'passkey',
        });
        setTimeout(() => {
          onComplete('email', { email });
        }, 1000);
        return;
      }
      
      addMessage({
        author: 'agent',
        text: 'Відмінно! Налаштуємо Web3-доступ на наступному кроці.',
        scene: 'passkey',
      });
      setTimeout(() => {
        onComplete('wallet');
      }, 800);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Сталася помилка під час налаштування доступу.';
      setSceneError(message);
      addMessage({
        author: 'agent',
        text: `${message}\n\nПродовжимо в локальному режимі.`,
        scene: 'passkey',
      });
      onComplete(method);
    } finally {
      setSceneLoading(false);
    }
  };
  
  const handleRetry = () => {
    setSceneError(null);
    addMessage({
      author: 'agent',
      text: '🔄 Добре, спробуймо ще раз. Обери метод входу:',
      scene: 'passkey',
      actions: [
        {
          id: 'auth-passkey-retry',
          type: 'button',
          label: '🔐 Passkey',
          value: 'passkey',
          onClick: () => !loading && handleAuthMethod('passkey'),
        },
        {
          id: 'auth-email-retry',
          type: 'button',
          label: '✉️ Email',
          value: 'email',
          onClick: () => !loading && handleAuthMethod('email'),
        },
        {
          id: 'auth-wallet-retry',
          type: 'button',
          label: '💰 Wallet',
          value: 'wallet',
          onClick: () => !loading && handleAuthMethod('wallet'),
        },
      ],
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
      {/* Content */}
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6 animate-pulse">
          🔐
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Налаштування доступу
        </h2>
        <p className="text-lg text-gray-600">
          {loading ? 'Обробка...' : 'Обери зручний для тебе спосіб входу'}
        </p>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              🔄 Спробувати знову
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

