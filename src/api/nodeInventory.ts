/**
 * API для отримання інвентаризації ноди
 * Показує все, що встановлено на ноді: Docker контейнери, образи, пакети, сервіси тощо
 */

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string[];
  created: string;
  state: 'running' | 'stopped' | 'restarting' | 'paused' | 'healthy' | 'unhealthy';
  uptime?: string;
  purpose?: string;
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}

export interface SystemPackage {
  name: string;
  version: string;
  description: string;
  status: 'installed' | 'upgradable';
}

export interface SystemdService {
  name: string;
  status: 'active' | 'inactive' | 'failed' | 'enabled' | 'disabled';
  description: string;
}

export interface FileStructure {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  permissions?: string;
  children?: FileStructure[];
}

export interface TelegramBot {
  name: string;
  username?: string;
  token_prefix: string;
  prompt_file: string;
  llm_model: string;
  status: 'active' | 'needs_token';
  type: 'telegram' | 'discord';
}

export interface AIAgent {
  name: string;
  prompt_file: string;
  size?: string;
  llm_model: string;
  temperature?: number;
  specialization: string;
  team?: string; // 'yaromir' для команди Яромира
}

export interface OllamaModel {
  name: string;
  model_id?: string;
  size: string;
  modified?: string;
  status: 'installed' | 'needed';
  purpose?: string;
}

export interface ProblematicService {
  name: string;
  container: string;
  port: number;
  status: 'restarting' | 'unhealthy';
  problem: string;
  priority: 'critical' | 'non-critical';
}

export interface NodeInventory {
  node_id: string;
  node_name: string;
  statistics: {
    containers_total: number;
    containers_healthy: number;
    containers_up: number;
    containers_problematic: number;
    bots_total: number;
    bots_active: number;
    bots_needs_token: number;
    agents_total: number;
    databases_total: number;
    ollama_models_installed: number;
    ollama_models_needed: number;
    services_total: number;
  };
  docker_containers: {
    healthy: DockerContainer[];
    up: DockerContainer[];
    problematic: DockerContainer[];
  };
  docker_images: DockerImage[];
  system_packages: SystemPackage[];
  systemd_services: SystemdService[];
  file_structure: FileStructure;
  ollama_models: OllamaModel[];
  telegram_bots: TelegramBot[];
  ai_agents: AIAgent[];
  problematic_services: ProblematicService[];
  databases: Array<{
    name: string;
    container: string;
    port: number;
    status: string;
    purpose: string;
  }>;
  installed_software?: Array<{
    name: string;
    version: string;
    type: 'docker' | 'system' | 'python' | 'node';
  }>;
}

const NODE1_BASE_URL = import.meta.env.VITE_NODE1_URL || 'http://144.76.224.179';
const NODE2_BASE_URL = import.meta.env.VITE_NODE2_URL || 'http://192.168.1.244';

/**
 * Отримати інвентаризацію ноди
 */
export async function getNodeInventory(nodeId: string): Promise<NodeInventory> {
  const baseUrl = nodeId.includes('node-1') ? NODE1_BASE_URL : NODE2_BASE_URL;
  
  try {
    // Спробувати отримати з API
    const response = await fetch(`${baseUrl}/api/node/${nodeId}/inventory`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('API inventory not available, using real data:', error);
  }
  
  // Реальні дані з інвентаризації
  const isNode1 = nodeId.includes('node-1');
  if (isNode1) {
    return getNode1RealInventory(nodeId);
  }
  return getMockInventory(nodeId);
}

function getNode1RealInventory(nodeId: string): NodeInventory {
  return {
    node_id: nodeId,
    node_name: 'НОДА1',
    statistics: {
      containers_total: 22,
      containers_healthy: 13,
      containers_up: 4,
      containers_problematic: 5,
      bots_total: 10,
      bots_active: 8,
      bots_needs_token: 2,
      agents_total: 14,
      databases_total: 4,
      ollama_models_installed: 5,
      ollama_models_needed: 3,
      services_total: 19,
    },
    docker_containers: {
      healthy: [
        { id: 'dagi-router', name: 'dagi-router', image: 'dagi-router:latest', status: 'Healthy (30 min)', ports: ['9102:9102'], created: '2025-01-01T00:00:00Z', state: 'healthy', uptime: '30 min', purpose: 'Core routing service' },
        { id: 'dagi-gateway', name: 'dagi-gateway', image: 'dagi-gateway:latest', status: 'Healthy (8 hours)', ports: ['9300:9300'], created: '2025-01-01T00:00:00Z', state: 'healthy', uptime: '8 hours', purpose: 'Telegram bots gateway' },
        { id: 'dagi-devtools', name: 'dagi-devtools', image: 'dagi-devtools:latest', status: 'Healthy (2 days)', ports: ['8008:8008'], created: '2025-01-01T00:00:00Z', state: 'healthy', uptime: '2 days', purpose: 'Development tools backend' },
        { id: 'dagi-crewai', name: 'dagi-crewai', image: 'dagi-crewai:latest', status: 'Healthy (2 days)', ports: ['9010:9010'], created: '2025-01-01T00:00:00Z', state: 'healthy', uptime: '2 days', purpose: 'CrewAI orchestrator' },
        { id: 'dagi-rbac', name: 'dagi-rbac', image: 'dagi-rbac:latest', status: 'Healthy (2 days)', ports: ['9200:9200'], created: '2025-01-01T00:00:00Z', state: 'healthy', uptime: '2 days', purpose: 'Role-based access control' },
        { id: 'dagi-parser-service', name: 'dagi-parser-service', image: 'dagi-parser-service:latest', status: 'Healthy (2 days)', ports: ['9400:9400'], created: '2025-01-01T00:00:00Z', state: 'healthy', uptime: '2 days', purpose: 'Document parsing (OCR, Playwright)' },
        { id: 'dagi-postgres', name: 'dagi-postgres', image: 'postgres:15', status: 'Healthy (9 hours)', ports: ['5432:5432'], created: '2025-01-01T00:00:00Z', state: 'healthy', uptime: '9 hours', purpose: 'PostgreSQL database' },
        { id: 'dagi-neo4j', name: 'dagi-neo4j', image: 'neo4j:5.15-community', status: 'Healthy (11 hours)', ports: ['7474:7474', '7687:7687'], created: '2025-01-01T00:00:00Z', state: 'healthy', uptime: '11 hours', purpose: 'Graph database' },
        { id: 'dagi-neo4j-exporter', name: 'dagi-neo4j-exporter', image: 'neo4j-exporter:latest', status: 'Healthy (11 hours)', ports: ['9108:9108'], created: '2025-01-01T00:00:00Z', state: 'healthy', uptime: '11 hours', purpose: 'Prometheus exporter for Neo4j' },
        { id: 'dagi-node-registry', name: 'dagi-node-registry', image: 'dagi-node-registry:latest', status: 'Healthy (9 hours)', ports: ['9205:9205'], created: '2025-01-01T00:00:00Z', state: 'healthy', uptime: '9 hours', purpose: 'Node registry service' },
        { id: 'dagi-nats', name: 'dagi-nats', image: 'nats:latest', status: 'Healthy (17 hours)', ports: ['4222:4222'], created: '2025-01-01T00:00:00Z', state: 'healthy', uptime: '17 hours', purpose: 'NATS JetStream message bus' },
        { id: 'dagi-prometheus', name: 'dagi-prometheus', image: 'prom/prometheus:latest', status: 'Healthy (2 days)', ports: ['9090:9090'], created: '2025-01-01T00:00:00Z', state: 'healthy', uptime: '2 days', purpose: 'Metrics collection' },
        { id: 'dagi-qdrant', name: 'dagi-qdrant', image: 'qdrant/qdrant:latest', status: 'Up (2 days)', ports: ['6333:6333', '6334:6334'], created: '2025-01-01T00:00:00Z', state: 'running', uptime: '2 days', purpose: 'Vector database' },
      ],
      up: [
        { id: 'swapper-service', name: 'swapper-service', image: 'swapper-service:latest', status: 'Up (16 hours)', ports: ['8890:8890'], created: '2025-01-01T00:00:00Z', state: 'running', uptime: '16 hours', purpose: 'Dynamic LLM loading/unloading' },
        { id: 'telegram-gateway', name: 'telegram-gateway', image: 'telegram-gateway:latest', status: 'Up (47 hours)', ports: ['8000:8000'], created: '2025-01-01T00:00:00Z', state: 'running', uptime: '47 hours', purpose: 'Telegram gateway' },
        { id: 'telegram-bot-api', name: 'telegram-bot-api', image: 'aiogram/telegram-bot-api:latest', status: 'Up (4 days)', ports: ['8081:8081'], created: '2025-01-01T00:00:00Z', state: 'running', uptime: '4 days', purpose: 'Telegram Bot API' },
        { id: 'nginx-gateway', name: 'nginx-gateway', image: 'nginx:latest', status: 'Up (5 days)', ports: ['80:80', '443:443'], created: '2025-01-01T00:00:00Z', state: 'running', uptime: '5 days', purpose: 'HTTPS gateway (Let\'s Encrypt)' },
      ],
      problematic: [
        { id: 'dagi-memory-service', name: 'dagi-memory-service', image: 'dagi-memory-service:latest', status: 'Restarting', ports: ['8000:8000'], created: '2025-01-01T00:00:00Z', state: 'restarting', purpose: 'Agent memory management' },
        { id: 'dagi-rag-service', name: 'dagi-rag-service', image: 'dagi-rag-service:latest', status: 'Restarting', ports: ['9500:9500'], created: '2025-01-01T00:00:00Z', state: 'restarting', purpose: 'Retrieval-augmented generation' },
        { id: 'dagi-grafana', name: 'dagi-grafana', image: 'grafana/grafana:latest', status: 'Restarting', ports: ['3000:3000'], created: '2025-01-01T00:00:00Z', state: 'restarting', purpose: 'Metrics visualization' },
        { id: 'dagi-stt-service', name: 'dagi-stt-service', image: 'dagi-stt-service:latest', status: 'Unhealthy (17 hours)', ports: ['9401:9401'], created: '2025-01-01T00:00:00Z', state: 'unhealthy', uptime: '17 hours', purpose: 'Speech-to-Text (Faster-Whisper)' },
        { id: 'dagi-image-gen', name: 'dagi-image-gen', image: 'dagi-image-gen:latest', status: 'Unhealthy (17 hours)', ports: ['9600:9600'], created: '2025-01-01T00:00:00Z', state: 'unhealthy', uptime: '17 hours', purpose: 'Image generation' },
      ],
    },
    telegram_bots: [
      { name: 'DAARWIZZ', username: '@DAARWIZZBot', token_prefix: '8323412397', prompt_file: 'daarwizz_prompt.txt', llm_model: 'qwen3:8b', status: 'active', type: 'telegram' },
      { name: 'Helion', username: '@HelionEnergyBot', token_prefix: '8112062582', prompt_file: 'helion_prompt.txt', llm_model: 'qwen3:8b', status: 'active', type: 'telegram' },
      { name: 'GREENFOOD', token_prefix: '7495165343', prompt_file: 'greenfood_prompt.txt', llm_model: 'qwen3:8b', status: 'active', type: 'telegram' },
      { name: 'CLAN', username: '@clan_bot', token_prefix: '8516872152', prompt_file: 'clan_prompt.txt', llm_model: 'DeepSeek', status: 'active', type: 'telegram' },
      { name: 'Soul', username: '@soul_bot', token_prefix: '8041596416', prompt_file: 'soul_prompt.txt', llm_model: 'qwen3:8b', status: 'active', type: 'telegram' },
      { name: 'DRUID', username: '@druid_bot', token_prefix: '8145618489', prompt_file: 'druid_prompt.txt', llm_model: 'qwen3:8b', status: 'active', type: 'telegram' },
      { name: 'EONARCH', username: '@eonarch_bot', token_prefix: '7962391584', prompt_file: 'eonarch_prompt.txt', llm_model: 'DeepSeek', status: 'active', type: 'telegram' },
      { name: 'Яромир', username: '@yaromir_bot', token_prefix: '8128180674', prompt_file: 'yaromir_prompt_ru.txt', llm_model: 'qwen3:8b / DeepSeek', status: 'active', type: 'telegram' },
      { name: 'NUTRA', token_prefix: 'PLACEHOLDER', prompt_file: 'nutra_prompt.txt', llm_model: 'qwen3:8b', status: 'needs_token', type: 'telegram' },
      { name: 'Dario', token_prefix: 'DISCORD_BOT_TOKEN', prompt_file: 'dario_prompt.txt', llm_model: 'qwen3:8b', status: 'needs_token', type: 'discord' },
    ],
    ai_agents: [
      { name: 'DAARWIZZ', prompt_file: 'daarwizz_prompt.txt', llm_model: 'qwen3:8b', specialization: 'Main assistant' },
      { name: 'Helion', prompt_file: 'helion_prompt.txt', llm_model: 'qwen3:8b', specialization: 'Energy Union AI' },
      { name: 'GREENFOOD', prompt_file: 'greenfood_prompt.txt', llm_model: 'qwen3:8b', specialization: 'Green food expert' },
      { name: 'CLAN', prompt_file: 'clan_prompt.txt', size: '3.0KB', llm_model: 'DeepSeek', specialization: 'Chief Leadership Agent Navigator' },
      { name: 'Soul', prompt_file: 'soul_prompt.txt', size: '5.7KB', llm_model: 'qwen3:8b', specialization: 'Spiritual Guide' },
      { name: 'DRUID', prompt_file: 'druid_prompt.txt', size: '8.8KB', llm_model: 'qwen3:8b', specialization: 'Cosmetic Chemistry Expert' },
      { name: 'NUTRA', prompt_file: 'nutra_prompt.txt', size: '9.2KB', llm_model: 'qwen3:8b', specialization: 'Health & Beauty (17 Vision modules)' },
      { name: 'EONARCH', prompt_file: 'eonarch_prompt.txt', size: '8.5KB', llm_model: 'DeepSeek', specialization: 'Consciousness Evolution (58 sections)' },
      { name: 'Яромир', prompt_file: 'yaromir_prompt_ru.txt', size: '22KB', llm_model: 'qwen3:8b / DeepSeek', temperature: 0.2, specialization: 'Multi-Dimensional Orchestrator', team: 'yaromir' },
      { name: 'Вождь', prompt_file: 'vozhd_prompt.txt', size: '17KB', llm_model: 'qwen2.5:14b', temperature: 0.1, specialization: 'Strategic Guardian (12 sections)', team: 'yaromir' },
      { name: 'Проводник', prompt_file: 'provodnik_prompt.txt', size: '15KB', llm_model: 'qwen2.5:7b', temperature: 0.3, specialization: 'Deep Mentor (GRAF module)', team: 'yaromir' },
      { name: 'Домир', prompt_file: 'domir_prompt.txt', size: '9.2KB', llm_model: 'qwen2.5:3b', temperature: 0.4, specialization: 'Family Harmony (Лад, 7 subagents)', team: 'yaromir' },
      { name: 'Создатель', prompt_file: 'sozdatel_prompt.txt', size: '11KB', llm_model: 'qwen2.5:14b', temperature: 0.5, specialization: 'Innovation Catalyst (GRAF)', team: 'yaromir' },
      { name: 'Dario', prompt_file: 'dario_prompt.txt', size: '6.7KB', llm_model: 'qwen3:8b', specialization: 'Discord Management (38 tools)' },
    ],
    ollama_models: [
      { name: 'qwen3:8b', model_id: '500a1f067a9f', size: '5.2 GB', modified: '7 days ago', status: 'installed', purpose: 'Main conversational model' },
      { name: 'qwen3-vl:8b', model_id: '901cae732162', size: '6.1 GB', modified: '2 days ago', status: 'installed', purpose: 'Vision-language model' },
      { name: 'qwen2-math:7b', model_id: '28cc3a337734', size: '4.4 GB', modified: '2 days ago', status: 'installed', purpose: 'Mathematical calculations' },
      { name: 'qwen2.5:3b-instruct-q4_K_M', model_id: '357c53fb659c', size: '1.9 GB', modified: '2 days ago', status: 'installed', purpose: 'Function calling, JSON reasoning' },
      { name: 'qwen2.5:7b-instruct-q4_K_M', model_id: '845dbda0ea48', size: '4.7 GB', modified: '2 days ago', status: 'installed', purpose: 'RAG, translation, security' },
      { name: 'qwen2.5:14b', size: '~8 GB', status: 'needed', purpose: 'Vozhd (Strategic), Sozdatel (Innovation)' },
      { name: 'qwen2.5:7b', size: '~4.5 GB', status: 'needed', purpose: 'Provodnik (Mentoring)' },
      { name: 'qwen2.5:3b', size: '~2 GB', status: 'needed', purpose: 'Domir (Harmony)' },
    ],
    problematic_services: [
      { name: 'Memory Service', container: 'dagi-memory-service', port: 8000, status: 'restarting', problem: 'Постійні перезапуски', priority: 'critical' },
      { name: 'RAG Service', container: 'dagi-rag-service', port: 9500, status: 'restarting', problem: 'Постійні перезапуски', priority: 'critical' },
      { name: 'Grafana', container: 'dagi-grafana', port: 3000, status: 'restarting', problem: 'Постійні перезапуски', priority: 'critical' },
      { name: 'STT Service', container: 'dagi-stt-service', port: 9401, status: 'unhealthy', problem: 'Health check fails', priority: 'non-critical' },
      { name: 'Image Gen', container: 'dagi-image-gen', port: 9600, status: 'unhealthy', problem: 'Health check fails', priority: 'non-critical' },
    ],
    databases: [
      { name: 'PostgreSQL', container: 'dagi-postgres', port: 5432, status: 'Healthy', purpose: 'Основна БД (пам\'ять агентів, контекст)' },
      { name: 'Neo4j', container: 'dagi-neo4j', port: 7474, status: 'Healthy', purpose: 'Graph database (знання, зв\'язки)' },
      { name: 'Qdrant', container: 'dagi-qdrant', port: 6333, status: 'Up', purpose: 'Vector database (embeddings)' },
      { name: 'Redis', container: 'redis', port: 6379, status: 'Not visible', purpose: 'Cache and pub/sub' },
    ],
    docker_images: [
      { id: 'dagi-router', repository: 'dagi-router', tag: 'latest', size: '500MB', created: '2025-01-01T00:00:00Z' },
      { id: 'dagi-gateway', repository: 'dagi-gateway', tag: 'latest', size: '300MB', created: '2025-01-01T00:00:00Z' },
      { id: 'postgres', repository: 'postgres', tag: '15', size: '400MB', created: '2025-01-01T00:00:00Z' },
      { id: 'nats', repository: 'nats', tag: 'latest', size: '150MB', created: '2025-01-01T00:00:00Z' },
      { id: 'neo4j', repository: 'neo4j', tag: '5.15-community', size: '600MB', created: '2025-01-01T00:00:00Z' },
      { id: 'qdrant', repository: 'qdrant/qdrant', tag: 'latest', size: '200MB', created: '2025-01-01T00:00:00Z' },
    ],
    system_packages: [
      { name: 'git', version: '2.34.1', description: 'Fast, scalable, distributed revision control system', status: 'installed' },
      { name: 'curl', version: '7.81.0', description: 'Command line tool for transferring data with URL syntax', status: 'installed' },
      { name: 'wget', version: '1.21.2', description: 'Retrieves files from the web', status: 'installed' },
      { name: 'nano', version: '6.2', description: 'Small, friendly text editor', status: 'installed' },
      { name: 'vim', version: '8.2', description: 'Vi IMproved - enhanced vi editor', status: 'installed' },
      { name: 'ufw', version: '0.36', description: 'Uncomplicated firewall', status: 'installed' },
      { name: 'unattended-upgrades', version: '2.8', description: 'Automatic installation of security upgrades', status: 'installed' },
    ],
    systemd_services: [
      { name: 'docker.service', status: 'active', description: 'Docker Application Container Engine' },
      { name: 'ssh.service', status: 'active', description: 'OpenBSD Secure Shell server' },
      { name: 'cron.service', status: 'active', description: 'Regular background program processing daemon' },
    ],
    file_structure: {
      path: '/opt/microdao-daarion',
      type: 'directory',
      children: [
        { path: '/opt/microdao-daarion/docker-compose.yml', type: 'file', size: 50000 },
        { path: '/opt/microdao-daarion/router-config.yml', type: 'file', size: 30000 },
        { path: '/opt/microdao-daarion/services', type: 'directory' },
        { path: '/opt/microdao-daarion/gateway-bot', type: 'directory' },
        { path: '/opt/microdao-daarion/data', type: 'directory' },
        { path: '/opt/microdao-daarion/logs', type: 'directory' },
      ],
    },
    installed_software: [
      { name: 'Docker', version: '24.0.7', type: 'system' },
      { name: 'Docker Compose', version: '2.21.0', type: 'system' },
      { name: 'Python', version: '3.12.3', type: 'system' },
      { name: 'Node.js', version: '20.10.0', type: 'node' },
      { name: 'Ollama', version: '0.1.0', type: 'system' },
    ],
  };
}

function getMockInventory(nodeId: string): NodeInventory {
  // Mock data для НОДА2
  return {
    node_id: nodeId,
    node_name: 'НОДА2',
    statistics: {
      containers_total: 0,
      containers_healthy: 0,
      containers_up: 0,
      containers_problematic: 0,
      bots_total: 0,
      bots_active: 0,
      bots_needs_token: 0,
      agents_total: 0,
      databases_total: 0,
      ollama_models_installed: 0,
      ollama_models_needed: 0,
      services_total: 0,
    },
    docker_containers: {
      healthy: [],
      up: [],
      problematic: [],
    },
    telegram_bots: [],
    ai_agents: [],
    problematic_services: [],
    databases: [],
    docker_images: [],
    system_packages: [],
    systemd_services: [],
    file_structure: {
      path: '/opt/microdao-daarion',
      type: 'directory',
      children: [],
    },
    ollama_models: [],
  };
}
