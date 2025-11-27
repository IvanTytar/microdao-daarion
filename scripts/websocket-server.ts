/**
 * Simple WebSocket Server for Real-time Events
 * Підключається до Vite dev server
 */
// @ts-nocheck
import { WebSocketServer } from 'ws';
import type { ViteDevServer } from 'vite';

interface MonitorEvent {
  type: 'metrics' | 'log' | 'alert' | 'status';
  timestamp: string;
  data: any;
}

export function setupWebSocketServer(server: ViteDevServer) {
  const wss = new WebSocketServer({ noServer: true });

  // Список підключених клієнтів
  const clients = new Set<any>();

  wss.on('connection', (ws) => {
    console.log('✅ WebSocket client connected');
    clients.add(ws);

    // Відправити вітальне повідомлення
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      message: 'Connected to MicroDAO Monitor Events',
    }));

    // Періодично відправляти тестові події
    const interval = setInterval(() => {
      if (ws.readyState === 1) { // OPEN
        const event: MonitorEvent = {
          type: 'metrics',
          timestamp: new Date().toISOString(),
          data: {
            cpu: Math.random() * 100,
            memory: Math.random() * 100,
            activeAgents: 50 + Math.floor(Math.random() * 10),
          },
        };
        ws.send(JSON.stringify(event));
      }
    }, 5000); // Кожні 5 секунд

    ws.on('message', (message: string) => {
      console.log('Received:', message.toString());
      
      // Echo back
      ws.send(JSON.stringify({
        type: 'echo',
        timestamp: new Date().toISOString(),
        originalMessage: message.toString(),
      }));
    });

    ws.on('close', () => {
      console.log('❌ WebSocket client disconnected');
      clients.delete(ws);
      clearInterval(interval);
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
      clearInterval(interval);
    });
  });

  // Підключити WebSocket до HTTP server
  server.httpServer?.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws/events') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Broadcast функція для відправки подій всім клієнтам
  const broadcast = (event: MonitorEvent) => {
    const message = JSON.stringify(event);
    clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    });
  };

  return {
    wss,
    broadcast,
    clientCount: () => clients.size,
  };
}

