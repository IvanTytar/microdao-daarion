FROM python:3.11-slim

# Встановити системні залежності
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копіювати requirements
COPY requirements.txt .

# Встановити Python залежності
RUN pip install --no-cache-dir -r requirements.txt

# Копіювати код
COPY app/ ./app/

# Whisper модель завантажиться автоматично при першому запиті
# Це уникає проблем з мережею під час build

EXPOSE 8895

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8895"]
