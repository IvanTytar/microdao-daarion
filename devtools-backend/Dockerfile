# DevTools Backend Dockerfile
FROM python:3.11-slim

LABEL maintainer="DAARION.city Team"
LABEL description="DevTools Backend - Development tools service"
LABEL version="0.2.0"

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements (from parent)
COPY ../requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8008

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8008/health || exit 1

CMD ["python", "main.py", "--host", "0.0.0.0", "--port", "8008"]
