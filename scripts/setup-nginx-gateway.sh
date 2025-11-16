#!/bin/bash
# Setup nginx reverse proxy with Let's Encrypt for DAGI Gateway
# This enables HTTPS for all Telegram bot webhooks

set -e

DOMAIN=${1:-"gateway.daarion.city"}
EMAIL=${2:-"admin@daarion.city"}
GATEWAY_PORT=${3:-"9300"}

echo "🔧 Setting up HTTPS gateway for domain: $DOMAIN"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "⚠️  Please run as root (sudo)"
   exit 1
fi

# 1. Install certbot
echo "📦 Installing certbot..."
apt-get update -qq
apt-get install -y certbot

# 2. Stop conflicting services on port 80/443
echo "🛑 Stopping services on ports 80/443..."
docker ps --filter "publish=80" --filter "publish=443" --format "{{.Names}}" | xargs -r docker stop

# 3. Get Let's Encrypt certificate
echo "🔐 Obtaining SSL certificate for $DOMAIN..."
certbot certonly --standalone \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive \
  --preferred-challenges http

# 4. Create nginx config
echo "⚙️  Creating nginx configuration..."
mkdir -p /etc/nginx-gateway

cat > /etc/nginx-gateway/default.conf << EOF
# DAGI Gateway HTTPS Proxy
# Supports multiple Telegram bot agents on subpaths

upstream gateway {
    server localhost:${GATEWAY_PORT};
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    
    # Telegram webhook endpoints for all agents
    location ~ ^/([a-z0-9_-]+)/telegram/webhook$ {
        proxy_pass http://gateway;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Telegram-specific
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }
    
    # Health check
    location /health {
        proxy_pass http://gateway;
        proxy_set_header Host \$host;
    }
    
    # All other endpoints
    location / {
        proxy_pass http://gateway;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name ${DOMAIN};
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF

# 5. Start nginx container
echo "🚀 Starting nginx gateway..."
docker stop nginx-gateway 2>/dev/null || true
docker rm nginx-gateway 2>/dev/null || true

docker run -d --name nginx-gateway \
  --restart unless-stopped \
  --network host \
  -v /etc/nginx-gateway/default.conf:/etc/nginx/conf.d/default.conf:ro \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  -v /var/www/certbot:/var/www/certbot:ro \
  nginx:alpine

# 6. Setup auto-renewal
echo "🔄 Setting up certificate auto-renewal..."
(crontab -l 2>/dev/null; echo "0 0 * * 0 certbot renew --quiet && docker restart nginx-gateway") | crontab -

echo "✅ HTTPS Gateway setup complete!"
echo ""
echo "🔗 Your gateway URL: https://${DOMAIN}"
echo "📝 Webhook URLs for agents:"
echo "   - DAARWIZZ:  https://${DOMAIN}/daarwizz/telegram/webhook"
echo "   - Helion:    https://${DOMAIN}/helion/telegram/webhook"
echo ""
echo "🧪 Test with: curl https://${DOMAIN}/health"
echo ""
echo "⚠️  Make sure DNS record ${DOMAIN} points to this server!"
