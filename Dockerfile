# ──────────────────────────────────────────────────────────
# Rezzy Pipeline — Azure Container Apps Dockerfile
# Runs the FastAPI pipeline API with Tectonic for LaTeX→PDF
# ──────────────────────────────────────────────────────────

FROM python:3.12-slim

# System deps + Tectonic (LaTeX→PDF compiler)
# Using the official Tectonic installer script
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    libfontconfig1 \
    libgraphite2-3 \
    libharfbuzz0b \
    libicu72 \
    libssl3 \
    && curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh \
    && mv tectonic /usr/local/bin/ \
    && rm -rf /var/lib/apt/lists/*

# Pre-warm Tectonic cache so first compile isn't slow
# This downloads the ~200MB LaTeX package bundle at build time
RUN echo '\documentclass{article}\begin{document}Hello\end{document}' > /tmp/test.tex \
    && tectonic /tmp/test.tex || true \
    && rm -f /tmp/test.tex /tmp/test.pdf

WORKDIR /app

# Install Python deps first (Docker layer cache)
COPY V1/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir \
       uvicorn[standard] \
       fastapi \
       python-multipart \
       pymupdf \
       langsmith

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
