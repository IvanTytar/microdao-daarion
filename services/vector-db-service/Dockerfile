FROM python:3.11-slim

# Встановити wget для healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копіювати requirements
COPY requirements.txt .

# Встановити Python залежності
RUN pip install --no-cache-dir -r requirements.txt

# Embedding model завантажиться автоматично при першому запуску
# Це уникає проблем з мережею під час build

# Копіювати код
COPY app/ ./app/

# Створити директорію для даних
RUN mkdir -p /app/chroma_data

EXPOSE 8898

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8898/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8898"]

