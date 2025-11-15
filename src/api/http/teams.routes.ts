/**
 * Teams Routes (MicroDAO)
 * Based on: api-mvp.md, updated for MicroDAO creation with balance checks
 * 
 * Endpoints:
 * - POST /api/v1/teams - Create MicroDAO (requires 1 DAARION on balance)
 * - GET /api/v1/teams - List teams/MicroDAO
 * - GET /api/v1/teams/:teamId - Get team/MicroDAO by ID
 * - POST /api/v1/teams/:teamId/members - Invite member (requires balance check)
 */

import { Router } from 'express';
import { walletService } from '../../services/wallet/wallet.service';
import { daoFactoryService } from '../../services/dao-factory/dao-factory.service';
import type { CreateTeamRequest } from '../../../types/api';

export const teamsRoutes = Router();

// POST /api/v1/teams - Create MicroDAO
teamsRoutes.post('/', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const input: CreateTeamRequest = req.body;
    
    // 1. Check wallet balance - need 1 DAARION on balance
    const hasEnough = await walletService.hasEnoughForMicroDaoCreate(userId);
    if (!hasEnough) {
      res.status(403).json({
        error: 'INSUFFICIENT_BALANCE',
        message: 'Need 1 DAARION on balance to create MicroDAO',
        required: { daarion: 1.0 },
      });
      return;
    }
    
    // 2. Create MicroDAO through DAOFactory
    const daoResult = await daoFactoryService.createDao(userId, {
      name: input.name,
      description: input.description,
      type: input.mode === 'confidential' ? 'private' : 'public',
      level: 'A4', // User-created MicroDAO are A4 level
    });
    
    // 3. TODO: Create team record in database
    // For now, return DAO result
    res.status(201).json({
      id: daoResult.daoId,
      name: input.name,
      description: input.description,
      mode: input.mode || 'public',
      type: input.type || 'community',
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message?.includes('INSUFFICIENT_BALANCE') ? 'INSUFFICIENT_BALANCE' : 'BAD_REQUEST',
      message: error.message,
    });
  }
});

// GET /api/v1/teams - List teams/MicroDAO
teamsRoutes.get('/', async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    // TODO: Get teams from database
    // For now, return empty list
    res.json({ teams: [] });
  } catch (error: any) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});

// GET /api/v1/teams/:teamId - Get team/MicroDAO by ID
teamsRoutes.get('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // TODO: Get team from database
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Team ${teamId} not found`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});

// POST /api/v1/teams/:teamId/members - Invite member
teamsRoutes.post('/:teamId/members', async (req, res) => {
  try {
    const userId = (req as any).userId; // Current user (admin)
    const { teamId } = req.params;
    const { email, role = 'member' } = req.body;
    
    // 1. Check if current user is admin (has 1 DAARION)
    const isAdmin = await walletService.hasEnoughForAdminRole(userId);
    if (!isAdmin) {
      res.status(403).json({
        error: 'ACCESS_DENIED',
        message: 'Need 1 DAARION on balance to invite members',
      });
      return;
    }
    
    // 2. Check invited user balance based on role
    // TODO: Get invited user ID from email
    const invitedUserId = `user_${email}`; // Placeholder
    
    if (role === 'admin') {
      // Admin role requires 1 DAARION
      const hasEnough = await walletService.hasEnoughForAdminRole(invitedUserId);
      if (!hasEnough) {
        res.status(403).json({
          error: 'INSUFFICIENT_BALANCE',
          message: 'Invited user needs 1 DAARION on balance to be Admin',
          required: { daarion: 1.0 },
        });
        return;
      }
    } else {
      // Member role requires 0.01 DAARION
      const hasEnough = await walletService.hasEnoughForMicroDaoUsage(invitedUserId);
      if (!hasEnough) {
        res.status(403).json({
          error: 'INSUFFICIENT_BALANCE',
          message: 'Invited user needs 0.01 DAARION on balance to use MicroDAO',
          required: { daarion: 0.01 },
        });
        return;
      }
    }
    
    // 3. TODO: Create team member record in database
    res.status(201).json({
      team_id: teamId,
      user_id: invitedUserId,
      email,
      role,
      status: 'invited',
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: error.message,
    });
  }
});

