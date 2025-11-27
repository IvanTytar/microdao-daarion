/**
 * Скрипт для деплою всіх агентів на НОДА2
 * Запуск: npx tsx scripts/deploy-all-node2-agents.ts
 */

import { getNode2Agents } from '../src/api/node2Agents';
import { deployAgentToNode2, deployAllAgentsToNode2 } from '../src/api/node2Deployment';

async function deployAllAgents() {
  console.log('🚀 Початок деплою всіх агентів на НОДА2...\n');

  try {
    // Отримуємо всіх агентів
    console.log('📋 Отримання списку агентів...');
    const agentsResponse = await getNode2Agents();
    const agents = agentsResponse.items;

    console.log(`✅ Знайдено ${agents.length} агентів\n`);

    // Фільтруємо агентів, які не задеплоєні
    const undeployedAgents = agents.filter(
      agent => !agent.deployment_status?.deployed || agent.deployment_status?.health_check === 'unhealthy'
    );

    console.log(`📊 Статистика:`);
    console.log(`   - Всього агентів: ${agents.length}`);
    console.log(`   - Задеплоєно: ${agents.length - undeployedAgents.length}`);
    console.log(`   - Потрібно задеплоїти: ${undeployedAgents.length}\n`);

    if (undeployedAgents.length === 0) {
      console.log('✅ Всі агенти вже задеплоєні!');
      return;
    }

    // Деплоїмо всіх агентів
    console.log('🚀 Початок масового деплою...\n');
    const result = await deployAllAgentsToNode2(undeployedAgents);

    console.log('\n📊 Результати деплою:');
    console.log(`   ✅ Успішно задеплоєно: ${result.success}`);
    console.log(`   ❌ Помилок: ${result.failed}\n`);

    // Виводимо детальні результати
    if (result.results.length > 0) {
      console.log('📝 Детальні результати:\n');
      result.results.forEach((r, i) => {
        const agent = undeployedAgents[i];
        const status = r.success ? '✅' : '❌';
        console.log(`${status} ${agent.name} (${agent.id}): ${r.message}`);
      });
    }

    console.log('\n✅ Деплой завершено!');
  } catch (error) {
    console.error('❌ Помилка при деплої:', error);
    process.exit(1);
  }
}

// Запускаємо деплой
deployAllAgents();

