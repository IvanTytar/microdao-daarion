import { useState, useEffect, useRef } from 'react';
import {
  getCityRoom,
  sendCityRoomMessage,
  joinCityRoom,
  leaveCityRoom,
  type CityRoomDetail,
  type CityRoomMessage
} from '@/api/cityRooms';
import { WebSocketClient } from '@/lib/ws';

interface AgentChatWidgetProps {
  roomId: string;
  roomName?: string;
}

export function AgentChatWidget({ roomId, roomName }: AgentChatWidgetProps) {
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
    try {
      await joinCityRoom(roomId);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const leaveRoom = async () => {
    try {
      await leaveCityRoom(roomId);
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      await sendCityRoomMessage(roomId, { text: inputText });
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
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
    return <div className="text-center py-8 text-gray-500">Connecting to chat...</div>;
  }

  return (
    <div className="flex flex-col h-[500px] bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">{room?.name || roomName || 'Agent Chat'}</h3>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Live
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-900">{message.username}</span>
                <span className="text-xs text-gray-400">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg text-gray-800 text-sm">
                {message.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-gray-50 rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 text-sm font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

