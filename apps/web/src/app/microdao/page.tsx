"use client";

import { useState } from "react";
import { useMicrodaoList } from "@/hooks/useMicrodao";
import { DISTRICTS, DISTRICT_COLORS } from "@/lib/microdao";
import Link from "next/link";
import { Building2, Users, MessageSquare, Search, MapPin, Crown, Globe, Lock, Layers } from "lucide-react";

export default function MicrodaoListPage() {
  const [district, setDistrict] = useState<string | undefined>();
  const [q, setQ] = useState("");
  const { items, isLoading, error } = useMicrodaoList({ district, q: q || undefined });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                MicroDAO
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Організації та кластери агентів у DAARION City
              </p>
            </div>
          </div>
          
          {/* Filters */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Пошук за назвою..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={district ?? ""}
                  onChange={(e) => setDistrict(e.target.value || undefined)}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-8 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 appearance-none"
                >
                  <option value="">Всі дистрикти</option>
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-slate-400">Завантаження...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-red-400">Помилка завантаження даних</div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-500">
              {q || district ? "Нічого не знайдено" : "Поки що немає MicroDAO"}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((m) => (
              <Link
                key={m.id}
                href={`/microdao/${m.slug}`}
                className="group relative bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 hover:border-cyan-500/30 hover:bg-slate-800/50 transition-all duration-300"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative space-y-3">
                  {/* Title + Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
                          {m.name}
                        </h2>
                        {/* Platform Badge */}
                        {m.is_platform && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Platform
                          </span>
                        )}
                      </div>
                      {m.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {m.description}
                        </p>
                      )}
                    </div>
                    
                    {/* District Badge */}
                    {m.district && (
                      <span
                        className={`shrink-0 text-[10px] px-2 py-1 rounded-full border font-medium ${
                          DISTRICT_COLORS[m.district] || "bg-slate-500/10 text-slate-400 border-slate-500/30"
                        }`}
                      >
                        {m.district}
                      </span>
                    )}
                  </div>

                  {/* Orchestrator */}
                  {m.orchestrator_agent_name && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>Orchestrator: {m.orchestrator_agent_name}</span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{m.member_count || m.agents_count} агентів</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{m.channels_count} каналів</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <div className="flex items-center gap-2">
                      {/* Status */}
                      <div className={`w-2 h-2 rounded-full ${m.is_active ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                        {m.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    
                    {/* Public/Private */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      {m.is_public ? (
                        <>
                          <Globe className="w-3 h-3" />
                          <span>Public</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          <span>Private</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
