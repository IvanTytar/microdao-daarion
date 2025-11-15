/**
 * Wallet Service (MVP)
 * Based on: core-services-mvp.md
 * 
 * Responsibilities:
 * - Read DAAR / DAARION balances
 * - Provide helper functions for access checks
 */

import type { WalletService as IWalletService } from './wallet.interface';
import { walletAdapter } from './wallet.adapter';
import type { Balance, TokenSymbol } from '../../domain/wallet/types';

export class WalletService implements IWalletService {
  /**
   * Get user balances for DAAR and DAARION
   */
  async getBalances(userId: string): Promise<Balance[]> {
    return walletAdapter.getBalances(userId);
  }

  /**
   * Check if user has enough DAARION to create a MicroDAO
   * Requires: 1 DAARION on balance (not staked)
   */
  async hasEnoughForMicroDaoCreate(userId: string): Promise<boolean> {
    const balances = await this.getBalances(userId);
    const daarion = balances.find(b => b.symbol === 'DAARION');
    return daarion ? parseFloat(daarion.amount) >= 1.0 : false;
  }

  /**
   * Check if user has enough DAARION to be Admin
   * Requires: 1 DAARION on balance (not staked)
   */
  async hasEnoughForAdminRole(userId: string): Promise<boolean> {
    return this.hasEnoughForMicroDaoCreate(userId);
  }

  /**
   * Check if user has enough DAARION to use MicroDAO service
   * Requires: 0.01 DAARION on balance (not staked)
   */
  async hasEnoughForMicroDaoUsage(userId: string): Promise<boolean> {
    const balances = await this.getBalances(userId);
    const daarion = balances.find(b => b.symbol === 'DAARION');
    return daarion ? parseFloat(daarion.amount) >= 0.01 : false;
  }

  /**
   * Get DAARION balance for user
   */
  async getDaarionBalance(userId: string): Promise<number> {
    const balances = await this.getBalances(userId);
    const daarion = balances.find(b => b.symbol === 'DAARION');
    return daarion ? parseFloat(daarion.amount) : 0;
  }

  // Legacy methods (deprecated, kept for backward compatibility)
  /**
   * @deprecated Use hasEnoughForMicroDaoCreate instead
   */
  async hasEnoughForDaoCreate(userId: string): Promise<boolean> {
    return this.hasEnoughForMicroDaoCreate(userId);
  }

  /**
   * @deprecated Not used in current implementation
   */
  async hasEnoughForVendorRegister(userId: string): Promise<boolean> {
    return this.hasEnoughForMicroDaoUsage(userId);
  }

  /**
   * @deprecated Not used in current implementation
   */
  async hasEnoughForPlatformCreate(userId: string): Promise<boolean> {
    return this.hasEnoughForMicroDaoCreate(userId);
  }
}

// Singleton instance
export const walletService = new WalletService();


