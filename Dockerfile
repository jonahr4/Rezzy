# ──────────────────────────────────────────────────────────
# Rezzy Pipeline — Azure Container Apps Dockerfile
# Runs the FastAPI pipeline API with Tectonic for LaTeX→PDF
# ──────────────────────────────────────────────────────────

FROM python:3.12-slim

# System deps: tectonic (LaTeX→PDF), build essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && curl -sSL https://github.com/AhmedYoussefElnagar/tectonic-installer/releases/download/v0.14.1/tectonic-0.14.1-x86_64-unknown-linux-gnu.tar.gz \
       | tar xz -C /usr/local/bin/ \
    || pip install tectonic \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (Docker layer cache)
COPY V1/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir uvicorn[standard] fastapi python-multipart

# Copy pipeline code
COPY V1/src/ ./src/
COPY V1/pipeline_api.py .
COPY V1/data/ ./data/

# Output directory for generated PDFs
RUN mkdir -p output

# Expose port 8000 (ACA default)
EXPOSE 8000

# Health check endpoint for ACA
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run with uvicorn
CMD ["uvicorn", "pipeline_api:app", "--host", "0.0.0.0", "--port", "8000"]
