/**
 * Registry Service (MVP)
 * Based on: core-services-mvp.md
 * 
 * Responsibilities:
 * - Store all DAO information
 * - Mark DAO as platform (A2) or MicroDAO (A3/A4)
 * - Provide public catalog of DAO/platforms
 */

import type { DaoRecord } from '../../domain/dao/types';
import { daoRepository } from '../../infra/db/dao.repository';

export class RegistryService {
  /**
   * Save DAO record to registry
   */
  async saveDao(record: DaoRecord): Promise<void> {
    await daoRepository.save(record);
  }

  /**
   * Get DAO by ID
   */
  async getDaoById(daoId: string): Promise<DaoRecord | null> {
    return daoRepository.findById(daoId);
  }

  /**
   * List DAOs with optional filters
   */
  async listDaos(filter?: { level?: string; type?: string }): Promise<DaoRecord[]> {
    return daoRepository.findAll(filter);
  }

  /**
   * List all platforms (A2, type=platform)
   */
  async listPlatforms(): Promise<DaoRecord[]> {
    return daoRepository.findAll({ level: 'A2', type: 'platform' });
  }
}

// Singleton instance
export const registryService = new RegistryService();


