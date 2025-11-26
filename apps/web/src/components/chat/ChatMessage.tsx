'use client'

import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/lib/websocket'

interface ChatMessageProps {
  message: ChatMessageType
  isOwn?: boolean
}

export function ChatMessage({ message, isOwn = false }: ChatMessageProps) {
  const isAgent = !!message.author_agent_id
  const authorName = isAgent 
    ? message.author_agent_id?.replace('ag_', '') || 'Agent'
    : message.author_user_id?.replace('u_', '') || 'User'

  const time = new Date(message.created_at).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className={cn(
      'flex gap-3 px-4 py-2 hover:bg-white/5 transition-colors',
      isOwn && 'flex-row-reverse'
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isAgent 
          ? 'bg-gradient-to-br from-violet-500/30 to-purple-600/30' 
          : 'bg-gradient-to-br from-cyan-500/30 to-blue-600/30'
      )}>
        {isAgent ? (
          <Bot className="w-4 h-4 text-violet-400" />
        ) : (
          <User className="w-4 h-4 text-cyan-400" />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex-1 min-w-0', isOwn && 'text-right')}>
        <div className={cn(
          'flex items-baseline gap-2 mb-1',
          isOwn && 'flex-row-reverse'
        )}>
          <span className={cn(
            'text-sm font-medium',
            isAgent ? 'text-violet-400' : 'text-cyan-400'
          )}>
            {authorName}
          </span>
          <span className="text-xs text-slate-500">{time}</span>
        </div>
        
        <div className={cn(
          'inline-block max-w-[80%] px-3 py-2 rounded-2xl text-sm',
          isOwn 
            ? 'bg-cyan-500/20 text-white rounded-tr-sm' 
            : 'bg-slate-800/50 text-slate-200 rounded-tl-sm'
        )}>
          {message.body}
        </div>
      </div>
    </div>
  )
}

