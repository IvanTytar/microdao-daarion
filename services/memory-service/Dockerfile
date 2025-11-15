FROM python:3.11-slim

WORKDIR /app

# Встановлюємо системні залежності
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копіюємо requirements та встановлюємо залежності
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо код
COPY . .

# Відкриваємо порт
EXPOSE 8000

# Запускаємо додаток
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

