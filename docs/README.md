# 🏖 PlayGAME — Sistema de Gerenciamento de Eventos Esportivos de Areia

Sistema web responsivo para gerenciamento de eventos de vôlei de praia, futevôlei e beach tennis.

---

## 📁 Estrutura de Pastas

```
playgame/
├── frontend/          # Interface (HTML, CSS, JS puro)
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── backend/           # Servidor Node.js + Express
│   ├── server.js      # Ponto de entrada
│   ├── .env           # Variáveis de ambiente
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       ├── events.js
│       ├── registrations.js
│       ├── users.js
│       ├── arenas.js
│       └── notifications.js
├── database/
│   ├── schema.sql     # Estrutura do banco de dados
│   └── seed.sql       # Dados iniciais de exemplo
├── uploads/           # Imagens de avatar e banners
└── docs/
    └── README.md
```

---

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js 18+
- MySQL (já configurado externamente)

### 1. Instalar dependências do backend
```bash
cd backend
npm install
```

### 2. Configurar banco de dados
Acesse seu painel MySQL e execute na ordem:
```sql
source database/schema.sql
source database/seed.sql
```

Ou via linha de comando:
```bash
mysql -h 185.173.111.117 -u u277389556_PlayGAME -p u277389556_PlayGAME < database/schema.sql
mysql -h 185.173.111.117 -u u277389556_PlayGAME -p u277389556_PlayGAME < database/seed.sql
```

### 3. Verificar variáveis de ambiente
Edite `backend/.env` se necessário:
```env
PORT=3001
DB_HOST=185.173.111.117
DB_NAME=u277389556_PlayGAME
DB_USER=u277389556_PlayGAME
DB_PASS=MATeus2607@
JWT_SECRET=CONFIGURE_NO_ENV
```

### 4. Iniciar o servidor
```bash
cd backend
npm start
# ou em desenvolvimento:
npm run dev
```

### 5. Acessar o sistema
Abra no navegador: **http://localhost:3001**

---

## 👥 Contas de Teste (seed.sql)

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Organizador | organizador@playgame.com | password |
| Atleta | carlos@playgame.com | password |
| Atleta | ana@playgame.com | password |

---

## 🛣 Rotas da API

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/register | Cadastro de usuário |
| POST | /api/auth/login | Login |

### Eventos
| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | /api/events | Público | Listar eventos |
| GET | /api/events/:id | Público | Detalhe do evento |
| POST | /api/events | Organizador | Criar evento |
| PUT | /api/events/:id | Organizador (dono) | Editar evento |
| DELETE | /api/events/:id | Organizador (dono) | Excluir evento |
| PUT | /api/events/:id/confirm-arena | Auth | Confirmar arena |
| POST | /api/events/:id/comment | Auth | Comentar no evento |

### Inscrições
| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | /api/registrations/my | Atleta | Minhas inscrições |
| POST | /api/registrations | Atleta | Inscrever-se |
| PUT | /api/registrations/:id | Atleta | Editar dupla |
| DELETE | /api/registrations/:id | Atleta | Sair do evento |
| PUT | /api/registrations/:id/confirm-payment | Organizador | Confirmar pagamento |

### Usuários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/users/me | Ver meu perfil |
| PUT | /api/users/me | Editar perfil |
| PUT | /api/users/me/password | Alterar senha |
| POST | /api/users/me/avatar | Upload de foto |

### Arenas
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/arenas | Listar arenas |
| GET | /api/arenas/:id | Detalhe da arena |
| POST | /api/arenas | Cadastrar arena (organizador) |

### Notificações
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/notifications | Listar notificações |
| PUT | /api/notifications/read-all | Marcar todas como lidas |

---

## 🏄 Modalidades Disponíveis
- Vôlei de Dupla: Masculino, Feminino, Misto
- Vôlei 4x4: Masculino, Feminino, Misto
- Futevôlei: Masculino, Feminino, Misto
- Beach Tennis 1x1: Masculino, Feminino
- Beach Tennis 2x2: Masculino, Feminino, Misto

---

## ⚡ Tempo Real (Socket.IO)
O sistema usa WebSockets para atualizar:
- Novas inscrições
- Confirmações de pagamento
- Novos comentários
- Mudanças no status do evento

---

## 🎨 Design
- Cores: Preto, Branco, Cinza claro, Verde militar (#4a5c3a), Laranja (#e87722)
- Fontes: Barlow Condensed (títulos) + Barlow (corpo)
- Totalmente responsivo — mobile first
- Navegação bottom nav para celular
- Cards de evento com barra de progresso de vagas

---

## 🛡 Segurança
- Autenticação JWT (7 dias de expiração)
- Senhas criptografadas com bcrypt (salt 10)
- Middleware de verificação de perfil (organizador/atleta)
- CORS configurado

---

## 📦 Deploy em Produção
1. Configure um servidor com Node.js (PM2 recomendado)
2. Use Nginx como proxy reverso na porta 80/443
3. Configure SSL (Let's Encrypt)
4. Troque `JWT_SECRET` no `.env` por uma string segura
5. Configure `FRONTEND_URL` com o domínio real

```bash
# PM2
npm install -g pm2
cd backend
pm2 start server.js --name playgame
pm2 save
pm2 startup
```

---

Desenvolvido com ❤️ para a comunidade do esporte de areia brasileiro 🏖
