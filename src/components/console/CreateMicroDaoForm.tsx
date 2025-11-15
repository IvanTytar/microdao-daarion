import React, { useState, useEffect } from 'react';
import { createTeam } from '../../api/teams';
import { getBalances } from '../../api/wallet';
import type { Team, CreateTeamRequest } from '../../types/api';
import type { Balance } from '../../domain/wallet/types';

interface CreateMicroDaoFormProps {
  onSuccess?: (team: Team) => void;
  onCancel?: () => void;
}

export function CreateMicroDaoForm({ onSuccess, onCancel }: CreateMicroDaoFormProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'public' | 'confidential'>('public');
  const [type, setType] = useState<'community' | 'guild' | 'lab' | 'personal'>('community');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [daarionBalance, setDaarionBalance] = useState<number>(0);

  useEffect(() => {
    checkBalance();
  }, []);

  const checkBalance = async () => {
    try {
      const data = await getBalances();
      const daarion = data.balances?.find(b => b.symbol === 'DAARION');
      const balance = daarion ? parseFloat(daarion.amount) : 0;
      setDaarionBalance(balance);
      setCanCreate(balance >= 1.0);
    } catch (err: any) {
      setError('Помилка перевірки балансу: ' + err.message);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(newName));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreate) {
      setError('Недостатньо DAARION на балансі. Потрібно мінімум 1.00 DAARION');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: CreateTeamRequest = {
        name,
        slug: slug || generateSlug(name),
        description: description || undefined,
        mode,
        type,
      };

      const team = await createTeam(request);
      onSuccess?.(team);
    } catch (err: any) {
      setError(err.message || 'Помилка створення MicroDAO');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Створити MicroDAO</h2>

      {/* Balance Check */}
      <div className={`mb-4 p-3 rounded ${canCreate ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center gap-2">
          <span className={canCreate ? 'text-green-600' : 'text-red-600'}>
            {canCreate ? '✓' : '✗'}
          </span>
          <span className="text-sm">
            Баланс DAARION: <strong>{daarionBalance.toFixed(2)}</strong>
            {!canCreate && ' (потрібно ≥ 1.00)'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Назва MicroDAO *
          </label>
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Моя спільнота"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug (URL) *
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            pattern="[a-z0-9-]+"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="my-community"
          />
          <p className="mt-1 text-xs text-gray-500">
            Тільки маленькі літери, цифри та дефіси
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Опис
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Опис вашої спільноти..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Тип
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="community">Спільнота</option>
            <option value="guild">Гільдія</option>
            <option value="lab">Лабораторія</option>
            <option value="personal">Особисте</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Режим
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="public">Публічний</option>
            <option value="confidential">Конфіденційний</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !canCreate}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Створення...' : 'Створити MicroDAO'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Скасувати
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

