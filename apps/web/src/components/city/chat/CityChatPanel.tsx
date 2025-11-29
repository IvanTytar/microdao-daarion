'use client';

import { useRef, useEffect } from 'react';
import { MessageSquare, Wifi, WifiOff, Loader2, RefreshCw, AlertCircle, Users, LogIn } from 'lucide-react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/lib/websocket';

export type CityChatMode = 'embedded' | 'full';

export type ConnectionStatus = 'loading' | 'connecting' | 'online' | 'error' | 'unauthenticated';

export interface CityChatPanelProps {
  mode?: CityChatMode;
  roomName: string;
  status: ConnectionStatus;
  messages: ChatMessageType[];
  onlineCount: number;
  typingUsers: Set<string>;
  error?: string | null;
  showHeader?: boolean;
  hideTitle?: boolean;
  
  // Actions
  onSend: (message: string) => void;
  onTyping?: () => void;
  onRetry?: () => void;
  onLogin?: () => void;
  
  // Custom classes
  className?: string;
}

export function CityChatPanel({
  mode = 'embedded',
  roomName,
  status,
  messages,
  onlineCount,
  typingUsers,
  error,
  showHeader = true,
  hideTitle = false,
  onSend,
  onTyping,
  onRetry,
  onLogin,
  className
}: CityChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper to format user name from Matrix ID (if needed for typing indicator)
  function formatUserName(userId: string): string {
    return userId
      .split(':')[0]
      .replace('@daarion_', 'User ')
      .replace('@', '');
  }

  const isEmbedded = mode === 'embedded';
  const isFull = mode === 'full';

  return (
    <div className={cn(
      'flex flex-col bg-slate-900/50 overflow-hidden',
      // Embedded: tall on mobile (60vh), constrained on desktop
      isEmbedded && 'border border-white/10 rounded-2xl min-h-[60vh] md:min-h-[400px] md:max-h-[600px]',
      // Full: always full height
      isFull && 'h-full min-h-[60vh] w-full',
      className
    )}>
      {/* Header */}
      {showHeader && (
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-sm h-[60px]">
          <div className="flex items-center gap-3 overflow-hidden">
            {!hideTitle && (
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              {!hideTitle && (
                <span className="text-sm font-medium text-white leading-none truncate">
                  {roomName}
                </span>
              )}
              <div className={cn("flex items-center gap-2", !hideTitle && "mt-1")}>
                <span className={cn(
                  'text-xs flex items-center gap-1 flex-shrink-0',
                  status === 'online' ? 'text-emerald-400' : 'text-slate-500'
                )}>
                  {status === 'online' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Online
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                      Offline
                    </>
                  )}
                </span>
                {status === 'online' && (
                  <>
                    <span className="text-slate-600 text-[10px]">•</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                      <Users className="w-3 h-3" />
                      {onlineCount}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Status Badge / Login CTA */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {status === 'unauthenticated' && (
              <button 
                onClick={onLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-medium transition-colors"
              >
                <LogIn className="w-3 h-3" />
                Увійти
              </button>
            )}
            
            {status === 'loading' && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
              </div>
            )}
            
             {status === 'connecting' && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-amber-400">
                <Loader2 className="w-3 h-3 animate-spin" />
              </div>
            )}
            
            {status === 'error' && (
               <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-400" title={error || 'Error'}>
                <WifiOff className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message Bar */}
      {(status === 'error') && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
          <span className="text-xs text-red-400 truncate mr-2">{error || 'Помилка зʼєднання'}</span>
          {onRetry && (
            <button onClick={onRetry} className="text-xs text-red-400 underline hover:text-red-300 flex-shrink-0">
              Retry
            </button>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
            <div className="w-12 h-12 mb-3 rounded-full bg-slate-800/50 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm text-slate-400">
              {status === 'online' 
                ? 'Тут поки що тихо...' 
                : status === 'unauthenticated'
                  ? 'Потрібна авторизація'
                  : 'Завантаження чату...'
              }
            </p>
            {status === 'unauthenticated' && (
               <p className="text-xs text-slate-500 mt-1">Увійдіть, щоб бачити історію повідомлень</p>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwn={message.author_user_id === 'current_user' || (message as any).isUser} // Fallback check
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing Indicator */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-1.5 text-xs text-cyan-400/80 animate-pulse flex items-center gap-2 bg-slate-900/30">
          <div className="flex gap-1">
            <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>
            {typingUsers.size === 1 
              ? `${formatUserName(Array.from(typingUsers)[0])} друкує...`
              : 'Хтось друкує...'}
          </span>
        </div>
      )}

      {/* Input Area */}
      {status === 'online' ? (
        <ChatInput
          onSend={onSend}
          onTyping={onTyping}
          disabled={false}
          placeholder="Напишіть повідомлення..."
        />
      ) : (
        <div className="p-4 border-t border-white/10 bg-slate-900/30">
          {status === 'unauthenticated' ? (
             <button
              onClick={onLogin}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Увійти щоб почати спілкування
            </button>
          ) : (
            <div className="text-center text-xs text-slate-500 py-2">
              {status === 'loading' || status === 'connecting' ? 'Підключення...' : 'Чат недоступний'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
