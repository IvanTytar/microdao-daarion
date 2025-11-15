/**
 * Context Middleware
 * Extracts X-DAO-ID header and attaches to request context
 */

import type { Request, Response, NextFunction } from 'express';

export function contextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const daoId = req.headers['x-dao-id'] as string | undefined;
  
  if (daoId) {
    (req as any).daoId = daoId;
  }
  
  next();
}


