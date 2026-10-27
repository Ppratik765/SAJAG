# Build image for Sajag API using Python 3.13-slim
FROM python:3.13-slim

# Prevent Python from writing bytecode and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install runtime system dependencies: ffmpeg for audio processing and curl for healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        curl && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root system user and group
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -s /bin/bash -m appuser

# Set working directory
WORKDIR /app

# Install Python dependencies first for caching layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app/ ./app/

# Switch to non-root user
USER appuser

# Expose API port
EXPOSE 8000

# Container healthcheck on /healthz
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/healthz || exit 1

# Start uvicorn with proxy headers enabled for reverse proxy deployment
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
