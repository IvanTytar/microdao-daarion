# DAGI Router Dockerfile
FROM python:3.11-slim

LABEL maintainer="DAARION.city Team"
LABEL description="DAGI Router - Multi-provider AI Router"
LABEL version="0.2.0"

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create config directory
RUN mkdir -p /config

# Expose port
EXPOSE 9102

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9102/health || exit 1

# Run application
CMD ["python", "main_v2.py", "--host", "0.0.0.0", "--port", "9102"]
