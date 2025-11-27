FROM python:3.11-slim

WORKDIR /app

# Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App files
COPY . .

# Expose port
EXPOSE 7003

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7003"]

