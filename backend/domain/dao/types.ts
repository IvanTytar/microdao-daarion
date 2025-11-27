/**
 * Domain types for DAO entities
 * Based on: microdao-architecture.md, superdao-federation.md
 */

export type DaoLevel = 'A1' | 'A2' | 'A3' | 'A4';
export type DaoType = 'platform' | 'public' | 'private';
export type FederationMode = 'none' | 'member' | 'superdao';

export interface DaoRecord {
  daoId: string;
  name: string;
  description?: string;
  level: DaoLevel;
  type: DaoType;
  parentDaoId?: string | null;
  federationMode: FederationMode;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDaoInput {
  name: string;
  description?: string;
  type: 'public' | 'private';
  level: 'A3' | 'A4';
  settings?: Record<string, unknown>;
}

export interface CreatePlatformInput {
  name: string;
  slug: string;
  description?: string;
  domain?: string; // 'energy' | 'food' | 'water' | ...
}


