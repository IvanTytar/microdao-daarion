/**
 * Сторінка Follow-ups (задачі, нагадування, action items)
 */

import { useState, useEffect } from 'react';
import { 
  getMyFollowups, 
  getChannelFollowups,
  createFollowup,
  updateFollowup,
  completeFollowup,
  deleteFollowup,
  type Followup,
  type CreateFollowupPayload
} from '../../api/followups';

export function FollowupsPage() {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [filter, setFilter] = useState<'all' | 'my' | 'pending' | 'completed'>('my');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newFollowup, setNewFollowup] = useState<Partial<CreateFollowupPayload>>({
    title: '',
    priority: 'medium',
  });

  // Завантаження follow-ups
  useEffect(() => {
    loadFollowups();
  }, [filter]);

  const loadFollowups = async () => {
    setIsLoading(true);
    try {
      const data = await getMyFollowups();
      
      let filtered = data;
      if (filter === 'pending') {
        filtered = data.filter(f => f.status === 'pending' || f.status === 'in_progress');
      } else if (filter === 'completed') {
        filtered = data.filter(f => f.status === 'completed');
      }
      
      setFollowups(filtered);
    } catch (error) {
      console.error('Failed to load followups:', error);
      // Fallback до mock даних
      setFollowups([
        {
          id: '1',
          title: 'Підготувати звіт по Phase 8',
          description: 'Створити документацію DAO Dashboard',
          channelId: 'daarion-dev',
          status: 'pending',
          priority: 'high',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newFollowup.title || !newFollowup.channelId) {
      alert('Заповніть обов\'язкові поля!');
      return;
    }

    try {
      await createFollowup(newFollowup as CreateFollowupPayload);
      setNewFollowup({ title: '', priority: 'medium' });
      setIsCreating(false);
      loadFollowups();
    } catch (error) {
      console.error('Failed to create followup:', error);
      alert('Помилка створення follow-up');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeFollowup(id);
      loadFollowups();
    } catch (error) {
      console.error('Failed to complete followup:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Видалити follow-up?')) return;
    
    try {
      await deleteFollowup(id);
      loadFollowups();
    } catch (error) {
      console.error('Failed to delete followup:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Follow-ups</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Створити Follow-up
        </button>
      </div>

      {/* Фільтри */}
      <div className="flex gap-2 mb-6">
        {(['my', 'pending', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg transition ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f === 'my' && 'Мої'}
            {f === 'pending' && 'Активні'}
            {f === 'completed' && 'Виконані'}
          </button>
        ))}
      </div>

      {/* Форма створення */}
      {isCreating && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-bold mb-4">Новий Follow-up</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Назва *"
              value={newFollowup.title}
              onChange={(e) => setNewFollowup({ ...newFollowup, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <textarea
              placeholder="Опис"
              value={newFollowup.description || ''}
              onChange={(e) => setNewFollowup({ ...newFollowup, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="ID каналу *"
                value={newFollowup.channelId || ''}
                onChange={(e) => setNewFollowup({ ...newFollowup, channelId: e.target.value })}
                className="px-4 py-2 border rounded-lg"
              />
              <select
                value={newFollowup.priority}
                onChange={(e) => setNewFollowup({ ...newFollowup, priority: e.target.value as any })}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="low">Низький пріоритет</option>
                <option value="medium">Середній пріоритет</option>
                <option value="high">Високий пріоритет</option>
              </select>
            </div>
            <input
              type="datetime-local"
              value={newFollowup.dueDate?.slice(0, 16) || ''}
              onChange={(e) => setNewFollowup({ ...newFollowup, dueDate: new Date(e.target.value).toISOString() })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Створити
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список follow-ups */}
      {isLoading ? (
        <div className="text-center py-12">Завантаження...</div>
      ) : followups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Немає follow-ups</div>
      ) : (
        <div className="space-y-4">
          {followups.map((followup) => (
            <div
              key={followup.id}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{followup.title}</h3>
                  {followup.description && (
                    <p className="text-gray-600 mb-3">{followup.description}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-sm ${getPriorityColor(followup.priority)}`}>
                      {followup.priority === 'high' && 'Високий'}
                      {followup.priority === 'medium' && 'Середній'}
                      {followup.priority === 'low' && 'Низький'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(followup.status)}`}>
                      {followup.status === 'pending' && 'Очікує'}
                      {followup.status === 'in_progress' && 'В процесі'}
                      {followup.status === 'completed' && 'Виконано'}
                      {followup.status === 'cancelled' && 'Скасовано'}
                    </span>
                    {followup.dueDate && (
                      <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                        До: {new Date(followup.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {followup.status !== 'completed' && (
                    <button
                      onClick={() => handleComplete(followup.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      ✓ Виконано
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(followup.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Видалити
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

