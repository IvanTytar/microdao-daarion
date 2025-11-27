/**
 * Policies Configuration
 * Based on: pdp_access.md
 * 
 * Initial set of policies for MVP
 */

export const policiesConfig = {
  'policy.dao.create': {
    id: 'policy.dao.create',
    description: 'Створення нового MicroDAO',
    conditions: [
      {
        type: 'or',
        rules: [
          { type: 'balance', token: 'DAAR', gte: 1 },
          { type: 'balance', token: 'DAARION', gte: 0.01 },
        ],
      },
    ],
  },
  'policy.vendor.register': {
    id: 'policy.vendor.register',
    description: 'Реєстрація вендора на платформі',
    conditions: [
      { type: 'staked', token: 'DAARION', gte: 0.01 },
    ],
  },
  'policy.platform.create': {
    id: 'policy.platform.create',
    description: 'Створення платформи',
    conditions: [
      { type: 'staked', token: 'DAARION', gte: 1 },
    ],
  },
  'policy.federation.join': {
    id: 'policy.federation.join',
    description: 'Вступ DAO до SuperDAO',
    conditions: [
      { type: 'role', value: 'owner' },
      { type: 'target', property: 'federation_mode', value: 'superdao' },
    ],
  },
  'policy.federation.leave': {
    id: 'policy.federation.leave',
    description: 'Вихід DAO з SuperDAO',
    conditions: [
      { type: 'role', value: 'owner' },
    ],
  },
  'policy.federation.create-superdao': {
    id: 'policy.federation.create-superdao',
    description: 'Створення SuperDAO',
    conditions: [
      { type: 'role', value: 'owner' },
      { type: 'dao', property: 'child_count', gte: 1 },
    ],
  },
  'policy.federation.dissolve': {
    id: 'policy.federation.dissolve',
    description: 'Розформування федерації',
    conditions: [
      { type: 'role', value: 'owner' },
      { type: 'dao', property: 'level', ne: 'A1' },
    ],
  },
  'policy.agent.run': {
    id: 'policy.agent.run',
    description: 'Запуск агента',
    conditions: [
      { type: 'agent', property: 'registered', value: true },
    ],
  },
} as const;


