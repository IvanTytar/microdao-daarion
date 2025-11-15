# DAGI Stack Deployment Guide

This guide covers deploying DAGI Stack in various environments.

---

## 🚀 Quick Start (Docker Compose)

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 10GB+ disk space

### Steps

1. **Clone repository**
   ```bash
   git clone https://github.com/daarion/dagi-stack.git
   cd dagi-stack
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your tokens and settings
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Verify health**
   ```bash
   curl http://localhost:9102/health  # Router
   curl http://localhost:8008/health  # DevTools
   curl http://localhost:9010/health  # CrewAI
   curl http://localhost:9200/health  # RBAC
   curl http://localhost:9300/health  # Gateway
   ```

5. **View logs**
   ```bash
   docker-compose logs -f router
   ```

6. **Stop services**
   ```bash
   docker-compose down
   ```

---

## 📋 Service Ports

| Service | Port | Description |
|---------|------|-------------|
| DAGI Router | 9102 | Main routing endpoint |
| DevTools | 8008 | File ops, tests, notebooks |
| CrewAI | 9010 | Multi-agent workflows |
| RBAC | 9200 | Role-based access control |
| Gateway | 9300 | Telegram/Discord webhooks |
| Ollama | 11434 | Local LLM (optional) |

---

## 🔧 Production Deployment

### Systemd Services (Linux)

1. **Create service file**
   ```bash
   sudo nano /etc/systemd/system/dagi-router.service
   ```

2. **Service configuration**
   ```ini
   [Unit]
   Description=DAGI Router Service
   After=network.target

   [Service]
   Type=simple
   User=dagi
   WorkingDirectory=/opt/dagi-stack
   Environment="PATH=/opt/dagi-stack/.venv/bin"
   ExecStart=/opt/dagi-stack/.venv/bin/python main_v2.py --port 9102
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable dagi-router
   sudo systemctl start dagi-router
   sudo systemctl status dagi-router
   ```

---

## ☸️ Kubernetes Deployment

### Basic Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dagi-router
  namespace: dagi-stack
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dagi-router
  template:
    metadata:
      labels:
        app: dagi-router
    spec:
      containers:
      - name: router
        image: daarion/dagi-router:0.2.0
        ports:
        - containerPort: 9102
        env:
        - name: DAGI_ROUTER_CONFIG
          value: /config/router-config.yml
        volumeMounts:
        - name: config
          mountPath: /config
        livenessProbe:
          httpGet:
            path: /health
            port: 9102
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 9102
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
      volumes:
      - name: config
        configMap:
          name: dagi-router-config
---
apiVersion: v1
kind: Service
metadata:
  name: dagi-router
  namespace: dagi-stack
spec:
  selector:
    app: dagi-router
  ports:
  - protocol: TCP
    port: 9102
    targetPort: 9102
  type: ClusterIP
```

### Deploy

```bash
kubectl create namespace dagi-stack
kubectl apply -f k8s/router-deployment.yaml
kubectl apply -f k8s/devtools-deployment.yaml
kubectl apply -f k8s/crewai-deployment.yaml
kubectl apply -f k8s/rbac-deployment.yaml
kubectl apply -f k8s/gateway-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## 🔒 Security

### Environment Variables

Never commit secrets to git. Use:
- Docker secrets
- Kubernetes secrets
- Vault
- AWS Secrets Manager

Example (Kubernetes):
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dagi-secrets
  namespace: dagi-stack
type: Opaque
stringData:
  telegram-token: "your_token_here"
  deepseek-key: "your_key_here"
```

### Network Security

1. **Firewall rules**
   - Allow: 9102 (Router), 9300 (Gateway)
   - Deny: 8008, 9010, 9200 (internal only)

2. **TLS/SSL**
   Use reverse proxy (Nginx, Traefik) for HTTPS

3. **Rate limiting**
   Configure in reverse proxy or API gateway

---

## 📊 Monitoring

### Health Checks

All services expose `/health` endpoint:

```bash
#!/bin/bash
# health-check.sh
services=("9102" "8008" "9010" "9200" "9300")
for port in "${services[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)
  if [ "$status" = "200" ]; then
    echo "✅ Port $port: healthy"
  else
    echo "❌ Port $port: unhealthy (HTTP $status)"
  fi
done
```

### Prometheus Metrics (Future)

Add to router:
```python
from prometheus_client import Counter, Histogram
requests_total = Counter('dagi_requests_total', 'Total requests')
request_duration = Histogram('dagi_request_duration_seconds', 'Request duration')
```

---

## 🔄 Updates & Rollback

### Docker Compose

```bash
# Pull latest images
docker-compose pull

# Restart services
docker-compose up -d

# Rollback
docker-compose down
docker-compose up -d --force-recreate
```

### Kubernetes

```bash
# Rolling update
kubectl set image deployment/dagi-router router=daarion/dagi-router:0.3.0

# Rollback
kubectl rollout undo deployment/dagi-router

# Check status
kubectl rollout status deployment/dagi-router
```

---

## 🐛 Troubleshooting

### Service not starting

```bash
# Check logs
docker-compose logs router

# Or for systemd
sudo journalctl -u dagi-router -f
```

### Connection refused

- Check firewall rules
- Verify service is running: `systemctl status dagi-router`
- Check port binding: `netstat -tulpn | grep 9102`

### LLM timeout

- Increase timeout in `router-config.yml`
- Check Ollama service: `curl http://localhost:11434/api/tags`
- Consider using smaller model or GPU acceleration

### RBAC errors

- Verify RBAC service is running
- Check database connection
- Review RBAC logs: `docker-compose logs rbac`

---

## 📈 Scaling

### Horizontal Scaling

```bash
# Docker Compose
docker-compose up -d --scale router=3

# Kubernetes
kubectl scale deployment/dagi-router --replicas=5
```

### Load Balancing

Use:
- Nginx
- Traefik
- AWS ALB
- GCP Load Balancer

Example Nginx config:
```nginx
upstream dagi_router {
    least_conn;
    server router-1:9102;
    server router-2:9102;
    server router-3:9102;
}

server {
    listen 80;
    location / {
        proxy_pass http://dagi_router;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🔧 Performance Tuning

### Router

- Adjust `timeout_ms` in config
- Increase worker processes
- Enable connection pooling

### Database (RBAC)

- Use PostgreSQL instead of SQLite
- Add indexes on user_id, dao_id
- Enable query caching

### LLM

- Use GPU for Ollama
- Consider model quantization
- Implement request queuing

---

## 📞 Support

- Documentation: https://docs.daarion.city
- Issues: https://github.com/daarion/dagi-stack/issues
- Discord: https://discord.gg/daarion
