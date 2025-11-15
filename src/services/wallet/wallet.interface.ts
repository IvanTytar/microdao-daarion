/**
 * Wallet Service Interface
 * Based on: core-services-mvp.md, updated for MicroDAO requirements
 */

import type { Balance } from '../../domain/wallet/types';

export interface WalletService {
  getBalances(userId: string): Promise<Balance[]>;
  getDaarionBalance(userId: string): Promise<number>;
  
  // MicroDAO access checks (balance-based, no staking)
  hasEnoughForMicroDaoCreate(userId: string): Promise<boolean>; // 1 DAARION
  hasEnoughForAdminRole(userId: string): Promise<boolean>; // 1 DAARION
  hasEnoughForMicroDaoUsage(userId: string): Promise<boolean>; // 0.01 DAARION
  
  // Legacy methods (deprecated)
  hasEnoughForDaoCreate(userId: string): Promise<boolean>;
  hasEnoughForVendorRegister(userId: string): Promise<boolean>;
  hasEnoughForPlatformCreate(userId: string): Promise<boolean>;
}


