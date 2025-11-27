/**
 * Presence Bar — Відображення онлайн користувачів
 */

import { useEffect } from 'react';
import { usePresenceStore } from '../../../store/presenceStore';

export function PresenceBar() {
  const { connect, disconnect, getOnlineUsers, getOnlineCount, isConnected } = usePresenceStore();

  useEffect(() => {
    // TODO: Отримати userId з auth store
    const userId = 'user-1'; // Mock
    connect(userId);

    return () => {
      disconnect();
    };
  }, []);

  const onlineUsers = getOnlineUsers();
  const onlineCount = getOnlineCount();

  return (
    <div className="bg-white border-b px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span className="text-sm font-medium">
              {onlineCount} онлайн
            </span>
          </div>
          
          {onlineUsers.length > 0 && (
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 10).map((user) => (
                <div
                  key={user.userId}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  title={user.userId}
                >
                  {user.userId.slice(0, 2).toUpperCase()}
                </div>
              ))}
              {onlineUsers.length > 10 && (
                <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-gray-700 text-xs font-bold">
                  +{onlineUsers.length - 10}
                </div>
              )}
            </div>
          )}
        </div>

        {!isConnected && (
          <span className="text-xs text-gray-500">Підключення...</span>
        )}
      </div>
    </div>
  );
}

