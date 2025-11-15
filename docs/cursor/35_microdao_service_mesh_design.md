# 35 — MicroDAO Service Mesh Design (MicroDAO)

*Арова архітектура сервіс-меш, резолюція сервісів, мережеві політики, zero-trust, observability, retries, autoscaling та інженерні стандарти для DAARION.city / microDAO*

---

## 1. Purpose & Scope

MicroDAO Service Mesh — це внутрішня мережна платформа, що забезпечує:

- безпечний виклик сервісів через **zero-trust** модель;
- внутрішнє балансування навантаження;
- автоматичне перез'єднання;
- контроль трафіку;
- observability (metrics / traces / logs);
- резолюцію сервісів та політики доступу;
- fault tolerance (retries, circuit breakers, rate limits).

Цей документ — обов'язковий для:

- backend-інженерів,
- DevOps/SRE,
- авторів внутрішніх сервісів,
- security-аудиторів.

---

## 2. High-Level Mesh Architecture

```
                           ┌────────────────────────────────┐
                           │         API Gateway (PEP)      │
                           └────────────────┬───────────────┘
                                            │
                         ┌──────────────────┴─────────────────┐
                         │        SERVICE MESH FABRIC         │
                         └─────────────┬─────────────┬────────┘
                                       │             │
                     ┌─────────────────┘             └──────────────────┐
               Internal Services                                   System Services
```

Основу складають:

- Service Registry
- Sidecar Proxy (Envoy / Linkerd / Traefik Mesh)
- mTLS між сервісами
- Observability pipeline
- Traffic control (retries, timeouts, circuit breakers)

---

## 3. Zero-Trust Model

Платформа працює за правилом:

```text
НІЯКІ ВНУТРІШНІ СЕРВІСИ НЕ ДОВІРЯЮТЬ ОДИН ОДНОМУ.
```

Тому кожен запит:

- автентифікується,
- авторизується через PDP,
- шифрується,
- логуються метадані.

### 3.1 Trust Boundaries

| Boundary           | Policy                  |
| ------------------ | ----------------------- |
| Gateway → Services | PDP enforced            |
| Service → Service  | mTLS + service identity |
| Service → DB       | minimal DB roles        |
| Service → NATS     | per-stream permissions  |

---

## 4. Service Identity (mTLS)

Кожен сервіс отримує власну сертифікацію:

```text
CN = service_name
SAN = service_name.namespace.svc
```

mTLS забезпечує:

- автентифікацію сервісу,
- заборону spoofing,
- шифрування трафіку.

---

## 5. Service Registry

Mesh потребує **централізованого каталогу сервісів**:

```json
{
  "service": "wallet",
  "host": "wallet.svc.cluster.local",
  "port": 8081,
  "metadata": {
      "team": "core",
      "version": "v1.4.0",
      "zone": "eu-central-1"
  }
}
```

У cloud-середовищі це зазвичай:

- Kubernetes DNS,
- або Consul,
- або власний registry.

---

## 6. Internal Service-to-Service Traffic

### 6.1 Pattern

```text
serviceA → Envoy Sidecar → Mesh → Envoy Sidecar → serviceB
```

### 6.2 Benefits

- automatic retries,
- circuit breaking,
- mTLS,
- observability,
- fine-grained routing,
- traffic shadowing.

---

## 7. Core Service Mesh Features

### 7.1 mTLS Encryption

- Усі внутрішні запити шифровані.
- Certificates rotate every 12–48 hours.

### 7.2 Load Balancing (Layer 7)

- round-robin,
- least_conn,
- locality-aware routing.

### 7.3 Retries

- max 3,
- exponential backoff,
- jitter.

### 7.4 Circuit Breakers

При перевантаженні:

- mesh відкриває circuit → запити йдуть у failfast,
- після cooling-off — пробує відновити.

### 7.5 Timeouts

- default timeout: 3 seconds,
- wallet, embassy: 1 second (short to avoid blocking),
- agent runs: 10–60 seconds (handled separately).

---

## 8. Internal API Standard (Mesh Requirements)

Кожен сервіс має відповідати стандарту:

- JSON over HTTP (no gRPC unless planned),
- `/internal/v1/<service>/<operation>`,
- атомарні операції,
- 4xx для клієнтських помилок,
- 5xx для сервісних.

Приклад:

```text
POST /internal/v1/wallet/payout/claim
POST /internal/v1/embassy/energy/update
POST /internal/v1/agent/run
```

---

## 9. PDP Integration (per-service)

PEP живе тільки у API Gateway, але Services повинні:

1. не довіряти payload, навіть після PDP → додаткова валідація;
2. виконувати DB-level ACL checks;
3. мутуючі операції мають виконуватись тільки через Gateway.

**Жоден сервіс не приймає зовнішній трафік напряму.**

---

## 10. Mesh-Level Policies

### 10.1 Allow-lists

Кожен сервіс може викликати тільки перелік інших сервісів:

| Service            | Allowed to Call               |
| ------------------ | ----------------------------- |
| Messaging          | Usage, Storage                |
| Agent Orchestrator | LLM Proxy, Usage              |
| Embassy            | RWA, Usage                    |
| Wallet             | Chain RPC, Usage              |
| Router             | Agent Orchestrator, LLM Proxy |
| RWA                | Wallet, Usage                 |

### 10.2 Deny-lists

Забезпечує Zero-Trust:

- Messaging → No direct Wallet access
- Agents → No direct RWA access
- Embassy → No direct Wallet claim
- Router → No low-level DB access

---

## 11. Observability Model

Mesh забезпечує повну видимість.

### 11.1 Metrics

- latency (p50, p95, p99),
- HTTP codes,
- retry count,
- circuit breaker events,
- request sizes,
- traffic spikes.

### 11.2 Tracing

Підтримується:

- OpenTelemetry,
- distributed tracing (trace_id, span_id),
- propagation через Gateway → Mesh → Services → DB → NATS.

### 11.3 Logs

Збираються:

- access logs,
- error logs,
- mesh-level logs.

---

## 12. Failover & Resilience

### 12.1 Multi-zone (Cloud)

Mesh обирає найближчий healthy інстанс.

### 12.2 Zonal Failover

При провалі зони:

- трафік автоматично перенаправляється в інші зони.

### 12.3 Service Healthchecks

- `livenessProbe`: чи не висить процес.
- `readinessProbe`: чи сервіс готовий приймати трафік.

---

## 13. Mesh Traffic Rules for Critical Services

### 13.1 Wallet Service

- low timeout (1 sec)
- retries: 0 (щоб не дублювати транзакції)
- circuit-breaker sensitivity: high

### 13.2 Embassy

- retries: 1
- timeout: 0.5 sec
- global rate limiting:
  - embassy bursts можуть спричинити навантаження

### 13.3 Agent Orchestrator

- long timeout (10–60 sec)
- retries: none (idempotency?)
- dedicated queue routing

### 13.4 Router/DAARWIZZ

- timeout: 5–15 sec
- retries: 1–2
- concurrency caps

---

## 14. Service Mesh Security

### 14.1 mTLS Everywhere

- між усіма сервісами обов'язково.

### 14.2 Internal Service Keys

Кожен сервіс має:

- `service_key`,
- capability:

  ```text
  service.write.oracles
  service.mint.payout
  service.agent.run
  service.read.usage
  ```

- PDP авторизація на рівні сервісів.

### 14.3 No direct DB access (where possible)

Сервіси мають мінімальні ролі DB.

### 14.4 Network Policies

Забороняють:

- доступ між сервісами, що не пов'язані функціонально,
- будь-які вихідні запити (egress) без дозволу.

---

## 15. Deployment Model

### 15.1 Sidecar Mode

Рекомендовано:

- Envoy sidecar у кожному pod,
- mesh контролер керує routing tables.

### 15.2 Node-agent Mode (Alternative)

- не потрібні sidecars,
- менше накладних витрат,
- простіше управління.

### 15.3 Observability stack

- Prometheus,
- Grafana,
- Loki (або Cloud Logging),
- Jaeger / Tempo.

---

## 16. Service Mesh Integration with Scaling

### 16.1 Auto-discovery

Нові інстанси автоматично реєструються.

### 16.2 Load-aware routing

Mesh відправляє запити на:

- найменш завантажені інстанси,
- локальні (в межах зони).

### 16.3 Autoscaling Signals

Mesh збирає:

- CPU,
- memory,
- request rate,
- errors,
- queue depth (for agents).

---

## 17. Message Patterns

### 17.1 Request-Response

Звичайні виклики:

- Messaging
- Projects
- Wallet reads

### 17.2 Asynchronous Events

Через NATS:

- payouts,
- RWA updates,
- agent events

### 17.3 Long-running tasks

Через Agent Orchestrator:

- LLM chain-of-thought,
- multi-step flows.

---

## 18. Example Mesh Policy Config (Illustrative)

```yaml
# service: wallet
allow:
  - usage
  - chain_rpc
deny:
  - messaging
  - router
  - embassy

timeouts:
  request: 1s

retries:
  enabled: false

mTLS: required
```

```yaml
# service: embassy
allow:
  - rwa
  - usage
deny:
  - wallet
  - agent
  - router

mTLS: required
rate_limit: 500/min
```

---

## 19. Integration with Other Docs

Цей документ доповнює:

- `34_internal_services_architecture.md`
- `33_api_gateway_security_and_pep.md`
- `32_policy_service_PDP_design.md`
- `29_scaling_and_high_availability.md`
- `26_security_audit.md`

---

## 20. Завдання для Cursor

```text
You are a senior DevOps/SRE engineer. Implement Service Mesh using:
- 35_microdao_service_mesh_design.md
- 34_internal_services_architecture.md
- 29_scaling_and_high_availability.md

Tasks:
1) Set up Service Registry (Kubernetes DNS or Consul).
2) Configure mTLS for all services.
3) Implement Envoy sidecar proxies (or node-agent mode).
4) Set up mesh-level policies (allow-lists, deny-lists).
5) Configure retries, timeouts, circuit breakers.
6) Integrate with observability stack (Prometheus, Grafana, Loki, Jaeger).
7) Set up health checks for all services.
8) Configure load balancing and failover.
9) Implement network policies for zero-trust.

Output:
- list of modified files
- diff
- summary
```

---

## 21. Summary

MicroDAO Service Mesh забезпечує:

- захищені зв'язки між сервісами,
- шифрування всього внутрішнього трафіку,
- централізоване управління політиками,
- fault tolerance,
- трасування,
- динамічну маршрутизацію,
- стійкість до збоїв.

Це «нервова система» DAARION.city, яка дозволяє системі масштабуватися й залишатися безпечною при зростанні навантаження та сервісів.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


