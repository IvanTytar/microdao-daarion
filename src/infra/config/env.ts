/**
 * Environment Configuration
 * Load and validate environment variables
 */

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  
  // Database
  dbUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/microdao',
  
  // Auth
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  
  // Wallet/Chain (future)
  chainRpcUrl: process.env.CHAIN_RPC_URL || '',
};


