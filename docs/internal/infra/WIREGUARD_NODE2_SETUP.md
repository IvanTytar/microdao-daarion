# WireGuard Setup for NODE2 (macOS)

## Конфігурація готова!

Файл конфігурації: `~/.wireguard/wg0.conf`

## Кроки для підключення:

### Варіант 1: WireGuard GUI (рекомендовано)

1. Встановіть WireGuard з App Store або [офіційного сайту](https://www.wireguard.com/install/)

2. Відкрийте WireGuard.app

3. Натисніть **"Import tunnel(s) from file..."**

4. Оберіть файл: `~/.wireguard/wg0.conf`

5. Натисніть **"Activate"**

### Варіант 2: Командний рядок

```bash
# Потрібен sudo пароль
sudo wg-quick up ~/.wireguard/wg0.conf

# Перевірка
wg show

# Тест зв'язку
ping 10.42.0.1
```

## Конфігурація NODE2

```ini
[Interface]
Address = 10.42.0.2/32
PrivateKey = <hidden>

[Peer]
PublicKey = p3mGZ7kFzEeDv2poAoTXfDFuklF3JLDVbminumZGUxk=
AllowedIPs = 10.42.0.0/24
Endpoint = 144.76.224.179:51820
PersistentKeepalive = 25
```

## IP-адреси

| Node | VPN IP | Public IP |
|------|--------|-----------|
| NODE1 (Hetzner) | 10.42.0.1 | 144.76.224.179 |
| NODE2 (MacBook) | 10.42.0.2 | dynamic |

## Тести після підключення

```bash
# З NODE2
ping 10.42.0.1
curl http://10.42.0.1:9205/api/v1/nodes
curl http://10.42.0.1:9102/health

# З NODE1
ping 10.42.0.2
curl http://10.42.0.2:8890/health
curl http://10.42.0.2:8895/health
```

