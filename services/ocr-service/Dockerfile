FROM python:3.11-slim

# Встановити системні залежності для Tesseract
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-ukr \
    tesseract-ocr-eng \
    tesseract-ocr-rus \
    libtesseract-dev \
    libgl1 \
    libglib2.0-0 \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копіювати requirements
COPY requirements.txt .

# Встановити Python залежності (без EasyOCR для швидкого білду)
RUN pip install --no-cache-dir -r requirements.txt

# Копіювати код
COPY app/ ./app/

EXPOSE 8896

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8896/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8896"]
