/**
 * Domain types for User
 */

export type UserRole = 'owner' | 'admin' | 'member' | 'guest' | 'agent';

export interface User {
  userId: string;
  email?: string;
  name?: string;
  roles?: UserRole[];
}


