# Node Join Protocol (Draft)

## Цілі
- Дозволити новим нодам приєднуватися до мережі DAARION.
- Автоматично налаштовувати агенти, Matrix аккаунти, інфраструктуру.

## Етапи
1. **Registration:** admin додає запис у Node Registry (`pending`).
2. **Bootstrap Script:** node виконує `scripts/bootstrap-node.sh`, який:
   - встановлює Docker, git, базові сервіси;
   - додає SSH ключ;
   - запускає docs-sync.
3. **Validation:** node-agent передає метрики через NATS.
4. **Activation:** статус `active`, нода отримує роль (prod/dev/edge).

## Безпека
- Всі запити підписані (JWT + node secret).
- Node agent працює від окремого користувача `daarion`.

## TODO
- Фіналізувати API Node Registry.
- Додати інтеграцію з DAIS (agent identity vs node identity).
- Автоматизувати видачу TLS/SSL через ACME.

