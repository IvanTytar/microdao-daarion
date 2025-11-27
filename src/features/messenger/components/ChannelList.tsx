import type { Channel } from '../types/messenger';

interface Props {
  channels: Channel[];
  selectedChannelId?: string;
  onSelectChannel: (channel: Channel) => void;
}

export function ChannelList({ channels, selectedChannelId, onSelectChannel }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {channels.map((channel) => {
        const isSelected = channel.id === selectedChannelId;
        return (
          <button
            key={channel.id}
            onClick={() => onSelectChannel(channel)}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
              ${
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white'
              }
            `}
          >
            <div className="flex-shrink-0">
              {channel.visibility === 'public' && <span className="text-lg">#</span>}
              {channel.visibility === 'private' && <span className="text-lg">🔒</span>}
              {channel.is_direct && <span className="text-lg">💬</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{channel.name}</div>
              {channel.description && (
                <div className="text-xs opacity-70 truncate">{channel.description}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}




