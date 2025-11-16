# Multi-stage build for PARSER Service
# Stage 1: Base with system dependencies
FROM python:3.11-slim as base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libgl1-mesa-glx \
    libglib2.0-0 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: CPU-only build
FROM base as cpu

# Copy requirements and install CPU-only dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create temp directory and model cache
RUN mkdir -p /tmp/parser /root/.cache/huggingface

# Expose port
EXPOSE 9400

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9400"]

# Stage 3: CUDA build (optional, use --target=cuda)
FROM base as cuda

# Install CUDA dependencies
RUN apt-get update && apt-get install -y \
    nvidia-cuda-toolkit \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install CUDA dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create temp directory and model cache
RUN mkdir -p /tmp/parser /root/.cache/huggingface

# Expose port
EXPOSE 9400

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9400"]

# Default to CPU build
FROM cpu

