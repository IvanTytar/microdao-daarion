/**
 * Auth Middleware
 * Validates Bearer token
 * MVP: Simple validation, replace with proper JWT validation later
 */

import type { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header',
    });
    return;
  }
  
  const token = authHeader.substring(7);
  
  // MVP: Simple validation (just check token exists)
  // TODO: Validate JWT token properly
  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid token',
    });
    return;
  }
  
  // Attach user ID to request (MVP: extract from token)
  // TODO: Decode JWT and extract userId
  (req as any).userId = 'user_stub'; // Replace with actual user ID from token
  
  next();
}


