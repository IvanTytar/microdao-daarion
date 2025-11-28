'use client';

import { useState, useEffect } from 'react';
import { AgentPublicProfile, updateAgentPublicProfile } from '@/lib/agent-dashboard';

interface AgentPublicProfileCardProps {
  agentId: string;
  publicProfile?: AgentPublicProfile;
  canEdit?: boolean;
  onUpdated?: () => void;
}

const DISTRICTS = [
  'Central',
  'Creators',
  'Engineering',
  'Marketing',
  'Finance',
  'Security',
  'Research',
  'Community',
  'Governance',
  'Innovation'
];

export function AgentPublicProfileCard({
  agentId,
  publicProfile,
  canEdit = false,
  onUpdated
}: AgentPublicProfileCardProps) {
  const [isPublic, setIsPublic] = useState(publicProfile?.is_public || false);
  const [slug, setSlug] = useState(publicProfile?.public_slug || '');
  const [title, setTitle] = useState(publicProfile?.public_title || '');
  const [tagline, setTagline] = useState(publicProfile?.public_tagline || '');
  const [skills, setSkills] = useState<string[]>(publicProfile?.public_skills || []);
  const [district, setDistrict] = useState(publicProfile?.public_district || '');
  const [primaryRoom, setPrimaryRoom] = useState(publicProfile?.public_primary_room_slug || '');
  const [newSkill, setNewSkill] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Update local state when props change
  useEffect(() => {
    if (publicProfile) {
      setIsPublic(publicProfile.is_public || false);
      setSlug(publicProfile.public_slug || '');
      setTitle(publicProfile.public_title || '');
      setTagline(publicProfile.public_tagline || '');
      setSkills(publicProfile.public_skills || []);
      setDistrict(publicProfile.public_district || '');
      setPrimaryRoom(publicProfile.public_primary_room_slug || '');
    }
  }, [publicProfile]);
  
  const hasChanges = () => {
    if (!publicProfile) return true;
    return (
      isPublic !== (publicProfile.is_public || false) ||
      slug !== (publicProfile.public_slug || '') ||
      title !== (publicProfile.public_title || '') ||
      tagline !== (publicProfile.public_tagline || '') ||
      JSON.stringify(skills) !== JSON.stringify(publicProfile.public_skills || []) ||
      district !== (publicProfile.public_district || '') ||
      primaryRoom !== (publicProfile.public_primary_room_slug || '')
    );
  };
  
  const handleAddSkill = () => {
    if (newSkill.trim() && skills.length < 10) {
      setSkills([...skills, newSkill.trim().toLowerCase()]);
      setNewSkill('');
    }
  };
  
  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };
  
  const handleSave = async () => {
    if (saving) return;
    
    // Validate
    if (isPublic && !slug.trim()) {
      setError('Slug is required for public agents');
      setSaveStatus('error');
      return;
    }
    
    setSaving(true);
    setSaveStatus('idle');
    setError(null);
    
    try {
      await updateAgentPublicProfile(agentId, {
        is_public: isPublic,
        public_slug: slug.trim() || null,
        public_title: title.trim() || null,
        public_tagline: tagline.trim() || null,
        public_skills: skills,
        public_district: district || null,
        public_primary_room_slug: primaryRoom || null
      });
      
      setSaveStatus('success');
      onUpdated?.();
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>🌐</span> Public Profile Settings
        </h3>
        <p className="text-white/50 text-sm mt-1">
          Налаштування публічного профілю для каталогу громадян DAARION City
        </p>
      </div>
      
      {/* Is Public Toggle */}
      <div className="mb-6 p-4 bg-white/5 rounded-xl">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            disabled={!canEdit}
            className="w-5 h-5 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-cyan-500"
          />
          <div>
            <span className="text-white font-medium">Make Public</span>
            <p className="text-white/40 text-sm">
              Агент буде видимий у публічному каталозі /citizens
            </p>
          </div>
        </label>
      </div>
      
      {/* Slug */}
      <div className="mb-4">
        <label className="block text-white/70 text-sm mb-1">
          Public Slug <span className="text-red-400">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-white/40">/citizens/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="iris"
            disabled={!canEdit}
            className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <p className="text-white/30 text-xs mt-1">
          Тільки малі літери, цифри, _ та -
        </p>
      </div>
      
      {/* Title */}
      <div className="mb-4">
        <label className="block text-white/70 text-sm mb-1">Public Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Multimodal Vision Curator"
          disabled={!canEdit}
          className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
        />
      </div>
      
      {/* Tagline */}
      <div className="mb-4">
        <label className="block text-white/70 text-sm mb-1">Public Tagline</label>
        <textarea
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Я дивлюся на світ і знаходжу суть..."
          disabled={!canEdit}
          rows={2}
          className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
        />
      </div>
      
      {/* District */}
      <div className="mb-4">
        <label className="block text-white/70 text-sm mb-1">District</label>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          disabled={!canEdit}
          className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
        >
          <option value="">Select district...</option>
          {DISTRICTS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      
      {/* Primary Room */}
      <div className="mb-4">
        <label className="block text-white/70 text-sm mb-1">Primary Room Slug</label>
        <input
          type="text"
          value={primaryRoom}
          onChange={(e) => setPrimaryRoom(e.target.value.toLowerCase())}
          placeholder="vision_lab"
          disabled={!canEdit}
          className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
        />
      </div>
      
      {/* Skills */}
      <div className="mb-6">
        <label className="block text-white/70 text-sm mb-1">
          Skills <span className="text-white/30">(max 10)</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {skills.map((skill, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-md text-sm flex items-center gap-1"
            >
              {skill}
              {canEdit && (
                <button
                  onClick={() => handleRemoveSkill(index)}
                  className="hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        {canEdit && skills.length < 10 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
              placeholder="Add skill..."
              className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={handleAddSkill}
              className="px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>
      
      {/* Actions */}
      {canEdit && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            {saveStatus === 'success' && (
              <span className="text-green-400 text-sm flex items-center gap-1">
                <span>✓</span> Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-400 text-sm">
                {error || 'Failed to save'}
              </span>
            )}
          </div>
          
          <button
            onClick={handleSave}
            disabled={!hasChanges() || saving}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${hasChanges() && !saving
                ? 'bg-cyan-500 hover:bg-cyan-400 text-white'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
              }
            `}
          >
            {saving ? 'Saving...' : 'Save Public Profile'}
          </button>
        </div>
      )}
      
      {/* Preview Link */}
      {isPublic && slug && (
        <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
          <p className="text-green-400 text-sm flex items-center gap-2">
            <span>✓</span>
            Public profile available at:
            <a
              href={`/citizens/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-300"
            >
              /citizens/{slug}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

