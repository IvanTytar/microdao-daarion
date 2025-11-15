# CrewAI Orchestrator Dockerfile
FROM python:3.11-slim

LABEL maintainer="DAARION.city Team"
LABEL description="CrewAI Orchestrator - Multi-agent workflow service"
LABEL version="0.2.0"

WORKDIR /app/orchestrator

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    pydantic==2.5.3 \
    httpx==0.26.0

# Copy orchestrator code
COPY . .

EXPOSE 9010

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9010/health || exit 1

CMD ["python", "-m", "uvicorn", "crewai_backend:app", "--host", "0.0.0.0", "--port", "9010"]
