"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMicrodaoDetail } from "@/hooks/useMicrodao";
import { DISTRICT_COLORS } from "@/lib/microdao";

export default function MicrodaoDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { microdao, isLoading, error } = useMicrodaoDetail(slug);

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
          <Link href="/microdao" className="text-sm text-cyan-400 hover:underline">
            ← Повернутися до списку
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Back link */}
        <Link
          href="/microdao"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Всі MicroDAO
        </Link>

        {/* Header */}
        <header className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {microdao.logo_url && (
                  <img
                    src={microdao.logo_url}
                    alt={microdao.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">{microdao.name}</h1>
                  {microdao.description && (
                    <p className="text-sm text-slate-400 mt-1">{microdao.description}</p>
                  )}
                </div>
              </div>

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
                  className={`text-xs px-3 py-1 rounded-full border font-medium ${
                    microdao.is_active
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {microdao.is_active ? "Active" : "Inactive"}
                </span>
                {microdao.is_public && (
                  <span className="text-xs px-3 py-1 rounded-full border font-medium bg-blue-500/10 text-blue-400 border-blue-500/30">
                    Public
                  </span>
                )}
              </div>
            </div>

            {orchestrator && (
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">Оркестратор</div>
                <Link
                  href={`/agents/${orchestrator.agent_id}`}
                  className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {orchestrator.display_name}
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Agents */}
        <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Агентська команда
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
                  {a.is_core && (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/30 uppercase tracking-wide">
                      Core
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {publicCitizens.length > 0 && (
          <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Громадяни цього MicroDAO
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {publicCitizens.map((citizen) => (
                <Link
                  key={citizen.slug}
                  href={`/citizens/${citizen.slug}`}
                  className="flex items-center justify-between border border-white/10 rounded-lg px-4 py-3 hover:border-cyan-500/40 transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">{citizen.display_name}</p>
                    {citizen.public_title && (
                      <p className="text-sm text-white/60">{citizen.public_title}</p>
                    )}
                  </div>
                  {citizen.district && (
                    <span className="text-xs text-white/50">{citizen.district}</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Channels */}
        <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
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
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                        </svg>
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
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M.632.55v22.9H2.28V24H0V0h2.28v.55zm7.043 7.26v1.157h.033c.309-.443.683-.784 1.117-1.024.433-.245.936-.365 1.5-.365.54 0 1.033.107 1.481.314.448.208.785.582 1.02 1.108.254-.374.6-.706 1.034-.992.434-.287.95-.43 1.546-.43.453 0 .872.056 1.26.167.388.11.716.286.993.53.276.245.489.559.646.951.152.392.23.863.23 1.417v5.728h-2.349V11.52c0-.286-.01-.559-.032-.812a1.755 1.755 0 0 0-.18-.66 1.106 1.106 0 0 0-.438-.448c-.194-.11-.457-.166-.785-.166-.332 0-.6.064-.803.189a1.38 1.38 0 0 0-.48.499 1.946 1.946 0 0 0-.231.696 5.56 5.56 0 0 0-.06.785v4.768h-2.35v-4.8c0-.254-.004-.503-.018-.752a2.074 2.074 0 0 0-.143-.688 1.052 1.052 0 0 0-.415-.503c-.194-.125-.476-.19-.854-.19-.111 0-.259.024-.439.074-.18.051-.36.143-.53.282-.171.138-.319.33-.439.576-.12.245-.18.567-.18.958v5.043H4.833V7.81zm13.086 15.64V.55h1.648V0H24v24h-2.28v-.55z"/>
                        </svg>
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
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
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
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {c.display_name || c.ref_id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Future: Stats & Tokens */}
        <section className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Статистика та токени
          </h2>
          <div className="text-sm text-slate-500">
            Цей блок буде наповнено метриками MicroDAO (участь, транзакції, голосування),
            коли буде готова токеноміка та governance-шар.
          </div>
        </section>
      </div>
    </div>
  );
}

