import { useState, useCallback, useEffect } from 'react';
import type { Channel } from './types/messenger';
import { useChannels } from './hooks/useChannels';
import { useMessages } from './hooks/useMessages';
import { useMessagingWebSocket } from './hooks/useMessagingWebSocket';
import { ChannelList } from './components/ChannelList';
import { ChannelHeader } from './components/ChannelHeader';
import { MessageList } from './components/MessageList';
import { MessageComposer } from './components/MessageComposer';

export function MessengerPage() {
  const microdaoId = 'microdao:daarion'; // TODO: get from context
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  const { channels, loading: channelsLoading, error: channelsError } = useChannels(microdaoId);
  const {
    messages: staticMessages,
    loading: messagesLoading,
    error: messagesError,
    send,
  } = useMessages(selectedChannel?.id || '');
  const {
    messages: liveMessages,
    isConnected,
    error: wsError,
  } = useMessagingWebSocket(selectedChannel?.id || '');

  // Auto-select first channel
  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0]);
    }
  }, [channels, selectedChannel]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      await send({ text });
    },
    [send]
  );

  // Merge static + live messages (live messages are prepended)
  const allMessages = selectedChannel
    ? [...liveMessages, ...staticMessages]
    : [];

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex">
      {/* Sidebar */}
      <div className="w-80 border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-2xl font-bold text-white">Messenger</h1>
          <p className="text-sm text-slate-400 mt-1">{microdaoId}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {channelsLoading && (
            <div className="text-slate-400 text-center">Loading channels...</div>
          )}
          {channelsError && (
            <div className="text-red-400 text-center">
              Error: {channelsError.message}
            </div>
          )}
          {!channelsLoading && !channelsError && (
            <ChannelList
              channels={channels}
              selectedChannelId={selectedChannel?.id}
              onSelectChannel={setSelectedChannel}
            />
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            onClick={() => {
              // TODO: implement create channel modal
              alert('Create channel feature coming soon!');
            }}
          >
            + New Channel
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {!selectedChannel && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <div className="text-xl text-slate-400">Select a channel to start messaging</div>
            </div>
          </div>
        )}

        {selectedChannel && (
          <>
            <ChannelHeader channel={selectedChannel} isConnected={isConnected} />

            {messagesError && (
              <div className="p-4 bg-red-900/20 border-l-4 border-red-500 text-red-200">
                Error loading messages: {messagesError.message}
              </div>
            )}

            {wsError && (
              <div className="p-4 bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-200">
                WebSocket error: {wsError.message}
              </div>
            )}

            <MessageList messages={allMessages} loading={messagesLoading} />

            <MessageComposer onSend={handleSendMessage} />
          </>
        )}
      </div>
    </div>
  );
}





