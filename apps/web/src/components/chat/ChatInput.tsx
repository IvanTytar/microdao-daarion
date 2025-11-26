'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Smile, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled = false, placeholder = 'Напишіть повідомлення...' }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-white/10">
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <button
          type="button"
          disabled={disabled}
          className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Input field */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full px-4 py-3 pr-10 bg-slate-800/50 border border-white/10 rounded-2xl',
              'text-white placeholder-slate-500 resize-none',
              'focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200'
            )}
          />
          
          {/* Emoji button */}
          <button
            type="button"
            disabled={disabled}
            className="absolute right-3 bottom-3 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className={cn(
            'p-3 rounded-xl transition-all duration-200',
            message.trim() && !disabled
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40'
              : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
          )}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  )
}

