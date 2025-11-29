"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMicrodaoDetail, useMicrodaoRooms } from "@/hooks/useMicrodao";
import { DISTRICT_COLORS } from "@/lib/microdao";
import { MicrodaoVisibilityCard } from "@/components/microdao/MicrodaoVisibilityCard";
import { MicrodaoRoomsSection } from "@/components/microdao/MicrodaoRoomsSection";
import { MicrodaoRoomsAdminPanel } from "@/components/microdao/MicrodaoRoomsAdminPanel";
import { ChevronLeft, Users, MessageSquare, Crown, Building2, Globe, Lock, Layers, BarChart3, Bot, MessageCircle } from "lucide-react";
import { CityChatWidget } from "@/components/city/CityChatWidget";
import { ensureOrchestratorRoom } from "@/lib/api/microdao";

export default function MicrodaoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { microdao, isLoading, error, mutate: refreshMicrodao } = useMicrodaoDetail(slug);
  const { rooms, mutate: refreshRooms } = useMicrodaoRooms(slug);
  
  const handleRoomUpdated = () => {
    refreshRooms();
    refreshMicrodao();
  };

  const handleEnsureOrchestratorRoom = async () => {
    try {
      await ensureOrchestratorRoom(slug);
      handleRoomUpdated();
    } catch (e) {
      console.error("Failed to ensure orchestrator room", e);
      alert("Failed to create team room. Check console for details.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Завантаження...</div>
      </div>
    );
  }

  if (error || !microdao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-400">MicroDAO не знайдено</div>
          <Link href="/microdao" className="text-sm text-cyan-400 hover:underline flex items-center justify-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Повернутися до списку
          </Link>
        </div>
      </div>
    );
  }

  const orchestrator = microdao.agents.find(
    (a) => a.agent_id === microdao.orchestrator_agent_id
  );

  const telegramChannels = microdao.channels.filter((c) => c.kind === "telegram");
  const matrixChannels = microdao.channels.filter((c) => c.kind === "matrix");
  const cityRooms = microdao.channels.filter((c) => c.kind === "city_room");
  const crewChannels = microdao.channels.filter((c) => c.kind === "crew");
  const publicCitizens = microdao.public_citizens ?? [];
  const childMicrodaos = microdao.child_microdaos ?? [];

  // Use fetched rooms if available, otherwise fallback to microdao.rooms
  const displayRooms = rooms.length > 0 ? rooms : (microdao.rooms || []);

  // Check management rights (Mock for MVP: assuming true if orchestrator exists)
  // TODO: Use actual user auth state
  const canManage = !!orchestrator;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Back link */}
        <Link
          href="/microdao"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Всі MicroDAO
        </Link>

        {/* Hero Section (TASK 037B) */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-sky-950/50 via-slate-900 to-black p-6 md:p-8 space-y-6 relative overflow-hidden shadow-2xl shadow-sky-900/10">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
          
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-5 max-w-3xl">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider font-semibold border ${
                  microdao.is_platform 
                    ? "border-amber-500/40 text-amber-300 bg-amber-500/10" 
                    : "border-cyan-400/40 text-cyan-300 bg-cyan-500/10"
                }`}>
                  {microdao.is_platform ? "Platform District" : "MicroDAO"}
                </span>
                
                {microdao.district && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider font-medium border border-white/10 text-white/60 bg-white/5">
                    {microdao.district}
                  </span>
                )}
                
                {microdao.parent_microdao_slug && (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border border-white/10 text-white/50 bg-white/5">
                    <Layers className="w-3 h-3" />
                    <span className="opacity-60">part of</span>
                    <Link href={`/microdao/${microdao.parent_microdao_slug}`} className="hover:text-white transition-colors font-medium">
                      {microdao.parent_microdao_slug}
                    </Link>
                  </span>
                )}

                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border flex items-center gap-1.5 ${
                  microdao.is_active 
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" 
                    : "border-slate-600 text-slate-400 bg-slate-800"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${microdao.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  {microdao.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                  {microdao.name}
                </h1>
                {microdao.description && (
                  <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl">
                    {microdao.description}
                  </p>
                )}
              </div>
              
              {/* Key Stats & Orchestrator */}
              <div className="flex flex-wrap gap-3 pt-2">
                {orchestrator && (
                  <Link 
                    href={`/agents/${orchestrator.agent_id}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors group"
                  >
                    <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="text-sm text-amber-200 font-medium">Orchestrator: {orchestrator.display_name}</span>
                  </Link>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <Users className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/80">{publicCitizens.length} citizens</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <MessageCircle className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/80">{displayRooms.length} rooms</span>
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="hidden md:flex flex-col gap-3">
               <div className="w-24 h-24 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shadow-xl">
                 {microdao.logo_url ? (
                   // eslint-disable-next-line @next/next/no-img-element
                   <img src={microdao.logo_url} alt={microdao.name} className="w-full h-full object-cover" />
                 ) : (
                   <Building2 className="w-10 h-10 text-slate-600" />
                 )}
               </div>
            </div>
          </div>
        </section>

        {/* Child MicroDAOs */}
        {childMicrodaos.length > 0 && (
          <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Дочірні MicroDAO
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {childMicrodaos.map((child) => (
                <Link
                  key={child.id}
                  href={`/microdao/${child.slug}`}
                  className="bg-slate-900/50 border border-slate-700/30 rounded-lg px-4 py-3 hover:border-cyan-500/30 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">{child.name}</p>
                    <p className="text-xs text-slate-500">{child.slug}</p>
                  </div>
                  {child.is_platform && (
                    <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Platform
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Orchestrator Room Management Panel */}
        {orchestrator && canManage && (
          <MicrodaoRoomsAdminPanel
            microdaoSlug={slug}
            rooms={displayRooms}
            canManage={true}
            onRoomUpdated={handleRoomUpdated}
          />
        )}

        {/* Multi-Room Section with Chats (includes Team Chat) */}
        <MicrodaoRoomsSection
          rooms={displayRooms}
          primaryRoomSlug={microdao.primary_city_room?.slug}
          canManage={canManage}
          onEnsureOrchestratorRoom={handleEnsureOrchestratorRoom}
        />

        <div className="grid md:grid-cols-2 gap-8">
          {/* Agents */}
          <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4 h-full">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-400" />
              Агентська команда
              <span className="text-sm font-normal text-slate-500">({microdao.agents.length})</span>
            </h2>

            {microdao.agents.length === 0 ? (
              <div className="text-sm text-slate-500">Агенти ще не привʼязані.</div>
            ) : (
              <div className="space-y-2">
                {microdao.agents.map((a) => (
                  <div
                    key={a.agent_id}
                    className="bg-slate-900/50 border border-slate-700/30 rounded-lg px-4 py-3 flex items-center justify-between hover:border-slate-600/50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <Link
                        href={`/agents/${a.agent_id}`}
                        className="text-sm font-medium text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-2"
                      >
                        {a.display_name}
                        {a.agent_id === microdao.orchestrator_agent_id && (
                          <Crown className="w-3 h-3 text-amber-400" />
                        )}
                      </Link>
                      {a.role && (
                        <div className="text-xs text-slate-500 capitalize">{a.role}</div>
                      )}
                    </div>
                    {a.is_core && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/30 uppercase tracking-wide">
                        Core
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Public Citizens */}
          <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4 h-full">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Громадяни
              <span className="text-sm font-normal text-slate-500">({publicCitizens.length})</span>
            </h2>
            
            {publicCitizens.length === 0 ? (
              <div className="text-sm text-slate-500">Немає публічних громадян.</div>
            ) : (
              <div className="space-y-2">
                {publicCitizens.map((citizen) => (
                  <Link
                    key={citizen.slug}
                    href={`/citizens/${citizen.slug}`}
                    className="flex items-center justify-between bg-slate-900/50 border border-slate-700/30 rounded-lg px-4 py-3 hover:border-cyan-500/40 transition-colors"
                  >
                    <div>
                      <p className="text-slate-200 font-medium text-sm">{citizen.display_name}</p>
                      {citizen.public_title && (
                        <p className="text-xs text-slate-400">{citizen.public_title}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {citizen.district && (
                        <span className="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">{citizen.district}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Channels & Stats Row */}
        <div className="grid md:grid-cols-3 gap-8">
          <section className="md:col-span-2 bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              Канали звʼязку
            </h2>

            {telegramChannels.length === 0 &&
            matrixChannels.length === 0 &&
            cityRooms.length === 0 &&
            crewChannels.length === 0 ? (
              <div className="text-sm text-slate-500">Канали ще не налаштовані.</div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {telegramChannels.map((c) => (
                  <a
                    key={c.ref_id}
                    href={`https://t.me/${c.ref_id.replace("@", "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    {c.display_name || c.ref_id}
                  </a>
                ))}
                {matrixChannels.map((c) => (
                  <span
                    key={c.ref_id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400"
                  >
                    {c.display_name || c.ref_id}
                  </span>
                ))}
                {cityRooms.map((c) => (
                  <Link
                    key={c.ref_id}
                    href={`/city/${c.ref_id}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-lg text-sm text-violet-400 hover:bg-violet-500/20 transition-colors"
                  >
                    {c.display_name || c.ref_id}
                  </Link>
                ))}
                {crewChannels.map((c) => (
                  <span
                    key={c.ref_id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-sm text-orange-400"
                  >
                    {c.display_name || c.ref_id}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Інфо
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2">
                <span className="text-slate-400">Агентів</span>
                <span className="text-slate-200 font-medium">{microdao.agents.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2">
                <span className="text-slate-400">Громадян</span>
                <span className="text-slate-200 font-medium">{publicCitizens.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2">
                <span className="text-slate-400">Каналів</span>
                <span className="text-slate-200 font-medium">{microdao.channels.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Кімнат</span>
                <span className="text-slate-200 font-medium">{displayRooms.length}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Visibility Settings (only for orchestrator) */}
        {orchestrator && canManage && (
          <div className="pt-8 border-t border-white/5">
            <MicrodaoVisibilityCard
              microdaoId={microdao.id}
              isPublic={microdao.is_public}
              isPlatform={microdao.is_platform}
              isOrchestrator={true}
              onUpdated={() => {
                window.location.reload();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
