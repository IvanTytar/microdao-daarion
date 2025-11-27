#!/bin/bash
# Start DAARION Phase 4 Services
# Включає auth-service, pdp-service, usage-engine + всі попередні

echo "🚀 Starting DAARION Phase 4 (Security Layer)..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating template..."
    cat > .env << EOF
# OpenAI API Key
OPENAI_API_KEY=your-openai-api-key-here

# DeepSeek API Key (optional)
DEEPSEEK_API_KEY=your-deepseek-api-key-here

# Matrix Homeserver (optional, for Phase 1)
MATRIX_HOMESERVER_URL=https://matrix.org
EOF
    echo "✅ Created .env template. Please edit it and add your API keys."
    exit 1
fi

# Build and start all services
docker-compose -f docker-compose.phase4.yml up --build -d

echo ""
echo "✅ Phase 4 services started!"
echo ""
echo "📊 Services:"
echo "  - PostgreSQL:            http://localhost:5432"
echo "  - NATS:                  http://localhost:4222"
echo "  - Auth Service:          http://localhost:7011"
echo "  - PDP Service:           http://localhost:7012"
echo "  - Usage Engine:          http://localhost:7013"
echo "  - LLM Proxy:             http://localhost:7007"
echo "  - Memory Orchestrator:   http://localhost:7008"
echo "  - Toolcore:              http://localhost:7009"
echo "  - Agent Filter:          http://localhost:7005"
echo "  - DAGI Router:           http://localhost:7006"
echo "  - Agent Runtime:         http://localhost:7010"
echo "  - Messaging Service:     http://localhost:7004"
echo ""
echo "📝 Check logs:"
echo "  docker-compose -f docker-compose.phase4.yml logs -f [service-name]"
echo ""
echo "🔍 Health checks:"
echo "  curl http://localhost:7011/health  # auth-service"
echo "  curl http://localhost:7012/health  # pdp-service"
echo "  curl http://localhost:7013/health  # usage-engine"
echo ""
echo "📚 Documentation: docs/PHASE4_READY.md"





