import React, { useEffect, useState } from 'react';
import { getBalances } from '../../api/wallet';
import type { Balance } from '../../domain/wallet/types';

export function WalletInfo() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBalances();
  }, []);

  const loadBalances = async () => {
    try {
      setLoading(true);
      const data = await getBalances();
      setBalances(data.balances || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Помилка завантаження балансу');
    } finally {
      setLoading(false);
    }
  };

  const daarionBalance = balances.find(b => b.symbol === 'DAARION');
  const daarBalance = balances.find(b => b.symbol === 'DAAR');

  const canCreateMicroDao = daarionBalance && parseFloat(daarionBalance.amount) >= 1.0;
  const canUseMicroDao = daarionBalance && parseFloat(daarionBalance.amount) >= 0.01;
  const isAdmin = canCreateMicroDao;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Wallet</h2>

      {loading && <div className="text-gray-500">Завантаження...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      {!loading && !error && (
        <div className="space-y-4">
          {/* DAARION Balance */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">DAARION</span>
              <span className="text-2xl font-bold">
                {daarionBalance ? parseFloat(daarionBalance.amount).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <div className={`flex items-center gap-2 ${canCreateMicroDao ? 'text-green-600' : 'text-gray-400'}`}>
                {canCreateMicroDao ? '✓' : '○'} Можна створити MicroDAO (потрібно ≥ 1.00)
              </div>
              <div className={`flex items-center gap-2 ${isAdmin ? 'text-green-600' : 'text-gray-400'}`}>
                {isAdmin ? '✓' : '○'} Роль Admin (потрібно ≥ 1.00)
              </div>
              <div className={`flex items-center gap-2 ${canUseMicroDao ? 'text-green-600' : 'text-gray-400'}`}>
                {canUseMicroDao ? '✓' : '○'} Можна використовувати сервіс (потрібно ≥ 0.01)
              </div>
            </div>
          </div>

          {/* DAAR Balance */}
          {daarBalance && (
            <div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">DAAR</span>
                <span className="text-xl font-semibold">
                  {parseFloat(daarBalance.amount).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {!daarionBalance && !daarBalance && (
            <div className="text-gray-500 text-sm">Немає токенів на балансі</div>
          )}
        </div>
      )}

      <button
        onClick={loadBalances}
        className="mt-4 text-sm text-blue-600 hover:text-blue-800"
      >
        Оновити баланс
      </button>
    </div>
  );
}

