# Vision Encoder Service - GPU-ready Docker image
# Base: PyTorch with CUDA support

FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create cache directory for model weights
RUN mkdir -p /root/.cache/clip

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DEVICE=cuda
ENV MODEL_NAME=ViT-L-14
ENV MODEL_PRETRAINED=openai
ENV PORT=8001

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
