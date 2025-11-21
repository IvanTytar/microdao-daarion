FROM python:3.11-slim

# Metadata
LABEL maintainer="DAARION Team <admin@daarion.city>"
LABEL service="node-registry"
LABEL version="0.1.0-stub"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create non-root user
RUN useradd -m -u 1000 noderegistry && \
    chown -R noderegistry:noderegistry /app
USER noderegistry

# Expose port
EXPOSE 9205

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9205/health || exit 1

# Run application
CMD ["python", "-m", "app.main"]
