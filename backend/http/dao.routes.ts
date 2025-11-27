/**
 * DAO Routes
 * Based on: api-mvp.md
 * 
 * Endpoints:
 * - POST /api/v1/dao - Create DAO
 * - GET /api/v1/dao/{dao_id} - Get DAO by ID
 * - GET /api/v1/dao - List DAOs
 */

import { Router } from 'express';
import { daoFactoryService } from '../../services/dao-factory/dao-factory.service';
import { registryService } from '../../services/registry/registry.service';
import type { CreateDaoInput } from '../../domain/dao/types';

export const daoRoutes = Router();

// POST /api/v1/dao - Create DAO
daoRoutes.post('/', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const input: CreateDaoInput = req.body;
    
    const result = await daoFactoryService.createDao(userId, input);
    
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'BAD_REQUEST',
      message: error.message,
    });
  }
});

// GET /api/v1/dao/{dao_id} - Get DAO by ID
daoRoutes.get('/:daoId', async (req, res) => {
  try {
    const { daoId } = req.params;
    const dao = await registryService.getDaoById(daoId);
    
    if (!dao) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: `DAO ${daoId} not found`,
      });
      return;
    }
    
    res.json(dao);
  } catch (error: any) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});

// GET /api/v1/dao - List DAOs
daoRoutes.get('/', async (req, res) => {
  try {
    const { level, type } = req.query;
    const filter = {
      level: level as string | undefined,
      type: type as string | undefined,
    };
    
    const daos = await registryService.listDaos(filter);
    
    res.json({ items: daos });
  } catch (error: any) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});


