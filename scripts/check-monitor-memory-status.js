/**
 * Перевірка статусу Monitor Agent пам'яті
 * Запуск: node scripts/check-monitor-memory-status.js
 */

const MEMORY_SERVICE_URL = process.env.VITE_MEMORY_SERVICE_URL || 'http://localhost:8000';

async function checkMonitorMemory() {
  console.log('🔍 Перевірка Monitor Agent пам'яті\n');
  console.log(`💾 Memory Service URL: ${MEMORY_SERVICE_URL}\n`);

  // Перевірка підключення
  console.log('1️⃣ Перевірка підключення до Memory Service...');
  try {
    const healthResponse = await fetch(`${MEMORY_SERVICE_URL}/health`);
    if (healthResponse.ok) {
      console.log('   ✅ Memory Service доступний\n');
    } else {
      console.log(`   ⚠️  Memory Service не доступний (HTTP ${healthResponse.status})\n`);
      return;
    }
  } catch (error) {
    console.log(`   ❌ Memory Service не доступний: ${error.message}\n`);
    return;
  }

  // Перевірка подій для НОДА1
  console.log('2️⃣ Перевірка подій Monitor Agent для НОДА1...');
  try {
    const response = await fetch(`${MEMORY_SERVICE_URL}/agents/monitor-node-1-hetzner-gex44/memory?limit=10`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Знайдено ${data.total || 0} подій для НОДА1\n`);
      if (data.items && data.items.length > 0) {
        console.log('   Останні події:');
        data.items.slice(0, 3).forEach((event, i) => {
          console.log(`   ${i + 1}. [${event.kind}] ${event.body_text?.substring(0, 50)}...`);
        });
        console.log('');
      }
    } else {
      console.log(`   ⚠️  Не вдалося отримати події (HTTP ${response.status})\n`);
    }
  } catch (error) {
    console.log(`   ⚠️  Помилка: ${error.message}\n`);
  }

  // Перевірка подій для НОДА2
  console.log('3️⃣ Перевірка подій Monitor Agent для НОДА2...');
  try {
    const response = await fetch(`${MEMORY_SERVICE_URL}/agents/monitor-node-2/memory?limit=10`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Знайдено ${data.total || 0} подій для НОДА2\n`);
      if (data.items && data.items.length > 0) {
        console.log('   Останні події:');
        data.items.slice(0, 3).forEach((event, i) => {
          console.log(`   ${i + 1}. [${event.kind}] ${event.body_text?.substring(0, 50)}...`);
        });
        console.log('');
      }
    } else {
      console.log(`   ⚠️  Не вдалося отримати події (HTTP ${response.status})\n`);
    }
  } catch (error) {
    console.log(`   ⚠️  Помилка: ${error.message}\n`);
  }

  // Статистика по типах подій
  console.log('4️⃣ Статистика по типах подій...');
  const eventTypes = ['node_event', 'agent_event', 'system_event', 'project_event'];
  for (const eventType of eventTypes) {
    try {
      const response = await fetch(`${MEMORY_SERVICE_URL}/agents/monitor-node-2/memory?kind=${eventType}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        console.log(`   ${eventType}: ${data.total || 0} подій`);
      }
    } catch (error) {
      // Ignore
    }
  }
  console.log('');

  console.log('✅ Перевірка завершена!');
}

checkMonitorMemory().catch(console.error);

