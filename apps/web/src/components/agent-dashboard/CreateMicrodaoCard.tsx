'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Globe, Lock, Layers, Loader2, CheckCircle } from 'lucide-react';
import { createMicrodaoForAgent, MicrodaoCreateRequest } from '@/lib/api/agents';

interface CreateMicrodaoCardProps {
  agentId: string;
  agentName: string;
  isOrchestrator: boolean;
  onCreated?: () => void;
}

export function CreateMicrodaoCard({
  agentId,
  agentName,
  isOrchestrator,
  onCreated,
}: CreateMicrodaoCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [makePlatform, setMakePlatform] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug if not manually edited
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || saving) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const payload: MicrodaoCreateRequest = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        make_platform: makePlatform,
        is_public: isPublic,
      };

      const result = await createMicrodaoForAgent(agentId, payload);
      
      setSuccess(`MicroDAO "${result.microdao.name}" успішно створено!`);
      
      // Reset form
      setName('');
      setSlug('');
      setDescription('');
      setMakePlatform(false);
      setIsPublic(true);
      setExpanded(false);
      
      onCreated?.();
      
      // Navigate to new MicroDAO after a short delay
      setTimeout(() => {
        router.push(`/microdao/${result.microdao.slug}`);
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося створити MicroDAO');
    } finally {
      setSaving(false);
    }
  };

  // If already an orchestrator, show different UI
  if (isOrchestrator) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 text-amber-400 mb-3">
          <Building2 className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Orchestrator</h3>
        </div>
        <p className="text-white/60 text-sm mb-4">
          Цей агент є оркестратором і може керувати MicroDAO.
        </p>
        
        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Створити ще один MicroDAO
          </button>
        ) : (
          <MicrodaoForm
            name={name}
            slug={slug}
            description={description}
            makePlatform={makePlatform}
            isPublic={isPublic}
            saving={saving}
            error={error}
            success={success}
            onNameChange={handleNameChange}
            onSlugChange={setSlug}
            onDescriptionChange={setDescription}
            onMakePlatformChange={setMakePlatform}
            onIsPublicChange={setIsPublic}
            onSubmit={handleSubmit}
            onCancel={() => setExpanded(false)}
          />
        )}
      </div>
    );
  }

  // Not an orchestrator - show option to become one
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        <Building2 className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-semibold">Створити MicroDAO</h3>
      </div>
      
      <p className="text-white/60 text-sm mb-4">
        Зробіть цього агента оркестратором і створіть власний MicroDAO. 
        Оркестратор може керувати членами DAO, налаштовувати канали та інтеграції.
      </p>

      {success && (
        <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Стати оркестратором і створити MicroDAO
        </button>
      ) : (
        <MicrodaoForm
          name={name}
          slug={slug}
          description={description}
          makePlatform={makePlatform}
          isPublic={isPublic}
          saving={saving}
          error={error}
          success={success}
          onNameChange={handleNameChange}
          onSlugChange={setSlug}
          onDescriptionChange={setDescription}
          onMakePlatformChange={setMakePlatform}
          onIsPublicChange={setIsPublic}
          onSubmit={handleSubmit}
          onCancel={() => setExpanded(false)}
        />
      )}
    </div>
  );
}

// Extracted form component
interface MicrodaoFormProps {
  name: string;
  slug: string;
  description: string;
  makePlatform: boolean;
  isPublic: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onMakePlatformChange: (value: boolean) => void;
  onIsPublicChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function MicrodaoForm({
  name,
  slug,
  description,
  makePlatform,
  isPublic,
  saving,
  error,
  success,
  onNameChange,
  onSlugChange,
  onDescriptionChange,
  onMakePlatformChange,
  onIsPublicChange,
  onSubmit,
  onCancel,
}: MicrodaoFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-4 pt-4 border-t border-white/10">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      <div>
        <label className="block text-sm text-white/70 mb-1">Назва MicroDAO *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="My Awesome DAO"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
          required
          disabled={saving}
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1">Slug (URL) *</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="my-awesome-dao"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 font-mono text-sm"
          required
          disabled={saving}
        />
        <p className="text-xs text-white/40 mt-1">URL: /microdao/{slug || 'your-slug'}</p>
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1">Опис</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Короткий опис вашого MicroDAO..."
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
          disabled={saving}
        />
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => onIsPublicChange(e.target.checked)}
            disabled={saving}
            className="w-4 h-4 rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-cyan-500/50"
          />
          <div className="flex items-center gap-2">
            {isPublic ? <Globe className="w-4 h-4 text-cyan-400" /> : <Lock className="w-4 h-4 text-white/50" />}
            <span className="text-white">Публічний MicroDAO</span>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={makePlatform}
            onChange={(e) => onMakePlatformChange(e.target.checked)}
            disabled={saving}
            className="w-4 h-4 rounded border-white/30 bg-white/10 text-amber-500 focus:ring-amber-500/50"
          />
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-white">Це платформа / District</span>
          </div>
        </label>
        <p className="text-xs text-white/40 ml-7">
          Платформа може мати дочірні MicroDAO
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!name.trim() || !slug.trim() || saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/10 disabled:text-white/30 text-white rounded-lg transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Створення...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Створити MicroDAO
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg transition-colors"
        >
          Скасувати
        </button>
      </div>
    </form>
  );
}

