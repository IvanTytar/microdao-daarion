# 28 — Flows: Wallet, Embassy, Energy Union (MicroDAO)

*Sequence-діаграми основних критичних потоків: авторизація, Wallet, Embassy, Energy Union, NATS Outbox*

Це документ візуалізацій — «центральна нервова система» проєкту.

Він показує, як працює процес:

- login → capability → action,
- stake RINGK → payouts,
- embassy → nats → services,
- oracle updates → RWA → wallet,
- agent runs → PDP.

Усі діаграми подані в **Mermaid**, GitHub рендерить їх автоматично.

---

## 1. Purpose

Цей документ описує **динамічні потоки** (sequence diagrams) між сервісами:

- frontend (web),
- API Gateway (PEP),
- PDP (Policy Decision Point),
- Postgres (DB),
- NATS JetStream (event bus),
- Wallet Service,
- Embassy Service,
- Energy Union,
- Agent Mesh.

Ці діаграми є частиною безпекового аудиту, дебагу, тестування, QA та документації для інтеграцій.

---

## 2. Legend

```
U      – User (browser/app)
A      – Agent (private agent)
API    – API Gateway (PEP)
PDP    – Policy Service (capability checks)
DB     – Postgres (core data)
WAL    – Wallet Service
NATS   – JetStream Event Bus
EMB    – Embassy Gateway
EU     – Energy Union backend
RUN    – Agent Runtime
```

---

## 3. Login → Capability Token → Action

```mermaid
sequenceDiagram
    participant U as User (Web)
    participant API
    participant PDP
    participant DB

    U->>API: POST /login (email+otp)
    API->>DB: validate OTP
    DB-->>API: OK
    API->>DB: fetch team_members, role, plan, entitlements
    DB-->>API: role=Member, plan=Premium, stake=100 RINGK

    API->>API: build capability-token (bundles role+plan)
    API-->>U: session cookie + cap-token

    U->>API: GET /projects
    API->>PDP: authorize(user, action=project.read)
    PDP->>DB: lookup bundles+caps
    DB-->>PDP: caps_allow
    PDP-->>API: allow
    API->>DB: SELECT * FROM projects
    DB-->>API: result
    API-->>U: JSON
```

---

## 4. Agent Run (Router → PDP → DB → RUN → NATS)

```mermaid
sequenceDiagram
    participant U as User
    participant API
    participant PDP
    participant DB
    participant RUN as Agent Runtime
    participant NATS

    U->>API: POST /agent/run {prompt}
    API->>PDP: authorize(user, action=agent.run.invoke)
    PDP-->>API: allow

    API->>DB: INSERT INTO agent_runs (pending)
    DB-->>API: OK

    API->>RUN: start(agent_id, input)
    RUN-->>API: ack (accepted)

    RUN->>NATS: publish agent.run.started
    U->>API: GET /agent/run/status
    API->>DB: SELECT status=running

    RUN->>RUN: LLM inference / tools / reasoning
    RUN->>DB: UPDATE agent_runs (output, status=completed)
    RUN->>NATS: publish agent.run.completed

    API-->>U: result
```

---

## 5. Stake RINGK → Payout Flow

Це один із ключових потоків у DAARION (економічна модель).

```mermaid
sequenceDiagram
    participant U as User
    participant API
    participant PDP
    participant DB
    participant WAL as Wallet Service
    participant NATS

    U->>API: POST /wallet/stake {amount}
    API->>PDP: authorize(user, action=wallet.stake.ringk)
    PDP-->>API: allow

    API->>DB: INSERT INTO staking_ringk (locked)
    DB-->>API: OK

    API->>WAL: notify stake_request(user, amount)
    WAL->>NATS: publish staking.locked

    WAL->>WAL: compute payouts for period
    WAL->>NATS: publish payout.generated {user, amount, symbol="KWT"}

    U->>API: GET /wallet/payouts
    API->>DB: SELECT * FROM payouts
    API-->>U: pending payout
```

---

## 6. Embassy Webhook → PDP → RWA Inventory → Wallet/NATS

```mermaid
sequenceDiagram
    participant EXT as External Platform (EnergyUnion/GreenFood/etc)
    participant EMB
    participant API
    participant PDP
    participant DB
    participant NATS
    participant WAL as Wallet Service

    EXT->>EMB: POST /embassy/energy {kWh} + HMAC Signature
    EMB->>API: forward request

    API->>PDP: authorize(embassy_key, action=embassy.energy.update)
    PDP-->>API: allow

    API->>DB: UPDATE rwa_inventory (type=energy)
    DB-->>API: OK

    API->>NATS: publish rwa.inventory.updated

    NATS->>WAL: process inventory → compute payouts?
    WAL->>NATS: publish payout.generated (1T/KWT)

    API-->>EMB: 200 OK
```

---

## 7. Energy Union → Embassy Oracle → NATS → Wallet

```mermaid
sequenceDiagram
    participant M as Meter Device
    participant EU as Energy Union
    participant EMB
    participant API
    participant PDP
    participant DB
    participant NATS
    participant WAL

    M->>EU: send meter data
    EU->>EMB: POST /embassy/oracle {site, kWh, ts}

    EMB->>API: request
    API->>PDP: authorize(emb_key, action=embassy.energy.update)
    PDP-->>API: allow

    API->>DB: INSERT INTO oracles (payload)
    DB-->>API: OK

    API->>NATS: publish oracle.reading.published

    NATS->>WAL: recalc payouts (KWT/1T)
    WAL->>DB: INSERT INTO payouts
    WAL->>NATS: publish payout.generated
```

---

## 8. Wallet Claim Flow (User Claims Payout)

```mermaid
sequenceDiagram
    participant U as User
    participant API
    participant PDP
    participant DB
    participant WAL as Wallet Service
    participant CHAIN as Blockchain

    U->>API: POST /wallet/claim {payout_id}
    API->>PDP: authorize(user, action=wallet.payout.claim)
    PDP-->>API: allow

    API->>DB: SELECT payout (pending)
    DB-->>API: OK

    API->>WAL: execute claim
    WAL->>CHAIN: submit tx
    CHAIN->>WAL: tx confirmed

    WAL->>DB: UPDATE payouts (claimed)
    API-->>U: success + tx_hash
```

---

## 9. Outbox → NATS Delivery (Guarantee: At-Least-Once)

```mermaid
sequenceDiagram
    participant DB
    participant WORK as Outbox Worker
    participant NATS

    DB->>WORK: SELECT events WHERE processed=false LIMIT 100
    WORK->>NATS: publish event
    NATS-->>WORK: ack
    WORK->>DB: UPDATE outbox_events SET processed=true
```

---

## 10. Governance Flow (Proposal → Vote → Policy Update)

```mermaid
sequenceDiagram
    participant U as User (Guardian/Owner)
    participant API
    participant PDP
    participant DB
    participant GOV as Governance Agent
    participant NATS

    U->>API: POST /gov/proposal {change_policy}
    API->>PDP: authorize(user, action=governance.proposal.create)
    PDP-->>API: allow

    API->>DB: INSERT proposal
    DB-->>API: OK

    API->>NATS: publish governance.proposal.created

    U->>API: POST /gov/vote
    API->>PDP: authorize(user, action=governance.vote.cast)
    PDP-->>API: allow

    API->>DB: UPDATE proposal votes
    DB-->>API: OK

    GOV->>DB: finalize, update capability bundles
    GOV->>NATS: publish governance.policy.updated
```

---

## 11. Threat Model Integration Points

| Flow                  | Threat                     | Mitigation                                        |
| --------------------- | -------------------------- | ------------------------------------------------- |
| Embassy webhook → API | Fake source, replay attack | HMAC + timestamp + PDP-check                      |
| Wallet claim          | Double-spend               | DB row-level lock + chain receipt                 |
| Agent run             | Prompt injection           | Input sanitization + safe tools                   |
| Confidential channels | E2EE bypass                | No plaintext server-side, agent gets summary only |
| NATS events           | Lost events                | Outbox pattern                                    |
| RWA updates           | Poisoned oracle            | PDP + oracle signature + anomaly detection        |
| Payout generation     | Fake energy data           | embassy_key capabilities + oracle signatures      |

---

## 12. Summary

Документ покриває основні системні флоу, які визначають:

- безпеку,
- економіку,
- консистентність,
- надійність,
- інтеграцію з RWA,
- роботу агентів.

Діаграми можуть бути імпортовані у Confluence/Notion/Docs автоматично.

---

## 13. Завдання для Cursor

```text
You are a senior backend engineer. Implement the flows described in:
- 28_flows_wallet_embassy_energy_union.md
- 24_access_keys_capabilities_system.md
- 12_agent_runtime_core.md

Tasks:
1) Implement PDP (Policy Decision Point) service.
2) Implement PEP (Policy Enforcement Point) middleware for API Gateway.
3) Implement Outbox Worker for NATS event delivery.
4) Implement Wallet Service with stake/payout flows.
5) Implement Embassy Gateway with webhook signature verification.
6) Add sequence diagram validation tests.

Output:
- list of modified files
- diff
- summary
```

---

## 14. Результат

Після впровадження цих потоків:

- чітко визначені всі критичні системні інтеграції;
- готовність до тестування end-to-end сценаріїв;
- документація для QA та інтеграційних тестів;
- основа для моніторингу та дебагу production issues.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14
