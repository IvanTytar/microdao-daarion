/**
 * Application Entry Point
 * Sets up HTTP server and registers routes
 */

import express from 'express';
import { config } from './infra/config/env';
import { logger } from './infra/logger/logger';
import { authMiddleware } from './api/middleware/auth.middleware';
import { contextMiddleware } from './api/middleware/context.middleware';
import { daoRoutes } from './api/http/dao.routes';
import { walletRoutes } from './api/http/wallet.routes';
import { pdpRoutes } from './api/http/pdp.routes';
import { vendorRoutes } from './api/http/vendor.routes';
import { platformsRoutes } from './api/http/platforms.routes';
import { agentsRoutes } from './api/http/agents.routes';
import { teamsRoutes } from './api/http/teams.routes';

const app = express();

// Middleware
app.use(express.json());
app.use(authMiddleware);
app.use(contextMiddleware);

// Routes
app.use('/api/v1/dao', daoRoutes);
app.use('/api/v1/teams', teamsRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/pdp', pdpRoutes);
app.use('/api/v1/platforms', platformsRoutes);
app.use('/api/v1/platforms', vendorRoutes); // Vendor routes under platforms
app.use('/api/v1', agentsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const port = config.port;
app.listen(port, () => {
  logger.info(`Server started on port ${port}`);
});

export default app;

