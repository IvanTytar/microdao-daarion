"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMicrodaoDetail, useMicrodaoRooms } from "@/hooks/useMicrodao";
import { DISTRICT_COLORS } from "@/lib/microdao";
import { MicrodaoVisibilityCard } from "@/components/microdao/MicrodaoVisibilityCard";
import { MicrodaoRoomsSection } from "@/components/microdao/MicrodaoRoomsSection";
import { MicrodaoRoomsAdminPanel } from "@/components/microdao/MicrodaoRoomsAdminPanel";
import { ChevronLeft, Users, MessageSquare, Crown, Building2, Globe, Lock, Layers, BarChart3, Bot, MessageCircle } from "lucide-react";
import { CityChatWidget } from "@/components/city/CityChatWidget";

export default function MicrodaoDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { microdao, isLoading, error, mutate: refreshMicrodao } = useMicrodaoDetail(slug);
  const { rooms, mutate: refreshRooms } = useMicrodaoRooms(slug);
  
  const handleRoomUpdated = () => {
    refreshRooms();
    refreshMicrodao();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Back link */}
        <Link
          href="/microdao"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Всі MicroDAO
        </Link>

        {/* Header */}
        <header className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {microdao.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={microdao.logo_url}
                    alt={microdao.name}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-violet-400" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-100">{microdao.name}</h1>
                    {microdao.is_platform && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Platform
                      </span>
                    )}
                  </div>
                  {microdao.description && (
                    <p className="text-sm text-slate-400 mt-1">{microdao.description}</p>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {microdao.district && (
                  <span
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${
                      DISTRICT_COLORS[microdao.district] ||
                      "bg-slate-500/10 text-slate-400 border-slate-500/30"
                    }`}
                  >
                    {microdao.district}
                  </span>
                )}
                <span
                  className={`text-xs px-3 py-1 rounded-full border font-medium flex items-center gap-1 ${
                    microdao.is_active
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${microdao.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {microdao.is_active ? "Active" : "Inactive"}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full border font-medium flex items-center gap-1 ${
                  microdao.is_public
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                }`}>
                  {microdao.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {microdao.is_public ? "Public" : "Private"}
                </span>
              </div>
              
              {/* Parent MicroDAO */}
              {microdao.parent_microdao_slug && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Layers className="w-4 h-4" />
                  <span>Parent:</span>
                  <Link
                    href={`/microdao/${microdao.parent_microdao_slug}`}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {microdao.parent_microdao_slug}
                  </Link>
                </div>
              )}
            </div>

            {/* Orchestrator */}
            {orchestrator && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="text-xs text-amber-400 mb-1 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Оркестратор
                </div>
                <Link
                  href={`/agents/${orchestrator.agent_id}`}
                  className="text-sm font-medium text-slate-100 hover:text-cyan-400 transition-colors"
                >
                  {orchestrator.display_name}
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Child MicroDAOs */}
        {childMicrodaos.length > 0 && (
          <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Дочірні MicroDAO
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {childMicrodaos.map((child) => (
                <Link
                  key={child.id}
                  href={`/microdao/${child.slug}`}
                  className="bg-slate-900/50 border border-slate-700/30 rounded-lg px-4 py-3 hover:border-cyan-500/30 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{child.name}</p>
                    <p className="text-xs text-slate-500">{child.slug}</p>
                  </div>
                  {child.is_platform && (
                    <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                      Platform
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Agents */}
        <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            Агентська команда
            <span className="text-sm font-normal text-slate-500">({microdao.agents.length})</span>
          </h2>

          {microdao.agents.length === 0 ? (
            <div className="text-sm text-slate-500">Агенти ще не привʼязані.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {microdao.agents.map((a) => (
                <div
                  key={a.agent_id}
                  className="bg-slate-900/50 border border-slate-700/30 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <Link
                      href={`/agents/${a.agent_id}`}
                      className="text-sm font-medium text-slate-200 hover:text-cyan-400 transition-colors"
                    >
                      {a.display_name}
                    </Link>
                    {a.role && (
                      <div className="text-xs text-slate-500 capitalize">{a.role}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {a.agent_id === microdao.orchestrator_agent_id && (
                      <Crown className="w-4 h-4 text-amber-400" />
                    )}
                    {a.is_core && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/30 uppercase tracking-wide">
                        Core
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Public Citizens */}
        {publicCitizens.length > 0 && (
          <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Громадяни цього MicroDAO
              <span className="text-sm font-normal text-slate-500">({publicCitizens.length})</span>
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {publicCitizens.map((citizen) => (
                <Link
                  key={citizen.slug}
                  href={`/citizens/${citizen.slug}`}
                  className="flex items-center justify-between bg-slate-900/50 border border-slate-700/30 rounded-lg px-4 py-3 hover:border-cyan-500/40 transition-colors"
                >
                  <div>
                    <p className="text-slate-200 font-medium">{citizen.display_name}</p>
                    {citizen.public_title && (
                      <p className="text-sm text-slate-400">{citizen.public_title}</p>
                    )}
                  </div>
                  {citizen.district && (
                    <span className="text-xs text-slate-500">{citizen.district}</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Channels */}
        <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            Канали та кімнати
          </h2>

          {telegramChannels.length === 0 &&
          matrixChannels.length === 0 &&
          cityRooms.length === 0 &&
          crewChannels.length === 0 ? (
            <div className="text-sm text-slate-500">Канали ще не налаштовані.</div>
          ) : (
            <div className="space-y-4">
              {/* Telegram */}
              {telegramChannels.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Telegram</div>
                  <div className="flex flex-wrap gap-2">
                    {telegramChannels.map((c) => (
                      <a
                        key={c.ref_id}
                        href={`https://t.me/${c.ref_id.replace("@", "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-sm text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        {c.display_name || c.ref_id}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Matrix */}
              {matrixChannels.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Matrix</div>
                  <div className="flex flex-wrap gap-2">
                    {matrixChannels.map((c) => (
                      <span
                        key={c.ref_id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-sm text-green-400"
                      >
                        {c.display_name || c.ref_id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* City Rooms */}
              {cityRooms.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Міські кімнати</div>
                  <div className="flex flex-wrap gap-2">
                    {cityRooms.map((c) => (
                      <Link
                        key={c.ref_id}
                        href={`/city/${c.ref_id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-full text-sm text-violet-400 hover:bg-violet-500/20 transition-colors"
                      >
                        {c.display_name || c.ref_id}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* CrewAI */}
              {crewChannels.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">CrewAI сценарії</div>
                  <div className="flex flex-wrap gap-2">
                    {crewChannels.map((c) => (
                      <span
                        key={c.ref_id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full text-sm text-orange-400"
                      >
                        {c.display_name || c.ref_id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Stats */}
        <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Статистика
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-100">{microdao.agents.length}</div>
              <div className="text-xs text-slate-500">Агентів</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-100">{publicCitizens.length}</div>
              <div className="text-xs text-slate-500">Громадян</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-100">{microdao.channels.length}</div>
              <div className="text-xs text-slate-500">Каналів</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-100">{childMicrodaos.length}</div>
              <div className="text-xs text-slate-500">Дочірніх DAO</div>
            </div>
          </div>
        </section>

        {/* Orchestrator Room Management Panel */}
        {orchestrator && (
          <MicrodaoRoomsAdminPanel
            microdaoSlug={slug}
            rooms={rooms.length > 0 ? rooms : (microdao.rooms || [])}
            canManage={true} // TODO: check if current user is orchestrator
            onRoomUpdated={handleRoomUpdated}
          />
        )}

        {/* Multi-Room Section with Chats */}
        <MicrodaoRoomsSection
          rooms={rooms.length > 0 ? rooms : (microdao.rooms || [])}
          primaryRoomSlug={microdao.primary_city_room?.slug}
        />

        {/* Visibility Settings (only for orchestrator) */}
        {orchestrator && (
          <MicrodaoVisibilityCard
            microdaoId={microdao.id}
            isPublic={microdao.is_public}
            isPlatform={microdao.is_platform}
            isOrchestrator={true}  // TODO: check if current user is orchestrator
            onUpdated={() => {
              // Refresh the page data
              window.location.reload();
            }}
          />
        )}
      </div>
    </div>
  );
}
