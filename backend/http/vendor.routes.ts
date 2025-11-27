/**
 * Vendor Routes
 * Based on: api-mvp.md
 * 
 * Endpoints:
 * - POST /api/v1/platforms/{platform_id}/vendors - Register vendor
 */

import { Router } from 'express';
import { pdpService } from '../../services/pdp/pdp.service';

export const vendorRoutes = Router();

// POST /api/v1/platforms/{platform_id}/vendors - Register vendor
vendorRoutes.post('/:platformId/vendors', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { platformId } = req.params;
    const { display_name, contact } = req.body;
    
    // Check PDP policy
    const pdpResult = await pdpService.check(
      'policy.vendor.register',
      { platformId },
      { userId, daoId: platformId, daoLevel: 'A2' }
    );
    
    if (pdpResult.decision !== 'allow') {
      res.status(403).json({
        error: 'ACCESS_DENIED',
        message: pdpResult.reason || 'PDP denied',
      });
      return;
    }
    
    // TODO: Save vendor to database
    const vendorId = `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.status(201).json({
      vendor_id: vendorId,
      platform_id: platformId,
      status: 'approved',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});


