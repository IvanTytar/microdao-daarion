'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Bot, Send, Loader2, Zap, Clock, CheckCircle2 } from 'lucide-react'
import { api, Agent, AgentInvokeResponse } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  meta?: {
    tokens_in?: number
    tokens_out?: number
    latency_ms?: number
  }
}

export default function AgentPage() {
  const params = useParams()
  const agentId = params.id as string
  
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [invoking, setInvoking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadAgent() {
      try {
        const data = await api.getAgent(agentId)
        setAgent(data)
      } catch (error) {
        console.error('Failed to load agent:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAgent()
  }, [agentId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleInvoke = async () => {
    if (!input.trim() || invoking) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setInvoking(true)

    try {
      const response: AgentInvokeResponse = await api.invokeAgent(agentId, userMessage.content)
      
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response.reply || 'Немає відповіді',
        timestamp: new Date(),
        meta: {
          tokens_in: response.tokens_in,
          tokens_out: response.tokens_out,
          latency_ms: response.latency_ms
        }
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `Помилка: ${error instanceof Error ? error.message : 'Невідома помилка'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setInvoking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Агент не знайдений</h2>
          <Link href="/agents" className="text-violet-400 hover:text-violet-300">
            Повернутися до списку
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-4 py-6 border-b border-white/5">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/agents"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад до агентів
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-600/30 flex items-center justify-center">
              <Bot className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
              <p className="text-slate-400">{agent.description || 'AI Agent'}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className={cn(
                'px-3 py-1 rounded-full text-sm',
                agent.is_active 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-slate-700/50 text-slate-400'
              )}>
                {agent.is_active ? 'Активний' : 'Неактивний'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="glass-panel h-[500px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Zap className="w-12 h-12 text-violet-400 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Почніть розмову з {agent.name}
                </h3>
                <p className="text-sm text-slate-400 max-w-sm">
                  Напишіть повідомлення нижче, щоб викликати агента та отримати відповідь.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' && 'flex-row-reverse'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      message.role === 'user'
                        ? 'bg-cyan-500/30'
                        : 'bg-violet-500/30'
                    )}>
                      {message.role === 'user' ? (
                        <span className="text-xs text-cyan-400">U</span>
                      ) : (
                        <Bot className="w-4 h-4 text-violet-400" />
                      )}
                    </div>
                    
                    <div className={cn(
                      'max-w-[80%]',
                      message.role === 'user' && 'text-right'
                    )}>
                      <div className={cn(
                        'inline-block px-4 py-2 rounded-2xl text-sm',
                        message.role === 'user'
                          ? 'bg-cyan-500/20 text-white rounded-tr-sm'
                          : 'bg-slate-800/50 text-slate-200 rounded-tl-sm'
                      )}>
                        {message.content}
                      </div>
                      
                      {message.meta && (
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          {message.meta.latency_ms && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {message.meta.latency_ms}ms
                            </span>
                          )}
                          {message.meta.tokens_out && (
                            <span>{message.meta.tokens_out} tokens</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleInvoke()
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Напишіть повідомлення для ${agent.name}...`}
                disabled={invoking}
                className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={invoking || !input.trim()}
                className={cn(
                  'px-4 py-3 rounded-xl transition-all',
                  input.trim() && !invoking
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                )}
              >
                {invoking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Agent Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Zap} label="Тип" value={agent.kind} />
          <StatCard icon={Bot} label="Модель" value={agent.model || 'N/A'} />
          <StatCard icon={CheckCircle2} label="Статус" value={agent.status} />
          <StatCard icon={Clock} label="Викликів" value={messages.filter(m => m.role === 'user').length.toString()} />
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="glass-panel p-4">
      <Icon className="w-5 h-5 text-violet-400 mb-2" />
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-sm font-medium text-white truncate">{value}</div>
    </div>
  )
}

