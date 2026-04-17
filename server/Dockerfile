FROM node:22-slim

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

# Railway sets PORT automatically
CMD ["npx", "tsx", "server.ts"]
