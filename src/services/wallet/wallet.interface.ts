/**
 * Wallet Service Interface
 * Based on: core-services-mvp.md
 */

import type { Balance } from '../../domain/wallet/types';

export interface WalletService {
  getBalances(userId: string): Promise<Balance[]>;
  hasEnoughForDaoCreate(userId: string): Promise<boolean>;
  hasEnoughForVendorRegister(userId: string): Promise<boolean>;
  hasEnoughForPlatformCreate(userId: string): Promise<boolean>;
}


