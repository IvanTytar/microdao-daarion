"use client";

import { useState } from "react";
import { Settings, Plus, Star, Eye, EyeOff, ArrowUpDown, Check, X, Loader2 } from "lucide-react";
import { CityRoomSummary, MicrodaoRoomUpdate, AttachExistingRoomRequest } from "@/lib/types/microdao";

interface MicrodaoRoomsAdminPanelProps {
  microdaoSlug: string;
  rooms: CityRoomSummary[];
  canManage: boolean;
  onRoomUpdated?: () => void;
}

const ROLE_OPTIONS = [
  { value: "primary", label: "Основна (Primary)" },
  { value: "lobby", label: "Лобі" },
  { value: "team", label: "Командна" },
  { value: "research", label: "Дослідницька" },
  { value: "security", label: "Безпека" },
  { value: "governance", label: "Управління" },
];

export function MicrodaoRoomsAdminPanel({
  microdaoSlug,
  rooms,
  canManage,
  onRoomUpdated,
}: MicrodaoRoomsAdminPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Attach room form
  const [showAttachForm, setShowAttachForm] = useState(false);
  const [attachRoomId, setAttachRoomId] = useState("");
  const [attachRole, setAttachRole] = useState("");
  const [attachSortOrder, setAttachSortOrder] = useState(100);

  if (!canManage) return null;

  const handleSetPrimary = async (roomId: string) => {
    setSaving(roomId);
    setError(null);
    
    try {
      const res = await fetch(`/api/microdao/${microdaoSlug}/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ set_primary: true } as MicrodaoRoomUpdate),
      });
      
      if (!res.ok) {
        throw new Error("Failed to set primary room");
      }
      
      onRoomUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateRoom = async (roomId: string, update: MicrodaoRoomUpdate) => {
    setSaving(roomId);
    setError(null);
    
    try {
      const res = await fetch(`/api/microdao/${microdaoSlug}/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      
      if (!res.ok) {
        throw new Error("Failed to update room");
      }
      
      onRoomUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(null);
    }
  };

  const handleAttachRoom = async () => {
    if (!attachRoomId.trim()) {
      setError("Введіть ID кімнати");
      return;
    }
    
    setSaving("attach");
    setError(null);
    
    try {
      const payload: AttachExistingRoomRequest = {
        room_id: attachRoomId.trim(),
        room_role: attachRole || null,
        is_public: true,
        sort_order: attachSortOrder,
      };
      
      const res = await fetch(`/api/microdao/${microdaoSlug}/rooms/attach-existing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to attach room");
      }
      
      // Reset form
      setAttachRoomId("");
      setAttachRole("");
      setAttachSortOrder(100);
      setShowAttachForm(false);
      onRoomUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-100 font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-400" />
          Керування кімнатами MicroDAO
        </h3>
        <button
          className="text-xs px-3 py-1.5 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "Сховати" : "Показати"}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Тут ви можете привʼязати існуючі кімнати міста до цього MicroDAO, 
            змінювати їх ролі, видимість та порядок сортування.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Rooms list with controls */}
          {rooms.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Поточні кімнати</div>
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-200 truncate">{room.name}</span>
                        {room.room_role === "primary" && (
                          <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{room.slug}</span>
                        <span>•</span>
                        <span>Sort: {room.sort_order}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role selector */}
                      <select
                        className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300"
                        value={room.room_role || ""}
                        onChange={(e) => handleUpdateRoom(room.id, { room_role: e.target.value || null })}
                        disabled={saving === room.id}
                      >
                        <option value="">Без ролі</option>
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {/* Visibility toggle */}
                      <button
                        className={`p-1.5 rounded ${room.is_public ? "text-green-400" : "text-slate-500"} hover:bg-slate-700/50`}
                        onClick={() => handleUpdateRoom(room.id, { is_public: !room.is_public })}
                        disabled={saving === room.id}
                        title={room.is_public ? "Публічна" : "Приватна"}
                      >
                        {room.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      {/* Set primary button */}
                      {room.room_role !== "primary" && (
                        <button
                          className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-700/50"
                          onClick={() => handleSetPrimary(room.id)}
                          disabled={saving === room.id}
                          title="Зробити основною"
                        >
                          {saving === room.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Star className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attach existing room form */}
          <div className="border-t border-slate-700/50 pt-4">
            {!showAttachForm ? (
              <button
                className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                onClick={() => setShowAttachForm(true)}
              >
                <Plus className="w-4 h-4" />
                Привʼязати існуючу кімнату
              </button>
            ) : (
              <div className="space-y-3 bg-slate-900/50 border border-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-300 font-medium">Привʼязати кімнату</div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">ID кімнати</label>
                    <input
                      type="text"
                      value={attachRoomId}
                      onChange={(e) => setAttachRoomId(e.target.value)}
                      placeholder="room_city_..."
                      className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Роль</label>
                    <select
                      value={attachRole}
                      onChange={(e) => setAttachRole(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200"
                    >
                      <option value="">Без ролі</option>
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Порядок:</label>
                    <input
                      type="number"
                      value={attachSortOrder}
                      onChange={(e) => setAttachSortOrder(parseInt(e.target.value) || 100)}
                      className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                      onClick={() => setShowAttachForm(false)}
                    >
                      Скасувати
                    </button>
                    <button
                      className="px-3 py-1.5 text-sm bg-cyan-500 hover:bg-cyan-400 text-white rounded transition-colors flex items-center gap-1"
                      onClick={handleAttachRoom}
                      disabled={saving === "attach"}
                    >
                      {saving === "attach" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Привʼязати
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

