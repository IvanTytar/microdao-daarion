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
   * Check if user has enough tokens to create a DAO
   * Requires: 1 DAAR OR 0.01 DAARION
   */
  async hasEnoughForDaoCreate(userId: string): Promise<boolean> {
    const balances = await this.getBalances(userId);
    
    const daar = balances.find(b => b.symbol === 'DAAR');
    const daarion = balances.find(b => b.symbol === 'DAARION');
    
    // Check: 1 DAAR OR 0.01 DAARION
    const hasEnoughDaar = daar && parseFloat(daar.amount) >= 1.0;
    const hasEnoughDaarion = daarion && parseFloat(daarion.amount) >= 0.01;
    
    return hasEnoughDaar || hasEnoughDaarion;
  }

  /**
   * Check if user has enough staked DAARION for vendor registration
   * Requires: 0.01 DAARION staked
   */
  async hasEnoughForVendorRegister(userId: string): Promise<boolean> {
    const staked = await walletAdapter.getStakedDaarion(userId);
    return staked >= 0.01;
  }

  /**
   * Check if user has enough staked DAARION for platform creation
   * Requires: 1 DAARION staked
   */
  async hasEnoughForPlatformCreate(userId: string): Promise<boolean> {
    const staked = await walletAdapter.getStakedDaarion(userId);
    return staked >= 1.0;
  }
}

// Singleton instance
export const walletService = new WalletService();


