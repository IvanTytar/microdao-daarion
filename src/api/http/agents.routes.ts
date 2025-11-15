/**
 * Agents Routes (MVP Stub)
 * Based on: api-mvp.md
 * 
 * Endpoints:
 * - POST /api/v1/dao/{dao_id}/agents/{agent_id}/invoke - Invoke agent
 */

import { Router } from 'express';
import { pdpService } from '../../services/pdp/pdp.service';

export const agentsRoutes = Router();

// POST /api/v1/dao/{dao_id}/agents/{agent_id}/invoke - Invoke agent
agentsRoutes.post('/:daoId/agents/:agentId/invoke', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { daoId, agentId } = req.params;
    const { input, metadata } = req.body;
    
    // Check PDP policy
    const pdpResult = await pdpService.check(
      'policy.agent.run',
      { agentId },
      { userId, daoId }
    );
    
    if (pdpResult.decision !== 'allow') {
      res.status(403).json({
        error: 'ACCESS_DENIED',
        message: pdpResult.reason || 'PDP denied',
      });
      return;
    }
    
    // MVP: Return stub response
    // TODO: Implement actual agent invocation
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      run_id: runId,
      status: 'queued',
      output: null,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});


