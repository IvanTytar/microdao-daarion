"use client";

import { useEffect, useState } from "react";
import type {
  AgentMicrodaoMembership,
  MicrodaoOption
} from "@/lib/types/microdao";
import {
  fetchMicrodaoOptions,
  assignAgentToMicrodao,
  removeAgentFromMicrodao,
} from "@/lib/api/microdao";

interface Props {
  agentId: string;
  memberships: AgentMicrodaoMembership[];
  canEdit: boolean;
  onUpdated?: () => void;
}

export function AgentMicrodaoMembershipCard({
  agentId,
  memberships,
  canEdit,
  onUpdated,
}: Props) {
  const [options, setOptions] = useState<MicrodaoOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedMicrodaoId, setSelectedMicrodaoId] = useState("");
  const [role, setRole] = useState("");
  const [isCore, setIsCore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canEdit) return;
    setLoadingOptions(true);
    fetchMicrodaoOptions()
      .then(setOptions)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load options")
      )
      .finally(() => setLoadingOptions(false));
  }, [canEdit]);

  const handleAssign = async () => {
    if (!selectedMicrodaoId) return;
    setSaving(true);
    setError(null);
    try {
      await assignAgentToMicrodao(agentId, {
        microdao_id: selectedMicrodaoId,
        role: role.trim() || undefined,
        is_core: isCore,
      });
      setSelectedMicrodaoId("");
      setRole("");
      setIsCore(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign MicroDAO");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (microdaoId: string) => {
    if (!canEdit) return;
    const confirmed = window.confirm("Видалити це членство?");
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      await removeAgentFromMicrodao(agentId, microdaoId);
      onUpdated?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove MicroDAO membership"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">MicroDAO membership</h2>
        {saving && <span className="text-xs text-white/60">Збереження…</span>}
      </div>

      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {memberships.length === 0 ? (
          <p className="text-sm text-white/50">
            Цей агент поки не входить до жодного MicroDAO.
          </p>
        ) : (
          memberships.map((membership) => (
            <div
              key={membership.microdao_id}
              className="flex items-center justify-between border border-white/10 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-white font-medium">
                  {membership.microdao_name}
                </p>
                <p className="text-white/60 text-sm">
                  {membership.role || "member"}
                  {membership.is_core ? " • core" : ""}
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleRemove(membership.microdao_id)}
                  className="text-xs uppercase tracking-wide text-white/60 hover:text-red-300"
                  disabled={saving}
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {canEdit && (
        <div className="border-t border-white/10 pt-4 space-y-3">
          <h3 className="text-sm text-white/80 font-medium">Додати в MicroDAO</h3>
          {loadingOptions ? (
            <p className="text-sm text-white/50">Завантаження списку…</p>
          ) : (
            <>
              <select
                value={selectedMicrodaoId}
                onChange={(e) => setSelectedMicrodaoId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
              >
                <option value="">Обрати MicroDAO…</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} {option.district ? `(${option.district})` : ""}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Роль (orchestrator / member / council)"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none"
              />
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={isCore}
                  onChange={(e) => setIsCore(e.target.checked)}
                  className="rounded border-white/20 bg-slate-900"
                />
                Core member
              </label>
              <button
                onClick={handleAssign}
                disabled={saving || !selectedMicrodaoId}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-100 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
              >
                Зберегти
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}


