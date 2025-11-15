# microDAO RBAC Service Dockerfile
FROM python:3.11-slim

LABEL maintainer="DAARION.city Team"
LABEL description="microDAO RBAC - Role-based access control service"
LABEL version="0.2.0"

WORKDIR /app/microdao

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    pydantic==2.5.3 \
    sqlalchemy==2.0.25

# Copy RBAC code
COPY . .

EXPOSE 9200

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9200/health || exit 1

CMD ["python", "-m", "uvicorn", "rbac_api:app", "--host", "0.0.0.0", "--port", "9200"]
