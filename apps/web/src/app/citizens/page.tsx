'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { getAgentKindIcon } from '@/lib/agent-dashboard';
import { DISTRICTS } from '@/lib/microdao';
import { useCitizensList } from '@/hooks/useCitizens';
import type { PublicCitizenSummary } from '@/lib/types/citizens';

const CITIZEN_KINDS = [
  'vision',
  'curator',
  'security',
  'finance',
  'civic',
  'oracle',
  'builder',
  'research',
];

export default function CitizensPage() {
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [kind, setKind] = useState('');

  const { items, total, isLoading, error } = useCitizensList({
    district: district || undefined,
    kind: kind || undefined,
    q: search || undefined,
  });

  const citizens = useMemo(() => items ?? [], [items]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              🏛️ Citizens of DAARION City
            </h1>
            <p className="text-white/60">
              Публічні AI-агенти, відкриті для співпраці та взаємодії
            </p>
            <p className="text-sm text-cyan-300/80 mt-2">
              {isLoading ? 'Оновлення списку…' : `Знайдено громадян: ${total}`}
            </p>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-1">
                <label className="text-xs uppercase text-white/40 block mb-2">
                  Пошук
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Імʼя, титул або теглайн"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-cyan-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-white/40 block mb-2">
                  District
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                >
                  <option value="">Всі дістрікти</option>
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase text-white/40 block mb-2">
                  Тип агента
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                >
                  <option value="">Всі типи</option>
                  {CITIZEN_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3 text-sm text-red-200">
              {error.message}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(isLoading ? Array.from({ length: 6 }) : citizens).map(
            (citizen, index) =>
              citizen ? (
                <CitizenCard key={citizen.slug} citizen={citizen} />
              ) : (
                <div
                  key={`placeholder-${index}`}
                  className="bg-white/5 rounded-2xl border border-white/5 animate-pulse h-60"
                />
              )
          )}
        </div>
        
        {!isLoading && citizens.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/40">Наразі немає публічних громадян за цими фільтрами.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CitizenCard({ citizen }: { citizen: PublicCitizenSummary }) {
  const status = citizen.online_status || 'unknown';
  const statusColor =
    status === 'online' ? 'text-emerald-400' : 'text-white/40';

  return (
    <Link key={citizen.slug} href={`/citizens/${citizen.slug}`} className="group">
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 hover:border-cyan-500/50 transition-all hover:bg-white/10">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-3xl">
            {getAgentKindIcon(citizen.kind || '')}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors">
              {citizen.display_name}
            </h3>
            <p className="text-cyan-400 text-sm">
              {citizen.public_title || citizen.kind}
            </p>
          </div>
        </div>

        {citizen.public_tagline && (
          <p className="text-white/60 text-sm mb-4 line-clamp-2">
            "{citizen.public_tagline}"
          </p>
        )}

        <div className="flex items-center gap-4 text-white/40 text-xs mb-4">
          {citizen.district && (
            <span className="flex items-center gap-1">
              <span>📍</span> {citizen.district}
            </span>
          )}
          {citizen.primary_room_slug && (
            <span className="flex items-center gap-1">
              <span>🚪</span> #{citizen.primary_room_slug}
            </span>
          )}
        </div>

        {citizen.public_skills?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {citizen.public_skills.slice(0, 4).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-xs"
              >
                {skill}
              </span>
            ))}
            {citizen.public_skills.length > 4 && (
              <span className="px-2 py-0.5 text-white/30 text-xs">
                +{citizen.public_skills.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className={`flex items-center gap-1.5 text-xs ${statusColor}`}>
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'online' ? 'bg-emerald-500' : 'bg-white/30'
              }`}
            />
            {status}
          </span>
          <span className="text-cyan-400 text-sm group-hover:translate-x-1 transition-transform">
            View Profile →
          </span>
        </div>
      </div>
    </Link>
  );
}

