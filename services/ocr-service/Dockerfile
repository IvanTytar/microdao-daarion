FROM python:3.11-slim

# Встановити системні залежності
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-ukr \
    tesseract-ocr-eng \
    tesseract-ocr-rus \
    libtesseract-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копіювати requirements
COPY requirements.txt .

# Встановити Python залежності
RUN pip install --no-cache-dir -r requirements.txt

# Завантажити EasyOCR моделі
RUN python -c "import easyocr; easyocr.Reader(['uk', 'en'], gpu=False)"

# Копіювати код
COPY app/ ./app/

EXPOSE 8896

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8896"]

