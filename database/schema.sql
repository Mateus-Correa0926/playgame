-- PlayGAME Database Schema (PostgreSQL)

-- Tipos ENUM
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('organizador', 'atleta');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE event_modality AS ENUM (
    'volei_dupla_masculino','volei_dupla_feminino','volei_dupla_misto',
    'volei_4x4_masculino','volei_4x4_feminino','volei_4x4_misto',
    'futevolei_masculino','futevolei_feminino','futevolei_misto',
    'beach_tennis_1x1_masculino','beach_tennis_1x1_feminino',
    'beach_tennis_2x2_masculino','beach_tennis_2x2_feminino','beach_tennis_2x2_misto'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('pendente', 'confirmado', 'cancelado', 'encerrado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('pendente', 'pago', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('comment', 'registration', 'payment', 'event_update', 'arena_confirm');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bracket_status AS ENUM ('aguardando', 'em_andamento', 'finalizado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabela de usuários (organizadores e atletas)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'atleta',
  avatar VARCHAR(255),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de arenas
CREATE TABLE IF NOT EXISTS arenas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(150),
  description TEXT,
  avatar VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de eventos
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  organizer_id INT NOT NULL,
  arena_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  modality event_modality NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  registration_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  participant_limit INT NOT NULL DEFAULT 16,
  rules TEXT,
  description TEXT,
  banner VARCHAR(255),
  pix_key VARCHAR(255),
  status event_status DEFAULT 'pendente',
  arena_confirmed BOOLEAN DEFAULT false,
  arena_confirmed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (arena_id) REFERENCES arenas(id) ON DELETE RESTRICT
);

-- Tabela de inscrições
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL,
  athlete_id INT NOT NULL,
  partner_name VARCHAR(150),
  partner_email VARCHAR(150),
  partner_phone VARCHAR(20),
  team_name VARCHAR(150),
  payment_status payment_status_enum DEFAULT 'pendente',
  payment_confirmed_at TIMESTAMP NULL,
  payment_proof VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (event_id, athlete_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de comentários
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  type notification_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  event_id INT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

-- Tabela de chaveamento
CREATE TABLE IF NOT EXISTS brackets (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL,
  round INT NOT NULL DEFAULT 1,
  match_number INT NOT NULL DEFAULT 1,
  team1_reg_id INT,
  team2_reg_id INT,
  team1_score INT,
  team2_score INT,
  winner_reg_id INT,
  status bracket_status DEFAULT 'aguardando',
  scheduled_time VARCHAR(10),
  court VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Função e trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_arenas_updated_at BEFORE UPDATE ON arenas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_registrations_updated_at BEFORE UPDATE ON registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_brackets_updated_at BEFORE UPDATE ON brackets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trilha de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  ip VARCHAR(45),
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- Histórico de status de pagamento
CREATE TABLE IF NOT EXISTS payment_status_log (
  id BIGSERIAL PRIMARY KEY,
  registration_id INT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by INT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_psl_reg ON payment_status_log(registration_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_athlete ON registrations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_comments_event ON comments(event_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_brackets_event ON brackets(event_id, round);
