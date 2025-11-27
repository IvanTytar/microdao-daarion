/**
 * Pure domain logic for DAO operations
 * No I/O, no side effects
 */

import type { DaoRecord, DaoLevel, FederationMode } from './types';

/**
 * Check if DAO can become a SuperDAO
 */
export function canBecomeSuperDao(dao: DaoRecord, childCount: number): boolean {
  return childCount >= 1 && dao.federationMode === 'none';
}

/**
 * Check if DAO can join a federation
 */
export function canJoinFederation(dao: DaoRecord, targetLevel: DaoLevel): boolean {
  // A3/A4 can join, exceptions for A2 handled by PDP
  return (dao.level === 'A3' || dao.level === 'A4') && dao.federationMode === 'none';
}

/**
 * Check if DAO can leave federation
 */
export function canLeaveFederation(dao: DaoRecord): boolean {
  return dao.federationMode === 'member' && dao.parentDaoId !== null;
}


