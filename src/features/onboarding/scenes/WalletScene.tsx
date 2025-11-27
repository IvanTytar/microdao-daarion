/**
 * WalletScene Component
 * 
 * Сцена 4: Підключення Web3 гаманця
 */

import { useEffect, useState } from 'react';
import type { OnboardingMessage, WalletType, ChainId } from '../types/onboarding';
import { connectWalletApi } from '../../../api/onboarding';
import { ApiError } from '../../../api/client';

interface WalletSceneProps {
  onComplete: (connected: boolean, data?: any) => void;
  addMessage: (message: Omit<OnboardingMessage, 'id' | 'timestamp'>) => void;
  setSceneLoading: (loading: boolean) => void;
  setSceneError: (error: string | null) => void;
  userId: string;
}

const walletOptions: Record<WalletType, { label: string; chainId: ChainId }> = {
  ton: { label: 'TON', chainId: 'ton-mainnet' },
  ethereum: { label: 'Ethereum', chainId: 'ethereum-mainnet' },
  solana: { label: 'Solana', chainId: 'solana-mainnet' },
};

export function WalletScene({ onComplete, addMessage, setSceneLoading, setSceneError, userId }: WalletSceneProps) {
  const [selectedWallet, setSelectedWallet] = useState<WalletType>('ton');
  useEffect(() => {
    setTimeout(() => {
      addMessage({
        author: 'agent',
        text: '💰 Підключи гаманець!\n\nГаманець потрібен для:\n\n💎 Отримання DAAR токенів\n🎁 Участі в Gift Economy\n🏛️ Голосування в DAO\n\nПідтримуються мережі: TON, Ethereum, Solana',
        scene: 'wallet',
        actions: [
          {
            id: 'wallet-connect',
            type: 'button',
            label: '💰 Підключити гаманець',
            value: 'connect',
            onClick: () => handleWalletConnect(),
          },
          {
            id: 'wallet-skip',
            type: 'button',
            label: 'Пропустити',
            value: 'skip',
            onClick: () => handleSkip(),
          },
        ],
      });
    }, 500);
  }, [addMessage]);
  
  const randomBytes = (length: number) => {
    const bytes = new Uint8Array(length);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return bytes;
  };
  
  const generateAddress = (wallet: WalletType) => {
    if (wallet === 'ethereum') {
      return `0x${Array.from(randomBytes(20))
        .map((val) => val.toString(16).padStart(2, '0'))
        .join('')}`;
    }
    if (wallet === 'solana') {
      return `So${Math.random().toString(36).slice(2, 34)}`;
    }
    return `ton:${Math.random().toString(36).slice(2, 12)}`;
  };
  
  const handleWalletConnect = async () => {
    // Скидаємо помилку перед новою спробою
    setSceneError(null);
    
    addMessage({
      author: 'user',
      text: `💰 Підключити ${walletOptions[selectedWallet].label} гаманець`,
      scene: 'wallet',
    });
    
    try {
      setSceneLoading(true);
      const address = generateAddress(selectedWallet);
      const response = await connectWalletApi({
        userId,
        walletType: selectedWallet,
        chainId: walletOptions[selectedWallet].chainId,
        address,
      });
      
      addMessage({
        author: 'agent',
        text: `✅ Гаманець підключено!\nАдреса: ${response.address}`,
        scene: 'wallet',
      });
      
      setTimeout(() => {
        onComplete(true, {
          type: selectedWallet,
          address: response.address,
          balance: response.balance,
        });
      }, 800);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Не вдалося підключити гаманець.';
      setSceneError(message);
      addMessage({
        author: 'agent',
        text: `${message}\n\nМожеш спробувати пізніше у налаштуваннях.`,
        scene: 'wallet',
      });
      onComplete(false);
    } finally {
      setSceneLoading(false);
    }
  };
  
  const handleSkip = () => {
    // Скидаємо помилку при skip
    setSceneError(null);
    
    addMessage({
      author: 'user',
      text: 'Пропустити',
      scene: 'wallet',
    });
    
    setTimeout(() => {
      addMessage({
        author: 'agent',
        text: 'Без проблем! Ти зможеш підключити гаманець пізніше.',
        scene: 'wallet',
      });
      
      setTimeout(() => {
        onComplete(false);
      }, 1000);
    }, 500);
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6 animate-pulse">
          💰
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Web3 Wallet
        </h2>
        <p className="text-lg text-gray-600 mb-4">
          Підключи гаманець для роботи з токенами
        </p>
        <div className="flex gap-2 justify-center mb-4">
          {Object.entries(walletOptions).map(([wallet, info]) => (
            <button
              key={wallet}
              onClick={() => setSelectedWallet(wallet as WalletType)}
              className={`px-3 py-2 rounded-lg border ${
                selectedWallet === wallet
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {info.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

