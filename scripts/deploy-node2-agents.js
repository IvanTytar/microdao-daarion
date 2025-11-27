/**
 * Скрипт для деплою всіх агентів на НОДА2
 * Запуск: node scripts/deploy-node2-agents.js
 */

const API_BASE_URL = process.env.VITE_API_URL || 'https://api.microdao.xyz';
const NODE2_BASE_URL = process.env.VITE_NODE2_URL || 'http://localhost:8899';

// Список всіх агентів НОДА2 (з node2Agents.ts)
const ALL_AGENTS = [
  'agent-monitor-node2',
  'agent-solarius',
  'agent-sofia',
  'agent-primesynth',
  'agent-nexor',
  'agent-strategic-sentinels',
  'agent-vindex',
  'agent-helix',
  'agent-aurora',
  'agent-arbitron',
  // Додайте інші агентів за потреби
];

async function deployAgent(agentId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/node2/agents/${agentId}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, message: data.message || 'Deployed successfully' };
    } else {
      const error = await response.json();
      return { success: false, message: error.detail || `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function deployAllAgents() {
  console.log('🚀 Початок деплою всіх агентів на НОДА2...\n');
  console.log(`📡 API URL: ${API_BASE_URL}\n`);

  const results = [];
  let success = 0;
  let failed = 0;

  for (const agentId of ALL_AGENTS) {
    console.log(`🔄 Деплой ${agentId}...`);
    const result = await deployAgent(agentId);
    results.push({ agentId, ...result });
    
    if (result.success) {
      console.log(`   ✅ ${result.message}`);
      success++;
    } else {
      console.log(`   ❌ ${result.message}`);
      failed++;
    }
    
    // Невелика затримка між деплоями
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Результати:');
  console.log(`   ✅ Успішно: ${success}`);
  console.log(`   ❌ Помилок: ${failed}`);
  console.log(`   📦 Всього: ${ALL_AGENTS.length}\n`);

  // Виводимо детальні результати
  console.log('📝 Детальні результати:\n');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.agentId}: ${r.message}`);
  });

  console.log('\n✅ Деплой завершено!');
}

// Запускаємо
deployAllAgents().catch(console.error);

