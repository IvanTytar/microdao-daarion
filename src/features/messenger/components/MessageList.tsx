import type { Message } from '../types/messenger';

interface Props {
  messages: Message[];
  loading?: boolean;
}

export function MessageList({ messages, loading }: Props) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400">Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400">No messages yet. Start the conversation!</div>
      </div>
    );
  }

  // Reverse to show oldest first (since API returns newest first)
  const orderedMessages = [...messages].reverse();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {orderedMessages.map((message) => {
        const isAgent = message.sender_type === 'agent';
        return (
          <div key={message.id} className="flex items-start gap-3">
            <div
              className={`
                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg
                ${isAgent ? 'bg-purple-600' : 'bg-indigo-600'}
              `}
            >
              {isAgent ? '🤖' : '👤'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-medium text-white">{message.sender_id}</span>
                <span className="text-xs text-slate-500">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-slate-200 whitespace-pre-wrap break-words">
                {message.content_preview}
              </div>
              {message.edited_at && (
                <div className="text-xs text-slate-500 mt-1">(edited)</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}





