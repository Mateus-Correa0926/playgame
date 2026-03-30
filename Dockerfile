FROM node:20-alpine

WORKDIR /app

# Copiar package.json primeiro para cache de layers
COPY backend/package.json backend/package-lock.json* ./backend/

WORKDIR /app/backend
RUN npm install --omit=dev

WORKDIR /app

# Copiar o restante do projeto
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY database/ ./database/

# Criar pasta uploads
RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["node", "backend/server.js"]
