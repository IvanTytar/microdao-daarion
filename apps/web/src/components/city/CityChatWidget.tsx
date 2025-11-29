'use client';

import { useRouter } from 'next/navigation';
import { CityChatPanel, CityChatMode } from './chat/CityChatPanel';
import { useMatrixChat } from '@/hooks/useMatrixChat';
import type { ChatMessage as MatrixChatMessage } from '@/lib/matrix-client';

interface CityChatWidgetProps {
  roomSlug: string;
  mode?: CityChatMode;
  showHeader?: boolean;
  hideTitle?: boolean;
  className?: string;
  // Legacy props support
  title?: string;
  compact?: boolean;
}

/**
 * Віджет чату для City/MicroDAO.
 * Використовує useMatrixChat для логіки та CityChatPanel для відображення.
 */
export function CityChatWidget({ 
  roomSlug, 
  mode = 'embedded', 
  showHeader = true,
  hideTitle = false,
  className,
  title,
  compact
}: CityChatWidgetProps) {
  const router = useRouter();
  const { 
    messages, 
    status, 
    error, 
    roomName, 
    onlineCount, 
    typingUsers, 
    sendMessage, 
    handleTyping, 
    retry 
  } = useMatrixChat(roomSlug);

  // Handle legacy props
  const effectiveMode = compact ? 'embedded' : mode;
  
  // Map Matrix messages to ChatMessage format expected by UI
  const mappedMessages = messages.map((msg: MatrixChatMessage) => ({
    id: msg.id,
    room_id: '', 
    author_user_id: msg.isUser ? 'current_user' : msg.senderId,
    author_agent_id: null,
    body: msg.text,
    created_at: msg.timestamp.toISOString(),
    isUser: msg.isUser
  }));

  if (!roomSlug) {
    return (
      <div className="text-sm text-white/60 p-4 border border-white/10 rounded-xl bg-slate-900/50">
        Кімната чату не налаштована.
      </div>
    );
  }

  return (
    <CityChatPanel
      mode={effectiveMode}
      roomName={title || roomName || 'Chat'}
      status={status}
      messages={mappedMessages}
      onlineCount={onlineCount}
      typingUsers={typingUsers}
      error={error}
      showHeader={showHeader}
      hideTitle={hideTitle}
      onSend={sendMessage}
      onTyping={handleTyping}
      onRetry={retry}
      onLogin={() => router.push('/login')}
      className={className}
    />
  );
}
