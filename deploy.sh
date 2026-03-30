#!/bin/bash
# PlayGAME — Script de deploy para VPS com Docker
# Uso: bash deploy.sh

set -e

APP_DIR="/opt/playgame"
REPO_URL=""  # Preencha se usar git

echo "╔══════════════════════════════╗"
echo "║  🏖  PlayGAME — Deploy      ║"
echo "╚══════════════════════════════╝"
echo ""

# 1. Verificar Docker e Docker Compose
echo "📦 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instalando..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker instalado!"
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose plugin não encontrado."
    apt-get update && apt-get install -y docker-compose-plugin
fi

echo "✅ Docker: $(docker --version)"
echo "✅ Compose: $(docker compose version)"

# 2. Criar diretório da aplicação
echo ""
echo "📁 Configurando diretório ${APP_DIR}..."
mkdir -p ${APP_DIR}

# 3. Copiar arquivos (se executando localmente com os arquivos)
if [ -f "docker-compose.yml" ]; then
    echo "📋 Copiando arquivos do projeto..."
    cp -r . ${APP_DIR}/
fi

cd ${APP_DIR}

# 4. Criar .env se não existir
if [ ! -f ".env" ]; then
    echo ""
    echo "⚙️  Criando arquivo .env..."
    
    # Gerar senha e secret seguros
    DB_PASS=$(openssl rand -base64 24 | tr -d '/+=')
    JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=')
    
    cat > .env << EOF
DB_NAME=playgame
DB_USER=playgame
DB_PASS=${DB_PASS}
JWT_SECRET=${JWT_SECRET}
EOF
    
    echo "✅ .env criado com senhas geradas automaticamente"
    echo "   Senha DB: ${DB_PASS}"
    echo "   JWT Secret: ${JWT_SECRET}"
    echo ""
    echo "⚠️  GUARDE ESSAS CREDENCIAIS EM LOCAL SEGURO!"
    echo ""
else
    echo "ℹ️  .env já existe — mantendo configuração atual"
fi

# 5. Criar pasta uploads
mkdir -p uploads

# 6. Build e Deploy
echo ""
echo "🚀 Iniciando deploy com Docker Compose..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

# 7. Aguardar serviços
echo ""
echo "⏳ Aguardando serviços iniciarem..."
sleep 10

# 8. Verificar saúde dos containers
echo ""
echo "🔍 Verificando status dos containers..."
docker compose ps

# 9. Testar health check
echo ""
echo "🏥 Testando health check da API..."
for i in {1..5}; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ API respondendo!"
        curl -s http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3001/api/health
        break
    fi
    echo "   Tentativa ${i}/5..."
    sleep 3
done

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ Deploy concluído!                    ║"
echo "║                                          ║"
echo "║  🌐 App: http://$(hostname -I | awk '{print $1}'):8090  ║"
echo "║  📡 API: http://localhost:3001/api       ║"
echo "║  🗄  DB:  PostgreSQL na porta 5432       ║"
echo "║                                          ║"
echo "║  Comandos úteis:                         ║"
echo "║  docker compose logs -f                  ║"
echo "║  docker compose restart                  ║"
echo "║  docker compose down                     ║"
echo "╚══════════════════════════════════════════╝"
echo ""
