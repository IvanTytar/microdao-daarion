/**
 * PDP Routes
 * Based on: api-mvp.md
 * 
 * Endpoints:
 * - POST /api/v1/pdp/check - Check policy
 */

import { Router } from 'express';
import { pdpService } from '../../services/pdp/pdp.service';
import type { PdpRequest } from '../../domain/pdp/policy.model';

export const pdpRoutes = Router();

// POST /api/v1/pdp/check - Check policy
pdpRoutes.post('/check', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { policy, resource, context }: PdpRequest = req.body;
    
    const result = await pdpService.check(policy, resource, {
      ...context,
      userId: context.userId || userId,
    });
    
    res.json({
      decision: result.decision,
      reason: result.reason || null,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});


