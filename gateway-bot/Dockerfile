# Bot Gateway Dockerfile
FROM python:3.11-slim

LABEL maintainer="DAARION.city Team"
LABEL description="Bot Gateway - Telegram/Discord webhook handler with DAARWIZZ"
LABEL version="0.2.0"

WORKDIR /app/gateway-bot

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install minimal dependencies
RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    httpx==0.26.0 \
    pydantic==2.5.3 \
    python-multipart==0.0.6

# Copy gateway code and DAARWIZZ prompt
COPY . .

EXPOSE 9300

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9300/health || exit 1

ENV DAARWIZZ_NAME=DAARWIZZ
ENV DAARWIZZ_PROMPT_PATH=/app/gateway-bot/daarwizz_prompt.txt

CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9300"]
