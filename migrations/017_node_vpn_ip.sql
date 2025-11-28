-- Migration 017: Add VPN IP to nodes
-- Підтримка WireGuard VPN для міжнодової комунікації

-- Додаємо поле vpn_ip
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS vpn_ip inet;

-- Оновлюємо існуючі ноди
UPDATE nodes SET vpn_ip = '10.42.0.1' WHERE node_id = 'node-1-hetzner-gex44';
UPDATE nodes SET vpn_ip = '10.42.0.2' WHERE node_id = 'node-2-macbook-m4max';

-- Коментар
COMMENT ON COLUMN nodes.vpn_ip IS 'WireGuard VPN IP address for inter-node communication';

SELECT 'Migration 017 completed: VPN IP added to nodes' AS result;

