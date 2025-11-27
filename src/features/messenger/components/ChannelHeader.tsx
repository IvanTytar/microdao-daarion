import type { Channel } from '../types/messenger';

interface Props {
  channel: Channel;
  isConnected?: boolean;
}

export function ChannelHeader({ channel, isConnected }: Props) {
  return (
    <div className="border-b border-white/10 p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            {channel.visibility === 'public' && <span>#</span>}
            {channel.visibility === 'private' && <span>🔒</span>}
            {channel.name}
          </h2>
          {channel.topic && <p className="text-sm text-slate-400 mt-1">{channel.topic}</p>}
        </div>
        <div className="flex items-center gap-4">
          {isConnected !== undefined && (
            <div className="flex items-center gap-2">
              <div
                className={`
                  w-2 h-2 rounded-full
                  ${isConnected ? 'bg-green-500' : 'bg-red-500'}
                `}
              />
              <span className="text-sm text-slate-400">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
          )}
          <div className="text-sm text-slate-400">{channel.matrix_room_id}</div>
        </div>
      </div>
    </div>
  );
}




