# Bot Gateway Dockerfile
FROM python:3.11-slim

LABEL maintainer="DAARION.city Team"
LABEL description="Bot Gateway - Telegram/Discord webhook handler"
LABEL version="0.2.0"

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY ../requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 9300

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9300/health || exit 1

CMD ["python", "-m", "gateway_bot.main", "--host", "0.0.0.0", "--port", "9300"]
