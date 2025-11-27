/**
 * Тестовий скрипт для перевірки Monitor Agent пам'яті та чату
 * Запуск: node scripts/test-monitor-agent-memory.js
 */

const API_BASE_URL = process.env.VITE_API_URL || 'https://api.microdao.xyz';
const MEMORY_SERVICE_URL = process.env.VITE_MEMORY_SERVICE_URL || 'http://localhost:8000';
const NODE2_BASE_URL = process.env.VITE_NODE2_URL || 'http://localhost:8899';

async function testMonitorAgentMemory() {
  console.log('🧪 Тестування Monitor Agent пам'яті та чату\n');
  console.log(`📡 API URL: ${API_BASE_URL}`);
  console.log(`💾 Memory Service URL: ${MEMORY_SERVICE_URL}`);
  console.log(`🖥️  NODE2 URL: ${NODE2_BASE_URL}\n`);

  // 1. Перевірка збереження подій в Memory Service
  console.log('1️⃣ Перевірка збереження подій в Memory Service...');
  try {
    const testEvent = {
      node_id: 'node-2',
      events: [{
        team_id: 'system',
        scope: 'long_term',
        kind: 'system_event',
        body_text: 'Test event from script',
        body_json: {
          action: 'test',
          type: 'system',
          timestamp: new Date().toISOString(),
          test: true
        }
      }]
    };

    const response = await fetch(`${MEMORY_SERVICE_URL}/api/memory/monitor-events/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEvent),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Події збережено: ${data.saved} успішно, ${data.failed} помилок\n`);
    } else {
      console.log(`   ⚠️  Memory Service не доступний (HTTP ${response.status})\n`);
    }
  } catch (error) {
    console.log(`   ⚠️  Memory Service не доступний: ${error.message}\n`);
  }

  // 2. Перевірка чи можна отримати події
  console.log('2️⃣ Перевірка отримання подій з Memory Service...');
  try {
    const response = await fetch(`${MEMORY_SERVICE_URL}/agents/monitor-node-2/memory?limit=5`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Знайдено ${data.total || 0} подій в пам'яті\n`);
    } else {
      console.log(`   ⚠️  Не вдалося отримати події (HTTP ${response.status})\n`);
    }
  } catch (error) {
    console.log(`   ⚠️  Memory Service не доступний: ${error.message}\n`);
  }

  // 3. Перевірка чату з Monitor Agent
  console.log('3️⃣ Перевірка чату з Monitor Agent...');
  try {
    const chatResponse = await fetch(`${API_BASE_URL}/api/agent/monitor/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: 'monitor',
        message: 'Привіт! Чи ти запам\'ятовуєш всі зміни в проєкті?'
      }),
    });

    if (chatResponse.ok) {
      const data = await chatResponse.json();
      console.log(`   ✅ Monitor Agent відповів:\n   "${data.response || data.message || 'Немає відповіді'}"\n`);
    } else {
      const error = await chatResponse.json().catch(() => ({ detail: `HTTP ${chatResponse.status}` }));
      console.log(`   ⚠️  Monitor Agent не доступний: ${error.detail}\n`);
      
      // Спроба через локальний endpoint
      try {
        const localResponse = await fetch(`${NODE2_BASE_URL}/api/agent/monitor/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_id: 'monitor',
            message: 'Привіт!'
          }),
        });

        if (localResponse.ok) {
          const localData = await localResponse.json();
          console.log(`   ✅ Monitor Agent відповів (локальний):\n   "${localData.response || localData.message || 'Немає відповіді'}"\n`);
        } else {
          console.log(`   ❌ Локальний endpoint також не доступний\n`);
        }
      } catch (localError) {
        console.log(`   ❌ Локальний endpoint не доступний: ${localError.message}\n`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Помилка при тестуванні чату: ${error.message}\n`);
  }

  console.log('✅ Тестування завершено!');
}

testMonitorAgentMemory().catch(console.error);

