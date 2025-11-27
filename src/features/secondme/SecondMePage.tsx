/**
 * Second Me Page — Персональний агент користувача
 */

import { useState, useEffect, useRef } from 'react';
import {
  invokeSecondMe,
  getSecondMeHistory,
  getSecondMeProfile,
  clearSecondMeHistory,
  type SecondMeMessage,
  type SecondMeProfile
} from '../../api/secondme';

export function SecondMePage() {
  const [profile, setProfile] = useState<SecondMeProfile | null>(null);
  const [history, setHistory] = useState<SecondMeMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProfile();
    loadHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, currentResponse]);

  const loadProfile = async () => {
    try {
      const data = await getSecondMeProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await getSecondMeHistory();
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleInvoke = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setCurrentResponse(null);

    try {
      const result = await invokeSecondMe({ prompt });
      
      // Додати до історії
      const newMessage: SecondMeMessage = {
        id: Date.now().toString(),
        prompt,
        response: result.response,
        created_at: new Date().toISOString(),
      };
      
      setHistory(prev => [...prev, newMessage]);
      setCurrentResponse(result.response);
      setPrompt('');
      
      // Оновити профіль
      loadProfile();
    } catch (error) {
      console.error('Failed to invoke SecondMe:', error);
      alert('Помилка виклику Second Me');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Очистити всю історію розмов з Second Me?')) return;

    try {
      await clearSecondMeHistory();
      setHistory([]);
      setCurrentResponse(null);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInvoke();
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Second Me</h1>
            <p className="text-blue-100">Твій персональний цифровий двійник</p>
          </div>
          {profile && (
            <div className="text-right">
              <div className="text-2xl font-bold">{profile.total_interactions}</div>
              <div className="text-sm text-blue-100">взаємодій</div>
            </div>
          )}
        </div>
      </div>

      {/* Chat History */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 max-h-[500px] overflow-y-auto">
        {history.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">👋 Привіт! Я — твій Second Me.</p>
            <p className="text-sm">Запитай мене про що завгодно.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((message) => (
              <div key={message.id} className="space-y-3">
                {/* User prompt */}
                <div className="flex justify-end">
                  <div className="bg-blue-100 text-blue-900 px-4 py-3 rounded-lg max-w-[80%]">
                    <p className="text-sm font-medium mb-1">Ви:</p>
                    <p>{message.prompt}</p>
                  </div>
                </div>
                
                {/* Agent response */}
                <div className="flex justify-start">
                  <div className="bg-purple-100 text-purple-900 px-4 py-3 rounded-lg max-w-[80%]">
                    <p className="text-sm font-medium mb-1">Second Me:</p>
                    <p>{message.response}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Current response (loading) */}
            {currentResponse && (
              <div className="flex justify-start">
                <div className="bg-purple-100 text-purple-900 px-4 py-3 rounded-lg max-w-[80%] animate-pulse">
                  <p className="text-sm font-medium mb-1">Second Me:</p>
                  <p>{currentResponse}</p>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Запитай щось у свого Second Me..."
            className="flex-1 px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={3}
            disabled={isLoading}
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={handleInvoke}
              disabled={!prompt.trim() || isLoading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Думаю...' : 'Запитати'}
            </button>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                disabled={isLoading}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                Очистити
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Second Me — це твій персональний агент, який пам'ятає останні 5 взаємодій.</p>
        <p>Він допоможе тобі з порадами, ідеями та розмовами про DAARION City.</p>
      </div>
    </div>
  );
}

