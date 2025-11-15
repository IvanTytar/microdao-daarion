/**
 * Platforms Routes
 * Based on: api-mvp.md
 * 
 * Endpoints:
 * - POST /api/v1/platforms - Create platform
 * - GET /api/v1/platforms - List platforms
 */

import { Router } from 'express';
import { daoFactoryService } from '../../services/dao-factory/dao-factory.service';
import { registryService } from '../../services/registry/registry.service';
import type { CreatePlatformInput } from '../../domain/dao/types';

export const platformsRoutes = Router();

// POST /api/v1/platforms - Create platform
platformsRoutes.post('/', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const input: CreatePlatformInput = req.body;
    
    const result = await daoFactoryService.createPlatform(userId, input);
    
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'BAD_REQUEST',
      message: error.message,
    });
  }
});

// GET /api/v1/platforms - List platforms
platformsRoutes.get('/', async (req, res) => {
  try {
    const platforms = await registryService.listPlatforms();
    
    res.json({ items: platforms });
  } catch (error: any) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});


