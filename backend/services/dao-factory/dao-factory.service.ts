/**
 * DAOFactory Service (MVP)
 * Based on: core-services-mvp.md
 * 
 * Responsibilities:
 * - Create new DAO (A3/A4)
 * - Create platforms (A2)
 * - Validate input
 * - Call PDP for access checks
 * - Write DAO to Registry
 */

import type { CreateDaoInput, CreatePlatformInput } from '../../domain/dao/types';
import { pdpService } from '../pdp/pdp.service';
import { walletService } from '../wallet/wallet.service';
import { registryService } from '../registry/registry.service';

export class DaoFactoryService {
  /**
   * Create a new MicroDAO (A3 or A4)
   * Requires: 1 DAARION on balance (not staked)
   */
  async createDao(userId: string, input: CreateDaoInput): Promise<{ daoId: string }> {
    // 1. Check wallet balance - need 1 DAARION on balance
    const hasEnough = await walletService.hasEnoughForMicroDaoCreate(userId);
    if (!hasEnough) {
      throw new Error('INSUFFICIENT_BALANCE: Need 1 DAARION on balance to create MicroDAO');
    }

    // 2. Check PDP policy
    const pdpResult = await pdpService.check(
      'policy.dao.create',
      { type: 'dao' },
      { userId, daoLevel: input.level }
    );

    if (pdpResult.decision !== 'allow') {
      throw new Error(`ACCESS_DENIED: ${pdpResult.reason || 'PDP denied'}`);
    }

    // 3. Create DAO record
    const daoId = this.generateDaoId();
    const daoRecord = {
      daoId,
      name: input.name,
      description: input.description,
      level: input.level,
      type: input.type,
      parentDaoId: null,
      federationMode: 'none' as const,
      createdAt: new Date().toISOString(),
    };

    // 4. Save to Registry
    await registryService.saveDao(daoRecord);

    return { daoId };
  }

  /**
   * Create a new platform (A2)
   */
  async createPlatform(userId: string, input: CreatePlatformInput): Promise<{ daoId: string }> {
    // 1. Check wallet balance
    const hasEnough = await walletService.hasEnoughForPlatformCreate(userId);
    if (!hasEnough) {
      throw new Error('INSUFFICIENT_BALANCE: Need 1 DAARION staked');
    }

    // 2. Check PDP policy
    const pdpResult = await pdpService.check(
      'policy.platform.create',
      { type: 'platform' },
      { userId, daoLevel: 'A2' }
    );

    if (pdpResult.decision !== 'allow') {
      throw new Error(`ACCESS_DENIED: ${pdpResult.reason || 'PDP denied'}`);
    }

    // 3. Create platform record
    const daoId = this.generateDaoId();
    const daoRecord = {
      daoId,
      name: input.name,
      description: input.description,
      level: 'A2' as const,
      type: 'platform' as const,
      parentDaoId: null,
      federationMode: 'none' as const,
      createdAt: new Date().toISOString(),
    };

    // 4. Save to Registry
    await registryService.saveDao(daoRecord);

    return { daoId };
  }

  private generateDaoId(): string {
    // MVP: Simple UUID-like generation
    // TODO: Use proper UUID library
    return `dao_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const daoFactoryService = new DaoFactoryService();


