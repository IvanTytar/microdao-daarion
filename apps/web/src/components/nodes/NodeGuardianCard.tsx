"use client";

import Link from "next/link";
import { Shield, MessageSquare, ExternalLink } from "lucide-react";

// Define locally or import from types/nodes if compatible
// We use a compatible shape that fits both NodeProfile agents and generic summaries
export type NodeAgentSummary = {
  id: string;
  name: string;
  kind?: string | null;
  slug?: string | null; // public slug
};

type Props = {
  guardian?: NodeAgentSummary | null;
  steward?: NodeAgentSummary | null;
};

export function NodeGuardianCard({ guardian, steward }: Props) {
  if (!guardian && !steward) return null;

  return (
    <section className="bg-white/5 border border-emerald-400/30 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Node Guardian & Steward
          </h2>
          <p className="text-xs text-white/60">
            Агенти, які відповідають за цю ноду: техніка + взаємодія.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {guardian && (
          <AgentMiniCard
            title="Node Guardian"
            description="Слідкує за інфраструктурою, метриками та безпекою ноди."
            agent={guardian}
            accentClass="border-emerald-400/40 bg-emerald-500/5"
            icon={<Shield className="w-4 h-4 text-emerald-400" />}
          />
        )}
        {steward && (
          <AgentMiniCard
            title="Node Steward"
            description="Представляє ноду як громадянина міста, відповідає за комунікацію."
            agent={steward}
            accentClass="border-cyan-400/40 bg-cyan-500/5"
            icon={<MessageSquare className="w-4 h-4 text-cyan-400" />}
          />
        )}
      </div>
    </section>
  );
}

type AgentMiniCardProps = {
  title: string;
  description: string;
  agent: NodeAgentSummary;
  accentClass?: string;
  icon?: React.ReactNode;
};

function AgentMiniCard({ title, description, agent, accentClass, icon }: AgentMiniCardProps) {
  return (
    <div
      className={`rounded-xl border border-white/10 ${accentClass ?? ""} p-3 space-y-2`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-white/50 font-semibold">
              {title}
            </div>
            <div className="text-sm font-medium text-white">
              {agent.name}
            </div>
          </div>
        </div>
        {agent.kind && (
          <div className="text-[10px] text-white/30 px-2 py-0.5 rounded bg-black/20 border border-white/5">
            {agent.kind}
          </div>
        )}
      </div>
      
      <p className="text-xs text-white/60 leading-relaxed">{description}</p>
      
      <div className="flex items-center gap-2 text-xs pt-1">
        {agent.slug && (
          <Link
            href={`/citizens/${agent.slug}`}
            className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            Публічний профіль
          </Link>
        )}
        <Link
          href={`/agents/${agent.id}`}
          className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1"
        >
          Кабінет
          <ExternalLink className="w-3 h-3 opacity-50" />
        </Link>
      </div>
    </div>
  );
}

