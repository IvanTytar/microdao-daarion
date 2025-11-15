/**
 * Domain types for Wallet
 * Based on: core-services-mvp.md, tokenomics/city-tokenomics.md
 */

export type TokenSymbol = 'DAAR' | 'DAARION';

export interface Balance {
  symbol: TokenSymbol;
  amount: string; // Decimal as string to avoid precision issues
}

export interface WalletBalances {
  userId: string;
  balances: Balance[];
}

export interface AccessCheck {
  check: 'dao.create' | 'vendor.register' | 'platform.create';
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}


