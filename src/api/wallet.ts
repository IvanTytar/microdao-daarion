import { apiGet } from './client';
import type { Balance } from '../domain/wallet/types';

export interface WalletBalancesResponse {
  balances: Balance[];
}

export async function getBalances(): Promise<WalletBalancesResponse> {
  return apiGet<WalletBalancesResponse>('/api/v1/wallet/balances');
}

