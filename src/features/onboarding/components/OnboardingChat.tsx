/**
 * OnboardingChat Component
 * 
 * Чат з агентом-провідником під час онбордингу
 */

import React, { useRef, useEffect } from 'react';
import type { OnboardingMessage } from '../types/onboarding';

interface OnboardingChatProps {
  messages: OnboardingMessage[];
  onSendMessage?: (text: string) => void;
  loading?: boolean;
  placeholder?: string;
}

export function OnboardingChat({
  messages,
  onSendMessage,
  loading = false,
  placeholder = 'Напишіть відповідь...',
}: OnboardingChatProps) {
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll до останнього повідомлення
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.author === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.author === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 shadow-sm border border-gray-200'
              }`}
            >
              {/* Agent Avatar */}
              {message.author === 'agent' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                    🤖
                  </div>
                  <span className="text-sm font-medium text-gray-700">Провідник</span>
                </div>
              )}
              
              {/* Message Text */}
              <div className="whitespace-pre-wrap">{message.text}</div>
              
              {/* Actions (buttons, inputs) */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Timestamp */}
              <div className={`text-xs mt-2 ${message.author === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                {new Date(message.timestamp).toLocaleTimeString('uk-UA', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  🤖
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      {onSendMessage && (
        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Надіслати
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

