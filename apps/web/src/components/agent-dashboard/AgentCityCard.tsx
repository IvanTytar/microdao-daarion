'use client';

import Link from 'next/link';
import { CityPresence } from '@/lib/agent-dashboard';

interface AgentCityCardProps {
  cityPresence?: CityPresence;
}

export function AgentCityCard({ cityPresence }: AgentCityCardProps) {
  if (!cityPresence) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🏛️</span> City Presence
        </h3>
        <p className="text-white/50">No city presence configured</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>🏛️</span> City Presence
      </h3>
      
      <div className="space-y-3">
        {/* District */}
        {cityPresence.district && (
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-sm">District:</span>
            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-md text-sm">
              {cityPresence.district}
            </span>
          </div>
        )}
        
        {/* Primary Room */}
        {cityPresence.primary_room_slug && (
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-sm">Primary:</span>
            <Link 
              href={`/city/${cityPresence.primary_room_slug}`}
              className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-md text-sm hover:bg-cyan-500/30 transition-colors"
            >
              📍 {cityPresence.primary_room_slug}
            </Link>
          </div>
        )}
        
        {/* All Rooms */}
        {cityPresence.rooms && cityPresence.rooms.length > 0 && (
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Rooms</p>
            <div className="space-y-1">
              {cityPresence.rooms.map(room => (
                <Link 
                  key={room.room_id}
                  href={`/city/${room.slug}`}
                  className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <span className="text-white text-sm">{room.name}</span>
                  <span className="text-white/30 text-xs">{room.role}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

