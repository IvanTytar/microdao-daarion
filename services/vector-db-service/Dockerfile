FROM python:3.11-slim

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

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8898"]

