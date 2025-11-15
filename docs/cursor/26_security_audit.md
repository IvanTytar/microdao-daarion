# 26 — Security Audit Checklist (MicroDAO)

*Безпека інфраструктури, сервісів, вебклієнта, агентів, Embassy, access keys, токенів та даних*

Це документ для регулярного безпекового аудитування платформи **DAARION.city / microDAO / Embassy / Agent Mesh / Wallet / RWA**.

Він структурований так, щоб аудитори, інженери, DevOps та SecOps могли пройтися checklist-пунктами і чітко виявити проблеми в:

- Auth / Identity;
- Access Keys & Capability System;
- RBAC/Entitlements;
- Е2Е шифруванні повідомлень;
- Низькорівневій безпеці API, web, deployment;
- Embassy / Webhooks / Oracle-потоках;
- Wallet / Chain / Payouts;
- RWA flows;
- DB Security;
- Secrets Management;
- Logging/Audit/Compliance.

Документ повністю відповідає архітектурі, яку ми вже побудували.

---

## 1. Identity & Authentication

### 1.1 Users

- [ ] Email-based auth, OTP / Magic Link використовують одноразові токени.
- [ ] Термін дії OTP ≤ 10 хв.
- [ ] Повторне використання OTP заблоковано.
- [ ] Blocklist для підозрілих IP/UA-фінгерпринтів.
- [ ] MFA можлива (на roadmap).
- [ ] Session cookies:
  - [ ] `HttpOnly`
  - [ ] `Secure`
  - [ ] `SameSite=Strict` для prod
- [ ] Session TTL визначений (24–72 год), auto-refresh без надмірного продовження.

### 1.2 Agents

- [ ] Приватні агенти НЕ використовують user-сесію.
- [ ] Кожен агент має свій **Agent Access Key** (`ak_*` з `subject_kind='agent'`).
- [ ] Немає можливості «перевтілюватися» в користувача.
- [ ] Rate limit для agent keys встановлений.

### 1.3 Integrations / Webhooks

- [ ] Інтеграції без JWT. Тільки API Key + HMAC.
- [ ] Embassy Webhooks:
  - [ ] Secret зберігається в KMS.
  - [ ] Підпис запиту перевіряється (`X-Signature`).
  - [ ] Replay protection: timestamp + max time drift < 5 хв.

---

## 2. Authorization Layer (RBAC + Entitlements + Capabilities)

### 2.1 RBAC

- [ ] Ролі існують: `Owner`, `Guardian`, `Member`, `Visitor`.
- [ ] Роль користувача залежить від `team_members.role`.
- [ ] Немає прямого доступу до таблиць без RBAC-check.

### 2.2 Entitlements

- [ ] `plan.Freemium`, `plan.Casual`, `plan.Premium`, `plan.Platformium`.
- [ ] Плани визначають квоти на:
  - agent runs;
  - router.invoke;
  - message sends;
  - wallet.payout.claim;
- [ ] Стейк RINGK коректно впливає на квоти (множники).

### 2.3 Capability System

- [ ] Access Key має capabilities через:
  - [ ] bundle.role.*
  - [ ] bundle.plan.*
  - [ ] bundle.agent.*
  - [ ] власні capabilities (`access_key_caps`)
- [ ] Формула:

  ```text
  allow = RBAC ∧ Entitlement ∧ Capability ∧ ACL ∧ Mode
  ```

- [ ] PDP працює централізовано.
- [ ] PEP на всіх API endpoints.

---

## 3. Access Keys (User, Agent, Integration, Embassy)

### 3.1 Зберігання

- [ ] Secrets у KMS (не в базі).
- [ ] У таблиці `access_keys` зберігаються тільки metadata.
- [ ] Секрет видається один раз → не зберігається у plaintext.

### 3.2 Політики

- [ ] TTL для ключів (default 30–90 днів).
- [ ] Mandatory rotation.
- [ ] Revoke → негайна інвалідація.
- [ ] `status` ∈ (`active`, `revoked`, `expired`).

### 3.3 Rate limiting

- [ ] Okta-like limit per key.
- [ ] DDOS запобігання (global rate limit + per-key).

---

## 4. Confidential Mode (E2EE-Like Messaging)

### 4.1 На рівні каналів/команд

- [ ] Якщо `teams.mode='confidential'`:
  - [ ] сервер не бачить plaintext у `messages.body` (тільки ciphertext).
  - [ ] агенти не отримують plaintext — тільки:
    - embeddings;
    - summary;
    - обмежені метадані.

### 4.2 Ключі шифрування

- [ ] Зберігаються виключно на клієнті.
- [ ] Rotate при:
  - зміні складу команди;
  - зміні owner/guardian;
  - виході учасника.

### 4.3 E2EE Threat Model

- [ ] Сервер не може дешифрувати повідомлення.
- [ ] Агенти працюють на «вивітрених» даних (privacy-preserving).

---

## 5. API Security

### 5.1 Input validation

- [ ] Валідація payload (Zod/JSON schema).
- [ ] Неможливо запостити чужий team_id/channel_id/task_id.

### 5.2 Rate limiting

- [ ] per-IP
- [ ] per-user
- [ ] per-access-key
- [ ] per-endpoint (наприклад `/agent/run` має сильний ліміт)

### 5.3 Common

- [ ] CORS: origin whitelist
- [ ] TLS enforced
- [ ] Referrer policy: `strict-origin`
- [ ] Headers:
  - [ ] `X-Frame-Options: DENY`
  - [ ] `Content-Security-Policy` мінімум:

    ```text
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    connect-src 'self' https:;
    img-src 'self' data: https:;
    frame-ancestors 'none';
    ```

- [ ] Вимкнуто directory listing у CDN.

---

## 6. Web Client Security

### 6.1 Token handling

- [ ] Немає зберігання секретів у localStorage.
- [ ] Capability-token не містить чутливих даних.
- [ ] Cookies: secure, httponly, samesite.

### 6.2 UI-level attack surface

- [ ] XSS захищено (React escaping).
- [ ] Посилання user-generated content: `rel="noopener noreferrer"`.

### 6.3 Cache

- [ ] Disable caching of sensitive pages.

---

## 7. Database Security

### 7.1 Структура

- [ ] Всі таблиці пройдені аудитом (див. `27_database_schema_migrations.md`).
- [ ] Поля з критичними даними не мають plaintext секретів.

### 7.2 Обмеження

- [ ] CHECK / ENUM на:
  - roles
  - viewer_types
  - message types
  - task statuses
  - wallet statuses
  - access key statuses
  - embassy platforms
- [ ] Foreign keys у всіх критичних зв'язках.

### 7.3 Політика доступу

- [ ] Web/API використовує RLS або server-side filters.
- [ ] Відсутня можливість запитів напряму «в сусідню команду».

### 7.4 Backup & Restore

- [ ] PITR 7–30 днів для prod.
- [ ] Snapshot перед кожним релізом.
- [ ] Процедура restore протестована.

---

## 8. Secrets Management

### 8.1 Джерело

- [ ] Prod/Staging secrets в KMS або Vault.
- [ ] Немає `.env` у repo.
- [ ] Локальні `.env` окремо від production.

### 8.2 Sensitive secrets

- Embassy secrets
- Wallet signer private key
- JWT secret
- Session secret
- RWA oracle secrets

### 8.3 Rotation

- [ ] Rotation policy існує.
- [ ] Auto-rotate для Embassy secrets мінімум раз на 30–60 днів.

---

## 9. Embassy Module & Webhooks Security

### 9.1 Inbound Webhooks

- [ ] Підпис перевіряється (`X-Signature`).
- [ ] Timestamp у тілі підпису.
- [ ] Maximum allowed skew < 5 хв.
- [ ] Body hashing (HMAC_SHA256).

### 9.2 Outbound Webhooks

- [ ] Retry з експоненційною затримкою.
- [ ] Dead-letter queue для NATS споживачів.

### 9.3 Oracle Input

- [ ] Oracle events проходять PDP capability-check:
  - `embassy.energy.update`
  - `embassy.rwa.claim`
  - `embassy.intent.read`
- [ ] Oracle payload має структуру з валідацією (не приймати довільний json).

---

## 10. Wallet & Chain Security

### 10.1 Signer

- [ ] Wallet private key у KMS.
- [ ] Операції підпису — через офіційну KMS-операцію (не на сервері).
- [ ] Multi-sig або 4-eyes approval для критичних транзакцій.

### 10.2 Payouts

- [ ] `payout.generated` приходить лише з wallet service.
- [ ] claim → tx → підтвердження → оновлення БД.
- [ ] Rate limit на claim.

### 10.3 Chain RPC

- [ ] Використовувати приватні RPC endpoint-и.
- [ ] Логи RPC запитів не містять приватних ключів.

---

## 11. RWA Security

### 11.1 Data-level

- [ ] RWA inventory має типи:
  - `energy`, `food`, `water`, `essence`, `generic`.
- [ ] Кожен update — подія `rwa.inventory.updated`.

### 11.2 Embassy-guarded actions

- [ ] тільки Embassy Keys з capability:
  - `rwa.inventory.update`
  - `embassy.rwa.claim`
  - `embassy.energy.update`

---

## 12. Logging & Audit Trail

### 12.1 Audit Log

- [ ] Всі критичні дії пишуть у `audit_log`:
  - access key created/revoked,
  - agent run invoked,
  - payout claimed,
  - governance actions,
  - embassy updates.

### 12.2 Log integrity

- [ ] Логи доступні тільки admin/ops.
- [ ] Немає plaintext секретів.

### 12.3 SIEM інтеграція

- [ ] Підтримується forwarding у ELK / Loki / Cloud Logging.

---

## 13. Monitoring & Alerting

### 13.1 Метрики

- API latency, error rate
- DB connections, slow queries
- NATS lag
- Agent run failures
- Embassy webhook failures
- Wallet TX errors

### 13.2 Алерти

- [ ] high latency
- [ ] high error rate (>2%)
- [ ] failed db migration
- [ ] stuck outbox events
- [ ] agent-run failure rate > заданого порогу
- [ ] "Embassy webhook signature mismatch"

---

## 14. Incident Response

### 14.1 Playbooks

- [ ] DB corruption
- [ ] Chain stuck / RPC unreachable
- [ ] Embassy compromised key
- [ ] Access key leak
- [ ] Agent runaway (infinite loop / high cost)
- [ ] DDOS attack
- [ ] RWA incorrect oracle input

### 14.2 Communication

- [ ] Responsible security officer визначено.
- [ ] Питання ескалації прописані.

---

## 15. Compliance

### 15.1 Privacy

- [ ] PII зберігається encrypted-at-rest.
- [ ] Резидентські дані обмежені на команди.
- [ ] E2EE для confidential-каналів гарантує приватність.

### 15.2 Data retention

- [ ] Логи зберігаються до 30–90 днів.
- [ ] Outbox events → 7 днів.

### 15.3 Legal

- [ ] Webhooks & Embassy: мінімізація PII.
- [ ] Wallet: відповідність нормам локальних регуляцій.

---

## 16. Summary: Security Audit Status Table

| Категорія     | Статус             | Проблеми | Пріоритет |
| ------------- | ------------------ | -------- | --------- |
| Identity/Auth | PASS / WARN / FAIL | …        | High      |
| Access Keys   | PASS / WARN / FAIL | …        | High      |
| RBAC          | PASS               | …        | Medium    |
| Capabilities  | PASS               | …        | High      |
| E2EE          | …                  | …        | High      |
| Embassy       | …                  | …        | High      |
| Wallet        | …                  | …        | Critical  |
| RWA           | …                  | …        | High      |
| DB            | …                  | …        | High      |
| Secrets       | …                  | …        | Critical  |
| Logs          | …                  | …        | Medium    |

---

## 17. Завдання для Cursor

```text
You are a senior security engineer. Implement security measures based on:
- 26_security_audit.md
- 24_access_keys_capabilities_system.md
- 25_deployment_infrastructure.md
- 12_agent_runtime_core.md

Tasks:
1) Implement rate limiting middleware for API endpoints.
2) Add input validation (Zod schemas) for all API endpoints.
3) Implement security headers middleware (CSP, X-Frame-Options, etc.).
4) Add audit logging for critical actions (access keys, payouts, governance).
5) Implement secrets rotation policy.
6) Add security monitoring alerts.

Output:
- list of modified files
- diff
- summary
```

---

## 18. Результат

Після проходження цього чеклисту:

- виявлені всі критичні вразливості безпеки;
- впроваджені best practices для всіх компонентів системи;
- готовність до production deployment з точки зору безпеки;
- чітка політика incident response та compliance.

---

**Версія:** 1.0 (для MVP → RC → PROD)  
**Останнє оновлення:** 2024-11-14


