FROM debian:bookworm-slim

# Install system dependencies (libstdc++6 is critical for numpy/rembg)
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    libgomp1 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies in venv
COPY python/requirements.txt ./python/
RUN python3 -m venv python/.venv && \
    python/.venv/bin/pip install --no-cache-dir rembg[cpu] pillow

# Pre-download the lightweight u2netp model at build time
RUN python/.venv/bin/python -c "\
from rembg import remove; \
from PIL import Image; \
img = Image.new('RGB', (10,10)); \
remove(img, model_name='u2netp'); \
print('rembg u2netp model pre-downloaded successfully')"

# Install Node dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

# Install fastapi + uvicorn for the Python vision server
RUN python/.venv/bin/pip install --no-cache-dir fastapi uvicorn python-multipart

# Railway sets PORT automatically
# start.sh launches both Python vision server and Node server
CMD ["bash", "start.sh"]
