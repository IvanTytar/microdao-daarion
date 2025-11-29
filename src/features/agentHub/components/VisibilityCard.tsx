import { useState } from 'react';
import { updateAgentVisibility } from '@/api/agents';
import type { AgentDetailDashboard } from '@/types/agent-cabinet';

interface VisibilityCardProps {
  agentId: string;
  publicProfile: AgentDetailDashboard['public_profile'];
  onUpdate: () => void;
}

export function VisibilityCard({ agentId, publicProfile, onUpdate }: VisibilityCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    is_public: publicProfile?.is_public || false,
    public_slug: publicProfile?.public_slug || '',
    public_title: publicProfile?.public_title || '',
    public_tagline: publicProfile?.public_tagline || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAgentVisibility(agentId, {
        is_public: formData.is_public,
        public_slug: formData.public_slug || null,
        public_title: formData.public_title || null,
        public_tagline: formData.public_tagline || null
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update visibility:', error);
      alert('Failed to update visibility');
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = formData.public_slug ? `/citizens/${formData.public_slug}` : '#';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">🌐 Visibility & Public Profile</h3>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isEditing 
              ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Settings'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Toggle Public */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">Public Citizen Profile</div>
            <div className="text-sm text-gray-500">Make this agent visible in the City Directory</div>
          </div>
          <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
            <input
              type="checkbox"
              id="toggle-public"
              className="peer absolute w-12 h-6 opacity-0 z-10 cursor-pointer"
              checked={formData.is_public}
              disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
            />
            <label
              htmlFor="toggle-public"
              className={`block h-6 rounded-full cursor-pointer transition-colors ${
                formData.is_public ? 'bg-green-500' : 'bg-gray-300'
              }`}
            ></label>
            <div
              className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                formData.is_public ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Public Slug</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                /citizens/
              </span>
              <input
                type="text"
                value={formData.public_slug}
                onChange={(e) => setFormData({ ...formData, public_slug: e.target.value })}
                disabled={!isEditing}
                placeholder="agent-name"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Unique identifier for public URL</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Public Title</label>
            <input
              type="text"
              value={formData.public_title}
              onChange={(e) => setFormData({ ...formData, public_title: e.target.value })}
              disabled={!isEditing}
              placeholder="e.g. City Guide"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Public Tagline</label>
            <input
              type="text"
              value={formData.public_tagline}
              onChange={(e) => setFormData({ ...formData, public_tagline: e.target.value })}
              disabled={!isEditing}
              placeholder="Short description for the card..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
            />
          </div>
        </div>

        {/* Preview Link */}
        {formData.is_public && formData.public_slug && (
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
            >
              View Public Profile ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

