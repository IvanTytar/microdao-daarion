/**
 * Wallet Routes
 * Based on: api-mvp.md
 * 
 * Endpoints:
 * - GET /api/v1/wallet/me - Get user balances
 * - POST /api/v1/wallet/check-access - Check access for action
 */

import { Router } from 'express';
import { walletService } from '../../services/wallet/wallet.service';
import type { AccessCheck } from '../../domain/wallet/types';

export const walletRoutes = Router();

// GET /api/v1/wallet/me - Get user balances
walletRoutes.get('/me', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const balances = await walletService.getBalances(userId);
    
    res.json({
      user_id: userId,
      balances,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});

// POST /api/v1/wallet/check-access - Check access
walletRoutes.post('/check-access', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { check }: AccessCheck = req.body;
    
    let allowed = false;
    let reason: string | undefined;
    
    switch (check) {
      case 'dao.create':
        allowed = await walletService.hasEnoughForDaoCreate(userId);
        if (!allowed) reason = 'INSUFFICIENT_BALANCE';
        break;
      case 'vendor.register':
        allowed = await walletService.hasEnoughForVendorRegister(userId);
        if (!allowed) reason = 'INSUFFICIENT_STAKED_DAARION';
        break;
      case 'platform.create':
        allowed = await walletService.hasEnoughForPlatformCreate(userId);
        if (!allowed) reason = 'INSUFFICIENT_STAKED_DAARION';
        break;
      default:
        reason = 'UNKNOWN_CHECK';
    }
    
    res.json({
      allowed,
      reason: allowed ? null : reason,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});


