import React, { useState, useEffect } from 'react';
import { getBalances } from '../../api/wallet';
import { inviteMember } from '../../api/teams';
import type { Team } from '../../types/api';

interface InviteMemberFormProps {
  team: Team;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InviteMemberForm({ team, onSuccess, onCancel }: InviteMemberFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canInvite, setCanInvite] = useState(false);
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
      setCanInvite(balance >= 1.0); // Admin needs 1 DAARION to invite
    } catch (err: any) {
      setError('Помилка перевірки балансу: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canInvite) {
      setError('Недостатньо DAARION на балансі. Потрібно мінімум 1.00 DAARION для запрошення');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await inviteMember(team.id, { email, role });
      
      setEmail('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Помилка запрошення користувача');
    } finally {
      setLoading(false);
    }
  };

  const requiredBalance = role === 'admin' ? 1.0 : 0.01;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        Запросити користувача в {team.name}
      </h2>

      {/* Balance Check */}
      <div className={`mb-4 p-3 rounded ${canInvite ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={canInvite ? 'text-green-600' : 'text-red-600'}>
            {canInvite ? '✓' : '✗'}
          </span>
          <span className="text-sm">
            Ваш баланс DAARION: <strong>{daarionBalance.toFixed(2)}</strong>
            {!canInvite && ' (потрібно ≥ 1.00 для запрошення)'}
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          Запрошений користувач має мати:
          <strong className="ml-1">
            {role === 'admin' ? '≥ 1.00 DAARION' : '≥ 0.01 DAARION'}
          </strong>
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
            Email користувача *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Роль *
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="member">Member (потрібно ≥ 0.01 DAARION)</option>
            <option value="admin">Admin (потрібно ≥ 1.00 DAARION)</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {role === 'admin' 
              ? 'Admin може запрошувати інших користувачів та керувати MicroDAO'
              : 'Member може використовувати функції MicroDAO'}
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !canInvite}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Запрошення...' : 'Запросити'}
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

