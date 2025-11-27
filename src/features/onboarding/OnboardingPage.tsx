/**
 * OnboardingPage - New Agent-First Version
 * 
 * Агентський онбординг DAARION.city (6 сцен)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingState } from './hooks/useOnboardingState';
import { OnboardingChat } from './components/OnboardingChat';
import { OnboardingProgress } from './components/OnboardingProgress';
import { ArrivalScene } from './scenes/ArrivalScene';
import { PasskeyScene } from './scenes/PasskeyScene';
import { MatrixScene } from './scenes/MatrixScene';
import { WalletScene } from './scenes/WalletScene';
import { AvatarScene } from './scenes/AvatarScene';
import { PortalScene } from './scenes/PortalScene';
import type { AuthMethod } from './types/onboarding';

export function OnboardingPage() {
  const navigate = useNavigate();
  const {
    state,
    nextScene,
    prevScene,
    setUserData,
    setAuthData,
    setMatrixData,
    setWalletData,
    setAvatarData,
    addMessage,
    setError,
    setLoading,
    completeScene,
    reset,
    canGoBack,
    SCENES_ORDER,
  } = useOnboardingState();
  const [generatedUserId] = React.useState(() => `user-${Date.now()}`);
  const resolvedUserId = state.user.id || generatedUserId;
  
  // ============================================================================
  // Scene Handlers
  // ============================================================================
  
  const handleArrivalComplete = (name: string, locale: 'uk' | 'en') => {
    setUserData({ id: resolvedUserId, name, locale });
    completeScene('arrival');
    nextScene();
  };
  
  const handlePasskeyComplete = (
    method: AuthMethod,
    data?: { userId?: string; email?: string; passkeyId?: string }
  ) => {
    setAuthData({ method, ...data });
    if (data?.userId) {
      setUserData({ ...state.user, id: data.userId });
    }
    completeScene('passkey');
    nextScene();
  };
  
  const handleMatrixComplete = (enabled: boolean, data?: any) => {
    setMatrixData({ enabled, ...data });
    completeScene('matrix');
    nextScene();
  };
  
  const handleWalletComplete = (connected: boolean, data?: any) => {
    setWalletData({ connected, ...data });
    completeScene('wallet');
    nextScene();
  };
  
  const handleAvatarComplete = (created: boolean, data?: any) => {
    setAvatarData({ created, ...data });
    completeScene('avatar');
    nextScene();
  };
  
  const handlePortalComplete = (redirectUrl?: string) => {
    completeScene('portal');
    // Redirect to City Dashboard
    navigate(redirectUrl || '/city');
  };
  
  const handleCleanup = () => {
    // Очистити localStorage та reset state
    reset();
  };
  
  // ============================================================================
  // Chat Message Handler
  // ============================================================================
  
  const handleSendMessage = (text: string) => {
    addMessage({
      author: 'user',
      text,
      scene: state.currentScene,
    });
  };
  
  // ============================================================================
  // Render Current Scene
  // ============================================================================
  
  const renderScene = () => {
    switch (state.currentScene) {
      case 'arrival':
        return (
          <ArrivalScene
            onComplete={handleArrivalComplete}
            addMessage={addMessage}
          />
        );
      
      case 'passkey':
        return (
          <PasskeyScene
            onComplete={handlePasskeyComplete}
            addMessage={addMessage}
            setSceneLoading={(value) => setLoading('passkey', value)}
            setSceneError={(value) => setError('passkey', value)}
            user={state.user}
            error={state.errors.passkey}
            loading={state.loading.passkey}
          />
        );
      
      case 'matrix':
        return (
          <MatrixScene
            onComplete={handleMatrixComplete}
            addMessage={addMessage}
            setSceneLoading={(value) => setLoading('matrix', value)}
            setSceneError={(value) => setError('matrix', value)}
            userId={resolvedUserId}
          />
        );
      
      case 'wallet':
        return (
          <WalletScene
            onComplete={handleWalletComplete}
            addMessage={addMessage}
            setSceneLoading={(value) => setLoading('wallet', value)}
            setSceneError={(value) => setError('wallet', value)}
            userId={resolvedUserId}
          />
        );
      
      case 'avatar':
        return (
          <AvatarScene
            onComplete={handleAvatarComplete}
            addMessage={addMessage}
            setSceneLoading={(value) => setLoading('avatar', value)}
            setSceneError={(value) => setError('avatar', value)}
            userId={resolvedUserId}
          />
        );
      
      case 'portal':
        return (
          <PortalScene
            onComplete={handlePortalComplete}
            addMessage={addMessage}
            userName={state.user.name}
            userId={resolvedUserId}
            setSceneLoading={(value) => setLoading('portal', value)}
            setSceneError={(value) => setError('portal', value)}
            onCleanup={handleCleanup}
          />
        );
      
      default:
        return null;
    }
  };
  
  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Онбординг DAARION.city
              </h1>
              <p className="text-gray-600">
                Пройди 6 кроків і стань громадянином міста AI-агентів
              </p>
            </div>
            
            {canGoBack && (
              <button
                onClick={prevScene}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Назад
              </button>
            )}
          </div>
          
          {/* Progress */}
          <OnboardingProgress
            currentScene={state.currentScene}
            completedScenes={state.completedScenes}
            scenes={SCENES_ORDER}
          />
        </div>
        
        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Scene Content */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {renderScene()}
          </div>
          
          {/* Right: Chat */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="h-[600px]">
              <OnboardingChat
                messages={state.chatHistory}
                onSendMessage={handleSendMessage}
                loading={state.loading[state.currentScene]}
              />
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {state.errors[state.currentScene] && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <span className="text-xl">⚠️</span>
              <span className="font-medium">{state.errors[state.currentScene]}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

