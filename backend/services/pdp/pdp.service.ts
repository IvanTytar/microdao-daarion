/**
 * PDP Service (MVP)
 * Based on: pdp_access.md, core-services-mvp.md
 * 
 * Responsibilities:
 * - Centralized access decision making
 * - Interpret policies from pdp_access.md
 * - Provide simple API for other services
 */

import type { PdpRequest, PdpResponse, PolicyId, PdpContext } from '../../domain/pdp/policy.model';
import { policiesConfig } from './policies.config';
import { walletService } from '../wallet/wallet.service';

export class PdpService {
  /**
   * Check policy and return decision
   */
  async check(
    policyId: PolicyId,
    resource: Record<string, unknown>,
    context: PdpContext
  ): Promise<PdpResponse> {
    const policy = policiesConfig[policyId];
    
    if (!policy) {
      return {
        decision: 'deny',
        reason: `Policy ${policyId} not found`,
      };
    }

    // Evaluate policy conditions
    const result = await this.evaluatePolicy(policy, resource, context);
    
    return result;
  }

  private async evaluatePolicy(
    policy: any,
    resource: Record<string, unknown>,
    context: PdpContext
  ): Promise<PdpResponse> {
    // MVP: Simple evaluation
    // Future: More complex condition evaluation
    
    // Example: policy.dao.create
    if (policy.id === 'policy.dao.create') {
      const hasEnough = await walletService.hasEnoughForDaoCreate(context.userId || '');
      if (!hasEnough) {
        return {
          decision: 'deny',
          reason: 'INSUFFICIENT_BALANCE',
          details: {
            required: { DAAR: 1.0, DAARION: 0.01 },
          },
        };
      }
      return { decision: 'allow' };
    }

    // Example: policy.platform.create
    if (policy.id === 'policy.platform.create') {
      const hasEnough = await walletService.hasEnoughForPlatformCreate(context.userId || '');
      if (!hasEnough) {
        return {
          decision: 'deny',
          reason: 'INSUFFICIENT_BALANCE',
          details: {
            required: { DAARION: 1.0 },
          },
        };
      }
      return { decision: 'allow' };
    }

    // Example: policy.vendor.register
    if (policy.id === 'policy.vendor.register') {
      const hasEnough = await walletService.hasEnoughForVendorRegister(context.userId || '');
      if (!hasEnough) {
        return {
          decision: 'deny',
          reason: 'INSUFFICIENT_STAKED_DAARION',
          details: {
            required: { DAARION: 0.01 },
          },
        };
      }
      return { decision: 'allow' };
    }

    // Default: allow (for MVP, can be more restrictive later)
    return { decision: 'allow' };
  }
}

// Singleton instance
export const pdpService = new PdpService();


