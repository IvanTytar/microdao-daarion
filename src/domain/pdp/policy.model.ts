/**
 * PDP Policy Model
 * Based on: pdp_access.md, core-services-mvp.md
 */

export type Decision = 'allow' | 'deny' | 'require-elevation';

export type PolicyId = 
  | 'policy.dao.create'
  | 'policy.vendor.register'
  | 'policy.platform.create'
  | 'policy.federation.join'
  | 'policy.federation.leave'
  | 'policy.federation.create-superdao'
  | 'policy.federation.dissolve'
  | 'policy.agent.run';

export interface PdpContext {
  userId?: string;
  daoId?: string;
  daoLevel?: 'A1' | 'A2' | 'A3' | 'A4';
  // Additional context: roles, balances, staking, etc.
  [key: string]: unknown;
}

export interface PdpRequest {
  policyId: PolicyId;
  resource: Record<string, unknown>;
  context: PdpContext;
}

export interface PdpResponse {
  decision: Decision;
  reason?: string;
  details?: Record<string, unknown>;
}


