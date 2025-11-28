"use client";

import { useState } from "react";
import { useMicrodaoList } from "@/hooks/useMicrodao";
import { DISTRICTS, DISTRICT_COLORS } from "@/lib/microdao";
import Link from "next/link";

export default function MicrodaoListPage() {
  const [district, setDistrict] = useState<string | undefined>();
  const [q, setQ] = useState("");
  const { items, isLoading, error } = useMicrodaoList({ district, q: q || undefined });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                MicroDAO
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Кластери агентів і організацій у DAARION.city
              </p>
            </div>
            
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Пошук за назвою..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
              />
              <select
                value={district ?? ""}
                onChange={(e) => setDistrict(e.target.value || undefined)}
                className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
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
                  {/* Title + District */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
                        {m.name}
                      </h2>
                      {m.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {m.description}
                        </p>
                      )}
                    </div>
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

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{m.agents_count} агентів</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{m.channels_count} каналів</span>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${m.is_active ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                      {m.is_active ? "Active" : "Inactive"}
                    </span>
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

