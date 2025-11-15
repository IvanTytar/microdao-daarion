-- seeds.sql
-- базові bundles та capabilities для microDAO / DAARION.city
-- Запускати після всіх міграцій

-- 1) Bundles
insert into bundles (id, name)
values
  ('bundle_role_owner', 'role.Owner'),
  ('bundle_role_guardian', 'role.Guardian'),
  ('bundle_role_member', 'role.Member'),
  ('bundle_role_visitor', 'role.Visitor'),
  ('bundle_plan_freemium', 'plan.Freemium'),
  ('bundle_plan_casual', 'plan.Casual'),
  ('bundle_plan_premium', 'plan.Premium'),
  ('bundle_plan_platformium', 'plan.Platformium')
on conflict (id) do nothing;

-- 2) Capabilities
insert into capabilities (id, code, description) values
  -- chat / channels
  ('cap_chat_read',       'chat.message.read',        'Читання повідомлень у каналах'),
  ('cap_chat_send',       'chat.message.send',        'Надсилання повідомлень у каналах'),
  ('cap_chat_edit',       'chat.message.edit',        'Редагування власних повідомлень'),
  ('cap_chat_delete',     'chat.message.delete',      'Видалення повідомлень'),
  ('cap_channel_create',  'channel.create',           'Створення каналів у команді'),
  ('cap_channel_manage',  'channel.manage',           'Керування каналами в команді'),

  -- co-memory / docs
  ('cap_comem_read',      'comemory.item.read',       'Читання елементів Co-Memory'),
  ('cap_comem_write',     'comemory.item.write',      'Створення/оновлення елементів Co-Memory'),

  -- projects / tasks
  ('cap_project_create',  'project.create',           'Створення проєктів'),
  ('cap_project_manage',  'project.manage',          'Керування проєктами команди'),
  ('cap_task_create',     'task.create',              'Створення задач у проєктах'),
  ('cap_task_manage',     'task.manage',              'Керування задачами'),

  -- agents / router
  ('cap_agent_run',       'agent.run.invoke',         'Запуск агентів (Agent Runs)'),
  ('cap_agent_config',    'agent.config.manage',      'Керування конфігурацією агентів'),
  ('cap_router_invoke',   'router.invoke',            'Виклики роутера DAARWIZZ/Swarm-OS'),

  -- wallet / staking / payouts
  ('cap_wallet_view',     'wallet.balance.view',      'Перегляд балансів гаманця'),
  ('cap_wallet_stake',    'wallet.stake.ringk',       'Стейкінг токенів RINGK'),
  ('cap_wallet_payout_v', 'wallet.payout.view',       'Перегляд доступних виплат'),
  ('cap_wallet_payout_c', 'wallet.payout.claim',      'Забір (claim) виплат'),

  -- RWA / Embassy
  ('cap_rwa_update',      'rwa.inventory.update',     'Оновлення інвентарю RWA'),
  ('cap_emb_rwa_claim',   'embassy.rwa.claim',        'Обробка заявок на RWA через Embassy'),
  ('cap_emb_energy_upd',  'embassy.energy.update',    'Оновлення енергетичних даних через Embassy'),
  ('cap_emb_intent_read', 'embassy.intent.read',      'Читання intent-подій через Embassy'),

  -- Governance
  ('cap_gov_proposal',    'governance.proposal.create', 'Створення governance-пропозицій'),
  ('cap_gov_vote',        'governance.vote.cast',       'Голосування за пропозиції'),
  ('cap_gov_policy',      'governance.policy.manage',   'Керування політиками/бандлами доступу')
on conflict (id) do nothing;

-- 3) Прив'язка capabilities до role-bundles

-- Owner: максимум прав
insert into bundle_caps (bundle_id, cap_id)
select 'bundle_role_owner', id
from capabilities
on conflict (bundle_id, cap_id) do nothing;

-- Guardian: все, крім, наприклад, повної політики, якщо хочеш — тут залишимо теж усе
insert into bundle_caps (bundle_id, cap_id)
select 'bundle_role_guardian', id
from capabilities
on conflict (bundle_id, cap_id) do nothing;

-- Member: обмежений, без критичних governance/policy й agent-config
insert into bundle_caps (bundle_id, cap_id)
values
  ('bundle_role_member', 'cap_chat_read'),
  ('bundle_role_member', 'cap_chat_send'),
  ('bundle_role_member', 'cap_chat_edit'),
  ('bundle_role_member', 'cap_comem_read'),
  ('bundle_role_member', 'cap_comem_write'),
  ('bundle_role_member', 'cap_project_create'),
  ('bundle_role_member', 'cap_project_manage'),
  ('bundle_role_member', 'cap_task_create'),
  ('bundle_role_member', 'cap_task_manage'),
  ('bundle_role_member', 'cap_agent_run'),
  ('bundle_role_member', 'cap_router_invoke'),
  ('bundle_role_member', 'cap_wallet_view'),
  ('bundle_role_member', 'cap_wallet_stake'),
  ('bundle_role_member', 'cap_wallet_payout_v'),
  ('bundle_role_member', 'cap_wallet_payout_c')
on conflict (bundle_id, cap_id) do nothing;

-- Visitor: тільки читання
insert into bundle_caps (bundle_id, cap_id)
values
  ('bundle_role_visitor', 'cap_chat_read'),
  ('bundle_role_visitor', 'cap_comem_read')
on conflict (bundle_id, cap_id) do nothing;

-- 4) Прив'язка capabilities до plan-bundles (Entitlements)

-- Freemium: базовий чат + читання + один агент
insert into bundle_caps (bundle_id, cap_id)
values
  ('bundle_plan_freemium', 'cap_chat_read'),
  ('bundle_plan_freemium', 'cap_chat_send'),
  ('bundle_plan_freemium', 'cap_comem_read'),
  ('bundle_plan_freemium', 'cap_agent_run')
on conflict (bundle_id, cap_id) do nothing;

-- Casual: + wallet, router, tasks
insert into bundle_caps (bundle_id, cap_id)
values
  ('bundle_plan_casual', 'cap_chat_read'),
  ('bundle_plan_casual', 'cap_chat_send'),
  ('bundle_plan_casual', 'cap_comem_read'),
  ('bundle_plan_casual', 'cap_comem_write'),
  ('bundle_plan_casual', 'cap_agent_run'),
  ('bundle_plan_casual', 'cap_router_invoke'),
  ('bundle_plan_casual', 'cap_wallet_view'),
  ('bundle_plan_casual', 'cap_wallet_stake'),
  ('bundle_plan_casual', 'cap_wallet_payout_v'),
  ('bundle_plan_casual', 'cap_wallet_payout_c'),
  ('bundle_plan_casual', 'cap_task_create'),
  ('bundle_plan_casual', 'cap_task_manage')
on conflict (bundle_id, cap_id) do nothing;

-- Premium: + RWA/Embassy, governance (без policy.manage)
insert into bundle_caps (bundle_id, cap_id)
values
  ('bundle_plan_premium', 'cap_rwa_update'),
  ('bundle_plan_premium', 'cap_emb_rwa_claim'),
  ('bundle_plan_premium', 'cap_emb_energy_upd'),
  ('bundle_plan_premium', 'cap_emb_intent_read'),
  ('bundle_plan_premium', 'cap_gov_proposal'),
  ('bundle_plan_premium', 'cap_gov_vote')
on conflict (bundle_id, cap_id) do nothing;

-- Platformium: повний набір включно з governance.policy.manage
insert into bundle_caps (bundle_id, cap_id)
select 'bundle_plan_platformium', id
from capabilities
on conflict (bundle_id, cap_id) do nothing;


