import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeam } from '../api/teams';
import { getChannels, getChannelMessages, createMessage } from '../api/channels';
import { MessageSquare, Plus, Send, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { CreateMessageRequest } from '../types/api';

export function ChatPage() {
  const { teamId, channelId } = useParams<{ teamId: string; channelId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => getTeam(teamId!),
    enabled: !!teamId,
  });

  const { data: channelsData } = useQuery({
    queryKey: ['channels', teamId],
    queryFn: () => getChannels(teamId!),
    enabled: !!teamId,
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => getChannelMessages(channelId!),
    enabled: !!channelId,
  });

  const currentChannel = channelsData?.channels.find((c) => c.id === channelId);

  const sendMessageMutation = useMutation({
    mutationFn: (data: CreateMessageRequest) => createMessage(channelId!, data),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate({ content: messageText.trim() });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  if (messagesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const messages = messagesData?.messages || [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Team Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900 truncate">{team?.name || 'Завантаження...'}</h1>
          {team?.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{team.description}</p>
          )}
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase">Канали</h2>
            <button
              className="text-gray-400 hover:text-gray-600"
              title="Створити канал"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {channelsData?.channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => navigate(`/teams/${teamId}/channels/${channel.id}`)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors ${
                  channel.id === channelId
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{currentChannel?.name || 'Канал'}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {currentChannel?.type === 'public' ? 'Публічний канал' : 'Приватна кімната'}
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Повідомлень поки немає</p>
                <p className="text-sm text-gray-400 mt-1">Почніть розмову!</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                  {message.user?.name?.[0]?.toUpperCase() || message.user?.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {message.user?.name || message.user?.email || 'Анонім'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleTimeString('uk-UA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Написати повідомлення..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sendMessageMutation.isPending}
            />
            <button
              type="submit"
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

