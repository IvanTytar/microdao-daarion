FROM python:3.11-slim

# Встановити wget для healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копіювати requirements
COPY requirements.txt .

# Встановити Python залежності
RUN pip install --no-cache-dir -r requirements.txt

# Копіювати код
COPY app/ ./app/

EXPOSE 8897

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8897"]

