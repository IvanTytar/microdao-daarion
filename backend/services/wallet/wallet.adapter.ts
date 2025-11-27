/**
 * Wallet Adapter (MVP Stub)
 * 
 * On MVP: returns mock data or reads from DB/stub
 * Future: integrate with on-chain data
 */

import type { Balance } from '../../domain/wallet/types';

/**
 * Get balances from external source (on-chain / DB / stub)
 */
export async function getBalances(userId: string): Promise<Balance[]> {
  // MVP: Return mock data
  // TODO: Replace with actual DB/on-chain integration
  return [
    { symbol: 'DAAR', amount: '0.0' },
    { symbol: 'DAARION', amount: '0.0' },
  ];
}

/**
 * Get staked DAARION amount
 */
export async function getStakedDaarion(userId: string): Promise<number> {
  // MVP: Return mock data
  // TODO: Replace with actual DB/on-chain integration
  return 0.0;
}

export const walletAdapter = {
  getBalances,
  getStakedDaarion,
};


