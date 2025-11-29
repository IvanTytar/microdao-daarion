import { useState } from 'react';
import { createMicroDaoFromAgent } from '@/api/microdaoWizard';

interface MicroDaoWizardProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  onSuccess: () => void;
}

export function MicroDaoWizard({ isOpen, onClose, agentId, onSuccess }: MicroDaoWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    visibility: 'public' as 'public' | 'confidential',
    district: '',
    create_rooms: {
      primary_lobby: true,
      governance: true,
      crew_team: false
    }
  });

  if (!isOpen) return null;

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await createMicroDaoFromAgent({
        agent_id: agentId,
        ...formData
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create MicroDAO');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setFormData(prev => ({ ...prev, name, slug: prev.slug ? prev.slug : slug }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Create MicroDAO</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Steps Progress */}
          <div className="flex items-center mb-8 text-sm">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step === i ? 'bg-blue-600 text-white' : 
                  step > i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > i ? '✓' : i}
                </div>
                {i < 3 && <div className={`w-12 h-1 ${step > i ? 'bg-green-500' : 'bg-gray-200'} mx-2`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MicroDAO Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Solar Punks"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unique Slug</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    /microdao/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="solar-punks"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  rows={3}
                  placeholder="What is this community about?"
                />
              </div>
            </div>
          )}

          {/* Step 2: Visibility */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Visibility</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setFormData({...formData, visibility: 'public'})}
                    className={`p-4 border rounded-xl text-left transition-all ${
                      formData.visibility === 'public' 
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-gray-900 mb-1">Public</div>
                    <div className="text-xs text-gray-500">Visible to everyone in the City Directory.</div>
                  </button>
                  <button
                    onClick={() => setFormData({...formData, visibility: 'confidential'})}
                    className={`p-4 border rounded-xl text-left transition-all ${
                      formData.visibility === 'confidential' 
                        ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-gray-900 mb-1">Confidential</div>
                    <div className="text-xs text-gray-500">Hidden from directory. Invite only.</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District / Platform (Optional)</label>
                <select
                  value={formData.district}
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">None (Independent)</option>
                  <option value="core">Core Infrastructure</option>
                  <option value="green">Green Economy</option>
                  <option value="tech">Tech Labs</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Assigning a district may require approval.</p>
              </div>
            </div>
          )}

          {/* Step 3: Rooms */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-bold text-blue-900 mb-2">Communication Channels</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Select which rooms to create automatically. These will be Matrix-powered chat rooms.
                </p>
                
                <div className="space-y-3 bg-white p-3 rounded border border-blue-100">
                  <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.create_rooms.primary_lobby}
                      onChange={(e) => setFormData({
                        ...formData, 
                        create_rooms: {...formData.create_rooms, primary_lobby: e.target.checked}
                      })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Primary Lobby</div>
                      <div className="text-xs text-gray-500">Public general chat for the community</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.create_rooms.governance}
                      onChange={(e) => setFormData({
                        ...formData, 
                        create_rooms: {...formData.create_rooms, governance: e.target.checked}
                      })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Governance Hall</div>
                      <div className="text-xs text-gray-500">For voting and formal proposals</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.create_rooms.crew_team}
                      onChange={(e) => setFormData({
                        ...formData, 
                        create_rooms: {...formData.create_rooms, crew_team: e.target.checked}
                      })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Crew Team (Internal)</div>
                      <div className="text-xs text-gray-500">Private workspace for agents and core team</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-600 font-medium hover:text-gray-900"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!formData.name || !formData.slug}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                'Create MicroDAO'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

