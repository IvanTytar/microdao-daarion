/**
 * Vite Plugin для локального API сервера (NODE2)
 * Обслуговує endpoints для агентів, teams, channels
 */
// @ts-nocheck
import type { Plugin } from 'vite';

// Список агентів NODE2 (50 агентів)
const NODE2_AGENTS = [
  {
    id: 'agent-monitor-node2',
    name: 'Monitor Agent (НОДА2)',
    role: 'System Monitoring & Event Logging (Node-2)',
    model: 'mistral-nemo:12b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'high',
    category: 'System',
    team_id: 'daarion-dao',
  },
  {
    id: 'agent-solarius',
    name: 'Solarius',
    role: 'CEO of DAARION microDAO Node-2',
    model: 'deepseek-r1:70b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'highest',
    team_id: 'daarion-dao',
  },
  {
    id: 'agent-sofia',
    name: 'Sofia',
    role: 'Chief AI Engineer & R&D Orchestrator',
    model: 'grok-4.1',
    backend: 'xai',
    status: 'active',
    node: 'node-2',
    priority: 'highest',
    team_id: 'daarion-dao',
  },
  // Додамо більше агентів для повного списку
  ...Array.from({ length: 47 }, (_, i) => ({
    id: `agent-daarion-${i + 1}`,
    name: `DAARION Agent ${i + 1}`,
    role: `Specialized Agent ${i + 1}`,
    model: 'qwen3:8b',
    backend: 'ollama',
    status: 'active',
    node: 'node-2',
    priority: 'medium',
    category: 'Domain',
    team_id: 'daarion-dao',
  })),
];

export function viteApiPlugin(): Plugin {
  return {
    name: 'vite-api-plugin',
    async configureServer(server) {
      // Додаємо WebSocket server
      try {
        const { setupWebSocketServer } = await import('./websocket-server');
        const wsServer = setupWebSocketServer(server);
        console.log('✅ WebSocket server initialized at ws://localhost:8899/ws/events');
      } catch (error) {
        console.warn('⚠️ WebSocket server not available:', error);
      }

      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // API: Get all agents
        if (url.startsWith('/api/agents')) {
          const urlParams = new URL(url, `http://${req.headers.host}`);
          const teamId = urlParams.searchParams.get('team_id');
          
          let agents = NODE2_AGENTS;
          if (teamId) {
            agents = NODE2_AGENTS.filter(a => a.team_id === teamId);
          }

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ agents }));
          return;
        }

        // API: Get agent health
        if (url.match(/\/api\/agent\/[^/]+\/health/)) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ 
            status: 'healthy', 
            timestamp: new Date().toISOString() 
          }));
          return;
        }

        // WebSocket events endpoint (mock)
        if (url === '/ws/events') {
          // Для WebSocket потрібна окрема імплементація
          res.writeHead(426, { 'Content-Type': 'text/plain' });
          res.end('WebSocket upgrade required');
          return;
        }

        next();
      });
    },
  };
}

