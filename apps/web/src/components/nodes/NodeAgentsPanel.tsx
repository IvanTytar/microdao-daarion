"use client";

import Link from "next/link";
import { Shield, Wrench } from "lucide-react";

interface NodeAgent {
  id: string;
  name: string;
  kind?: string;
  slug?: string;
}

interface NodeAgentsPanelProps {
  guardian?: NodeAgent | null;
  steward?: NodeAgent | null;
}

export function NodeAgentsPanel({ guardian, steward }: NodeAgentsPanelProps) {
  if (!guardian && !steward) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
        <Shield className="w-4 h-4 text-emerald-400" />
        Системні агенти ноди
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Guardian Agent */}
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Node Guardian</span>
          </div>
          {guardian ? (
            <Link
              href={`/agents/${guardian.id}`}
              className="text-sm text-white hover:text-cyan-400 transition-colors font-medium"
            >
              {guardian.name}
            </Link>
          ) : (
            <span className="text-sm text-slate-500 italic">Не призначено</span>
          )}
          {guardian?.kind && (
            <p className="text-xs text-slate-500 mt-1">{guardian.kind}</p>
          )}
        </div>

        {/* Steward Agent */}
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Node Steward</span>
          </div>
          {steward ? (
            <Link
              href={`/agents/${steward.id}`}
              className="text-sm text-white hover:text-amber-400 transition-colors font-medium"
            >
              {steward.name}
            </Link>
          ) : (
            <span className="text-sm text-slate-500 italic">Не призначено</span>
          )}
          {steward?.kind && (
            <p className="text-xs text-slate-500 mt-1">{steward.kind}</p>
          )}
        </div>
      </div>
    </div>
  );
}

