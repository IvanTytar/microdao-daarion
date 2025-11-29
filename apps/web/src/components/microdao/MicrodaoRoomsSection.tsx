"use client";

import Link from "next/link";
import { MessageCircle, Home, Users, FlaskConical, Shield, Vote, Hash } from "lucide-react";
import { CityRoomSummary } from "@/lib/types/microdao";
import { CityChatWidget } from "@/components/city/CityChatWidget";

interface MicrodaoRoomsSectionProps {
  rooms: CityRoomSummary[];
  primaryRoomSlug?: string | null;
  showAllChats?: boolean; // If true, show chat widgets for all rooms
}

const ROLE_LABELS: Record<string, string> = {
  primary: "Основна кімната",
  lobby: "Лобі",
  team: "Командна кімната",
  research: "Дослідницька лабораторія",
  security: "Безпека",
  governance: "Управління",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  primary: <Home className="w-4 h-4" />,
  lobby: <MessageCircle className="w-4 h-4" />,
  team: <Users className="w-4 h-4" />,
  research: <FlaskConical className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  governance: <Vote className="w-4 h-4" />,
};

const ROLE_COLORS: Record<string, string> = {
  primary: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  lobby: "text-green-400 bg-green-500/10 border-green-500/30",
  team: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  research: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  security: "text-red-400 bg-red-500/10 border-red-500/30",
  governance: "text-amber-400 bg-amber-500/10 border-amber-500/30",
};

export function MicrodaoRoomsSection({ 
  rooms, 
  primaryRoomSlug,
  showAllChats = false 
}: MicrodaoRoomsSectionProps) {
  if (!rooms || rooms.length === 0) {
    return (
      <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-cyan-400" />
          Кімнати MicroDAO
        </h2>
        <p className="text-sm text-slate-500">
          Для цього MicroDAO ще не налаштовані кімнати міста.
        </p>
      </section>
    );
  }

  // Find primary room
  const primary = rooms.find(r => r.slug === primaryRoomSlug) 
    ?? rooms.find(r => r.room_role === 'primary') 
    ?? rooms[0];
  
  const others = rooms.filter(r => r.id !== primary.id);

  return (
    <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-cyan-400" />
        Кімнати MicroDAO
        <span className="text-sm font-normal text-slate-500">({rooms.length})</span>
      </h2>

      {/* Primary room with inline chat */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${ROLE_COLORS[primary.room_role || 'primary'] || ROLE_COLORS.primary}`}>
              {ROLE_ICONS[primary.room_role || 'primary'] || <Hash className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-base font-medium text-slate-100">{primary.name}</div>
              <div className="text-xs text-slate-500">
                {ROLE_LABELS[primary.room_role || 'primary'] || primary.room_role || 'Кімната'}
              </div>
            </div>
          </div>
          <Link
            href={`/city/${primary.slug}`}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Відкрити окремо →
          </Link>
        </div>

        <CityChatWidget roomSlug={primary.slug} />
      </div>

      {/* Other rooms */}
      {others.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-slate-400 font-medium">Інші кімнати</div>
          <div className="grid gap-3 md:grid-cols-2">
            {others.map(room => (
              <div
                key={room.id}
                className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${ROLE_COLORS[room.room_role || ''] || 'text-slate-400 bg-slate-500/10 border-slate-500/30'}`}>
                      {ROLE_ICONS[room.room_role || ''] || <Hash className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{room.name}</div>
                      <div className="text-xs text-slate-500">
                        {ROLE_LABELS[room.room_role || ''] || room.room_role || 'Кімната'}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/city/${room.slug}`}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Відкрити →
                  </Link>
                </div>
                
                {showAllChats && (
                  <div className="mt-2">
                    <CityChatWidget roomSlug={room.slug} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

