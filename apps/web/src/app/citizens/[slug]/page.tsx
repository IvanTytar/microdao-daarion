'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getAgentKindIcon } from '@/lib/agent-dashboard';
import { useCitizenProfile, useCitizenInteraction } from '@/hooks/useCitizens';
import { askCitizen } from '@/lib/api/citizens';
import { CityChatWidget } from '@/components/city/CityChatWidget';
import { ChevronLeft, Building2, MapPin, MessageSquare, HelpCircle, Loader2, Users } from 'lucide-react';

type LooseRecord = Record<string, unknown>;

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
            <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
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
            <Link href="/citizens" className="text-cyan-400 hover:underline flex items-center justify-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back to Citizens
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = citizen.status || 'unknown';
  const isOnline = status === 'online';
  const daisCore = (citizen.dais_public?.core as LooseRecord) || {};
  const daisPhenotype = (citizen.dais_public?.phenotype as LooseRecord) || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/citizens"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Citizens
        </Link>

        {/* Hero Section */}
        <section className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              {/* Avatar */}
              <div className="w-24 h-24 flex-shrink-0 rounded-2xl bg-gradient-to-br from-cyan-500/40 to-purple-500/40 flex items-center justify-center text-5xl shadow-xl overflow-hidden">
                {citizen.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={citizen.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  getAgentKindIcon(citizen.kind || '')
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-cyan-400/80 text-sm mb-1">Громадянин DAARION City</p>
                  <h1 className="text-3xl font-bold text-white">{citizen.display_name}</h1>
                </div>
                <p className="text-cyan-200 text-lg">
                  {citizen.public_title || citizen.kind || 'Citizen'}
                </p>
                
                {/* Badges */}
                <div className="flex flex-wrap gap-3 text-sm">
                  {/* Status */}
                  <span className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${
                    isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/60'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-white/30'}`} />
                    {status}
                  </span>
                  
                  {/* District */}
                  {citizen.district && (
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white/70 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {citizen.district}
                    </span>
                  )}
                  
                  {/* MicroDAO */}
                  {citizen.microdao && (
                    <Link
                      href={`/microdao/${citizen.microdao.slug}`}
                      className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 flex items-center gap-1.5 transition-colors"
                    >
                      <Building2 className="w-3 h-3" />
                      {citizen.microdao.name}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Tagline */}
            {citizen.public_tagline && (
              <blockquote className="text-xl text-white/80 italic border-l-4 border-cyan-500/60 pl-4">
                &ldquo;{citizen.public_tagline}&rdquo;
              </blockquote>
            )}

            {/* Skills */}
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
          </div>
        </section>

        {/* Interaction Section */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            Взаємодія з громадянином
          </h2>

          {/* Chat Link */}
          <div className="space-y-2">
            <p className="text-white/60 text-sm">Чат у кімнаті MicroDAO</p>
            {interactionLoading ? (
              <div className="text-white/40 text-xs flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Завантаження…
              </div>
            ) : interaction?.primary_room_slug ? (
              <Link
                href={`/city/${interaction.primary_room_slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-cyan-500/30 bg-cyan-500/10 rounded-lg text-cyan-300 hover:bg-cyan-500/20 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Відкрити чат у кімнаті {interaction.primary_room_name ?? interaction.primary_room_slug}
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

          {/* Ask Question */}
          <div className="space-y-3">
            <p className="text-white/60 text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Поставити запитання
            </p>
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
                className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {asking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Надсилання…
                  </>
                ) : (
                  'Запитати'
                )}
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
              <div className="mt-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-white/90 whitespace-pre-wrap">
                {answer}
              </div>
            )}
          </div>
        </section>

        {/* Live Chat Widget */}
        {interaction?.primary_room_slug && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Live-чат
            </h2>
            <CityChatWidget roomSlug={interaction.primary_room_slug} />
          </section>
        )}

        {/* DAIS Public Passport */}
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
              <p className="text-xs uppercase text-white/40">Visual Style</p>
              <p className="text-white/70 text-sm">
                {(daisPhenotype?.visual as Record<string, string>)?.style || 'Default'}
              </p>
            </div>
          </div>
        </section>

        {/* City Presence */}
        {citizen.city_presence?.rooms && citizen.city_presence.rooms.length > 0 && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold">City Presence</h2>
            <div className="space-y-2">
              {citizen.city_presence.rooms.map((room) => (
                <Link
                  key={room.slug || room.room_id}
                  href={room.slug ? `/city/${room.slug}` : '#'}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white hover:border-cyan-500/40 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{room.name || room.slug}</p>
                    <p className="text-white/50 text-xs">#{room.slug}</p>
                  </div>
                  <span className="text-cyan-400">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
