/**
 * Перегляд окремої City Room з чатом
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCityRoom,
  sendCityRoomMessage,
  joinCityRoom,
  leaveCityRoom,
  type CityRoomDetail,
  type CityRoomMessage
} from '../../../api/cityRooms';
import { WebSocketClient } from '../../../lib/ws';
import { RoomBrandHeader } from '../../microdao/components/RoomBrandHeader';

export function CityRoomView() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<CityRoomDetail | null>(null);
  const [messages, setMessages] = useState<CityRoomMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    if (!roomId) return;

    loadRoom();
    joinRoom();

    // WebSocket connection
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/city/rooms/${roomId}`;
    const ws = new WebSocketClient({ url: wsUrl });
    
    ws.onMessage((data: any) => {
      if (data.event === 'city.room.message') {
        setMessages(prev => [...prev, data.message]);
      } else if (data.event === 'city.room.join') {
        console.log('User joined:', data.user_id);
      } else if (data.event === 'city.room.leave') {
        console.log('User left:', data.user_id);
      }
    });

    ws.connect();
    wsRef.current = ws;

    return () => {
      leaveRoom();
      ws.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadRoom = async () => {
    if (!roomId) return;
    
    setIsLoading(true);
    try {
      const data = await getCityRoom(roomId);
      setRoom(data);
      setMessages(data.messages);
    } catch (error) {
      console.error('Failed to load room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!roomId) return;
    try {
      await joinCityRoom(roomId);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const leaveRoom = async () => {
    if (!roomId) return;
    try {
      await leaveCityRoom(roomId);
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!roomId || !inputText.trim()) return;

    try {
      await sendCityRoomMessage(roomId, { text: inputText });
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Помилка відправки повідомлення');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isLoading) {
    return <div className="text-center py-12">Завантаження...</div>;
  }

  if (!room) {
    return <div className="text-center py-12">Кімната не знайдена</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <RoomBrandHeader
        name={room.name}
        description={room.description}
        bannerUrl={room.banner_url}
        logoUrl={room.logo_url}
        microdaoLogoUrl={room.microdao_logo_url}
        microdaoName={room.microdao_name}
        membersCount={room.members_online}
      >
        <button
          onClick={() => navigate('/city/rooms')}
          className="text-white/80 hover:text-white flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm hover:bg-black/30 transition-all"
        >
          ← Назад
        </button>
      </RoomBrandHeader>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-sm">{message.username}</span>
                <span className="text-xs text-gray-500">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-gray-800">{message.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Написати повідомлення..."
            className="flex-1 px-4 py-2 border rounded-lg resize-none"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            Надіслати
          </button>
        </div>
      </div>
    </div>
  );
}

