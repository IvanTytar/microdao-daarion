/**
 * DAO Repository
 * Database access layer for DAO records
 * MVP: In-memory storage, replace with actual DB later
 */

import type { DaoRecord } from '../../domain/dao/types';

// MVP: In-memory storage
const daoStore: Map<string, DaoRecord> = new Map();

export const daoRepository = {
  async save(record: DaoRecord): Promise<void> {
    daoStore.set(record.daoId, record);
  },

  async findById(daoId: string): Promise<DaoRecord | null> {
    return daoStore.get(daoId) || null;
  },

  async findAll(filter?: { level?: string; type?: string }): Promise<DaoRecord[]> {
    const all = Array.from(daoStore.values());
    
    if (!filter) {
      return all;
    }

    return all.filter(dao => {
      if (filter.level && dao.level !== filter.level) {
        return false;
      }
      if (filter.type && dao.type !== filter.type) {
        return false;
      }
      return true;
    });
  },

  async delete(daoId: string): Promise<void> {
    daoStore.delete(daoId);
  },
};


