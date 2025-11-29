"use client";

import Link from "next/link";
import { MessageCircle, Home, Users, FlaskConical, Shield, Gavel, Hash, Users2, Bot, PlusCircle } from "lucide-react";
import { CityRoomSummary } from "@/lib/types/microdao";
import { CityChatWidget } from "@/components/city/CityChatWidget";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface MicrodaoRoomsSectionProps {
  rooms: CityRoomSummary[];
  primaryRoomSlug?: string | null;
  showAllChats?: boolean;
  canManage?: boolean;
  onEnsureOrchestratorRoom?: () => Promise<void>;
}

const ROLE_META: Record<string, { label: string; chipClass: string; icon: React.ReactNode }> = {
  primary: {
    label: "Primary / Lobby",
    chipClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    icon: <Home className="w-3.5 h-3.5" />,
  },
  lobby: {
    label: "Lobby",
    chipClass: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    icon: <MessageCircle className="w-3.5 h-3.5" />,
  },
  team: {
    label: "Team",
    chipClass: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    icon: <Users2 className="w-3.5 h-3.5" />,
  },
  research: {
    label: "Research",
    chipClass: "bg-violet-500/10 text-violet-300 border-violet-500/30",
    icon: <FlaskConical className="w-3.5 h-3.5" />,
  },
  security: {
    label: "Security",
    chipClass: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    icon: <Shield className="w-3.5 h-3.5" />,
  },
  governance: {
    label: "Governance",
    chipClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    icon: <Gavel className="w-3.5 h-3.5" />,
  },
  orchestrator_team: {
    label: "Orchestrator Team",
    chipClass: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30",
    icon: <Bot className="w-3.5 h-3.5" />,
  },
};

export function MicrodaoRoomsSection({ 
  rooms, 
  primaryRoomSlug,
  showAllChats = false,
  canManage = false,
  onEnsureOrchestratorRoom
}: MicrodaoRoomsSectionProps) {
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  const handleCreateTeam = async () => {
    if (!onEnsureOrchestratorRoom) return;
    setIsCreatingTeam(true);
    try {
      await onEnsureOrchestratorRoom();
    } catch (e) {
      console.error("Failed to create team room", e);
    } finally {
      setIsCreatingTeam(false);
    }
  };

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

  // Find special rooms
  const teamRoom = rooms.find(r => r.room_role === 'orchestrator_team');
  
  // Filter out team room from general list if we show it separately
  const generalRooms = rooms.filter(r => r.room_role !== 'orchestrator_team');

  // Find primary room
  const primary = generalRooms.find(r => r.slug === primaryRoomSlug) 
    ?? generalRooms.find(r => r.room_role === 'primary') 
    ?? generalRooms[0];
  
  // Others (excluding primary and team room)
  const others = generalRooms.filter(r => r.id !== primary?.id);

  // Group by role for mini-map (include all rooms for stats)
  const byRole = rooms.reduce((acc, r) => {
    const role = r.room_role || 'other';
    if (!acc[role]) acc[role] = [];
    acc[role].push(r);
    return acc;
  }, {} as Record<string, CityRoomSummary[]>);

  // Get meta for primary room
  const primaryMeta = primary?.room_role ? ROLE_META[primary.room_role] : undefined;

  return (
    <section className="space-y-6">
      
      {/* Orchestrator Team Chat Section */}
      {(teamRoom || canManage) && (
        <div className="bg-fuchsia-900/10 border border-fuchsia-500/20 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-fuchsia-200 flex items-center gap-2">
              <Bot className="w-4 h-4 text-fuchsia-400" />
              Orchestrator Team Chat
            </h3>
            {teamRoom && (
              <span className="text-[10px] uppercase tracking-wider text-fuchsia-300 bg-fuchsia-500/10 px-2 py-0.5 rounded-full border border-fuchsia-500/20">
                Team Room
              </span>
            )}
          </div>

          {teamRoom ? (
            <CityChatWidget roomSlug={teamRoom.slug} hideTitle className="border-fuchsia-500/20" />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 bg-fuchsia-950/30 rounded-lg border border-dashed border-fuchsia-500/30">
              <Bot className="w-8 h-8 text-fuchsia-500/50" />
              <div>
                <p className="text-fuchsia-200 font-medium">Командний чат оркестратора</p>
                <p className="text-sm text-fuchsia-400/70 max-w-md mx-auto mt-1">
                  Створіть закриту кімнату для команди агентів оркестратора (CrewAI integration).
                </p>
              </div>
              <Button 
                onClick={handleCreateTeam} 
                disabled={isCreatingTeam}
                variant="outline" 
                size="sm"
                className="bg-fuchsia-600/20 border-fuchsia-500/50 hover:bg-fuchsia-600/30 text-fuchsia-200"
              >
                {isCreatingTeam ? "Створення..." : (
                  <>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Створити Orchestrator Team Chat
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* General Rooms Section */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
            Кімнати MicroDAO
            <span className="text-sm font-normal text-slate-500">({rooms.length})</span>
          </h2>

          {/* Mini-map */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(byRole).map(([role, list]) => {
              const meta = ROLE_META[role];
              return (
                <div
                  key={role}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] ${
                    meta ? meta.chipClass : "bg-slate-700/30 text-slate-400 border-slate-700/50"
                  }`}
                >
                  {meta?.icon || <Hash className="w-3 h-3" />}
                  <span>{meta?.label ?? (role === 'other' ? 'Other' : role)}</span>
                  <span className="opacity-60">({list.length})</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primary room with inline chat (if exists) */}
        {primary && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${primaryMeta ? primaryMeta.chipClass : "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"}`}>
                  {primaryMeta?.icon || <Home className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-base font-medium text-slate-100 flex items-center gap-2">
                    {primary.name}
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Primary
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {primaryMeta?.label || primary.room_role || 'Main Room'}
                  </div>
                </div>
              </div>
              <Link
                href={`/city/${primary.slug}`}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-cyan-950/30 border border-transparent hover:border-cyan-500/20"
              >
                Відкрити окремо →
              </Link>
            </div>

            <CityChatWidget roomSlug={primary.slug} hideTitle />
          </div>
        )}

        {/* Other rooms */}
        {others.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="text-sm text-slate-400 font-medium px-1">Інші кімнати</div>
            <div className="grid gap-3 md:grid-cols-2">
              {others.map(room => {
                const meta = room.room_role ? ROLE_META[room.room_role] : undefined;
                return (
                  <div
                    key={room.id}
                    className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 space-y-3 hover:border-slate-600/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg border ${meta ? meta.chipClass : "text-slate-400 bg-slate-700/30 border-slate-700/50"}`}>
                          {meta?.icon || <Hash className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-200">{room.name}</div>
                          {meta && (
                            <div className="text-[11px] text-slate-500">
                              {meta.label}
                            </div>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/city/${room.slug}`}
                        className="text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1"
                      >
                        Увійти →
                      </Link>
                    </div>
                    
                    {showAllChats && (
                      <div className="mt-2">
                        <CityChatWidget roomSlug={room.slug} compact />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
