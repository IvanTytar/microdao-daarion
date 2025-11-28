'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getAgentKindIcon } from '@/lib/agent-dashboard';
import { useCitizenProfile, useCitizenInteraction } from '@/hooks/useCitizens';
import { askCitizen } from '@/lib/api/citizens';
import { CityChatWidget } from '@/components/city/CityChatWidget';

type LooseRecord = Record<string, any>;

export default function CitizenProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { citizen, isLoading, error } = useCitizenProfile(slug);
  const {
    interaction,
    isLoading: interactionLoading,
    error: interactionError,
  } = useCitizenInteraction(slug);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !citizen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-red-400 text-lg mb-4">{error?.message || 'Citizen not found'}</p>
            <Link href="/citizens" className="text-cyan-400 hover:underline">
              ← Back to Citizens
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = citizen.status || 'unknown';
  const statusColor =
    status === 'online' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/60';

  const daisCore = (citizen.dais_public?.core as LooseRecord) || {};
  const daisPhenotype = (citizen.dais_public?.phenotype as LooseRecord) || {};
  const daisMemex = (citizen.dais_public?.memex as LooseRecord) || {};
  const daisEconomics = (citizen.dais_public?.economics as LooseRecord) || {};
  const metricsEntries = Object.entries(citizen.metrics_public || {});
  const actions = (citizen.interaction?.actions as string[]) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          href="/citizens"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          ← Back to Citizens
        </Link>

        <section className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <div className="w-24 h-24 flex-shrink-0 rounded-2xl bg-gradient-to-br from-cyan-500/40 to-purple-500/40 flex items-center justify-center text-5xl shadow-xl">
                {getAgentKindIcon(citizen.kind || '')}
              </div>
              <div className="flex-1 space-y-3">
                <h1 className="text-3xl font-bold text-white">{citizen.display_name}</h1>
                <p className="text-cyan-200 text-lg">
                  {citizen.public_title || citizen.kind || 'Citizen of DAARION'}
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className={`px-3 py-1 rounded-full ${statusColor}`}>
                    {status}
                  </span>
                  {citizen.district && (
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white/70">
                      {citizen.district} District
                    </span>
                  )}
                  {citizen.microdao && (
                    <Link
                      href={`/microdao/${citizen.microdao.slug}`}
                      className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
                    >
                      MicroDAO: {citizen.microdao.name}
                    </Link>
                  )}
                </div>
              </div>
              {citizen.admin_panel_url && (
                <Link
                  href={citizen.admin_panel_url}
                  className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-lg hover:bg-purple-500/30 transition-colors text-sm flex items-center gap-2"
                >
                  ⚙️ Agent Dashboard
                </Link>
              )}
            </div>
          </div>
          <div className="p-8 space-y-8">
            {citizen.public_tagline && (
              <blockquote className="text-xl text-white/80 italic border-l-4 border-cyan-500/60 pl-4">
                "{citizen.public_tagline}"
              </blockquote>
            )}

            {citizen.public_skills?.length > 0 && (
              <div>
                <h3 className="text-xs uppercase text-white/40 mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {citizen.public_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-cyan-500/20 text-cyan-200 rounded-lg text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {citizen.district && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-xs uppercase text-white/40">District</p>
                  <p className="text-white mt-1 text-lg">{citizen.district}</p>
                </div>
              )}
              {citizen.city_presence?.primary_room_slug && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-xs uppercase text-white/40">Primary Room</p>
                  <p className="text-white mt-1 text-lg">
                    #{citizen.city_presence.primary_room_slug}
                  </p>
                </div>
              )}
              {citizen.home_node && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-xs uppercase text-white/40">Home Node</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-white text-lg">{citizen.home_node.name || citizen.node_id}</p>
                    {citizen.home_node.roles && citizen.home_node.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {citizen.home_node.roles.map((role) => (
                          <span
                            key={role}
                            className={`px-2 py-0.5 rounded text-xs ${
                              role === 'gpu' ? 'bg-amber-500/20 text-amber-300' :
                              role === 'core' ? 'bg-emerald-500/20 text-emerald-300' :
                              role === 'development' ? 'bg-purple-500/20 text-purple-300' :
                              'bg-white/10 text-white/60'
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                    {citizen.home_node.environment && (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                        citizen.home_node.environment === 'production' 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {citizen.home_node.environment}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Взаємодія з громадянином</h2>

          <div className="space-y-2 text-sm">
            <p className="text-white/60">Чат</p>
            {interactionLoading ? (
              <div className="text-white/40 text-xs">Завантаження…</div>
            ) : interaction?.primary_room_slug ? (
              <Link
                href={`/city/${interaction.primary_room_slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-white/20 rounded-lg text-white hover:border-cyan-400/70 transition-colors"
              >
                Відкрити чат у кімнаті{' '}
                {interaction.primary_room_name ?? interaction.primary_room_slug}
              </Link>
            ) : (
              <div className="text-white/50 text-xs">
                Для цього громадянина ще не налаштована публічна кімната чату.
              </div>
            )}
            {interactionError && (
              <div className="text-xs text-red-400">
                Не вдалося завантажити інформацію про чат.
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <p className="text-white/60">Поставити запитання</p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Напишіть запитання до агента…"
              className="w-full min-h-[90px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  if (!slug || !question.trim()) return;
                  setAsking(true);
                  setAskError(null);
                  setAnswer(null);
                  try {
                    const res = await askCitizen(slug, { question });
                    setAnswer(res.answer);
                  } catch (err) {
                    setAskError(
                      err instanceof Error
                        ? err.message
                        : 'Сталася помилка під час запиту.',
                    );
                  } finally {
                    setAsking(false);
                  }
                }}
                disabled={asking || !question.trim()}
                className="px-4 py-2 rounded-lg border border-white/20 text-sm text-white hover:border-cyan-400/70 transition-colors disabled:opacity-40"
              >
                {asking ? 'Надсилання…' : 'Запитати'}
              </button>
              <button
                onClick={() => {
                  setQuestion('');
                  setAnswer(null);
                  setAskError(null);
                }}
                className="text-xs text-white/50 hover:text-white transition-colors"
              >
                Очистити
              </button>
            </div>
            {askError && <div className="text-xs text-red-400">{askError}</div>}
            {answer && (
              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 whitespace-pre-wrap">
                {answer}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Live-чат з громадянином</h2>
          {interactionLoading ? (
            <div className="text-sm text-white/70">Завантаження кімнати…</div>
          ) : interaction?.primary_room_slug ? (
            <CityChatWidget roomSlug={interaction.primary_room_slug} />
          ) : (
            <div className="text-sm text-white/60">
              Для цього громадянина ще не налаштована публічна кімната чату.
            </div>
          )}
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold">DAIS Public Passport</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs uppercase text-white/40">Identity</p>
              <p className="text-white font-semibold mt-2">
                {(daisCore?.archetype as string) || citizen.kind || 'Specialist'}
              </p>
              <p className="text-white/70 text-sm">
                {(daisCore?.bio_short as string) || citizen.public_tagline}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs uppercase text-white/40">Visual</p>
              <p className="text-white/70 text-sm">
                {(daisPhenotype?.visual as Record<string, string>)?.style || '—'}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs uppercase text-white/40">Memory</p>
              <p className="text-white/70 text-sm">
                {daisMemex && Object.keys(daisMemex).length > 0
                  ? JSON.stringify(daisMemex)
                  : 'Shared city memory'}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs uppercase text-white/40">Economics</p>
              <p className="text-white/70 text-sm">
                {daisEconomics && Object.keys(daisEconomics).length > 0
                  ? JSON.stringify(daisEconomics)
                  : 'per_task'}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold">City Presence</h2>
          {citizen.city_presence?.rooms?.length ? (
            <div className="space-y-2">
              {citizen.city_presence.rooms.map((room) => (
                <Link
                  key={room.slug || room.room_id}
                  href={room.slug ? `/city/${room.slug}` : '#'}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white hover:border-cyan-500/40 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{room.name || room.slug}</p>
                    <p className="text-white/50 text-xs">{room.slug}</p>
                  </div>
                  <span className="text-white/50">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-white/50 text-sm">Публічні кімнати не вказані.</p>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Interaction</h2>
            {actions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <span
                    key={action}
                    className="px-3 py-1 bg-cyan-500/20 text-cyan-200 rounded-full text-xs"
                  >
                    {action}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">Публічні сценарії взаємодії готуються.</p>
            )}
            <button className="w-full mt-4 px-4 py-2 bg-cyan-500/20 text-cyan-100 rounded-lg hover:bg-cyan-500/30 transition-colors">
              💬 Запросити до діалогу
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
            <h2 className="text-white font-semibold">Public Metrics</h2>
            {metricsEntries.length ? (
              <div className="space-y-2">
                {metricsEntries.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-white/50">{key}</span>
                    <span className="text-white font-semibold">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">Метрики поки не опубліковані.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

