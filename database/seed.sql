-- PlayGAME Seed Data (PostgreSQL)
-- Execute APÓS o schema.sql

-- Usuarios de teste (bcrypt hash)
INSERT INTO users (name, email, password, phone, role) VALUES
('Admin Organizador', 'organizador@playgame.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(11) 99999-0001', 'organizador'),
('Carlos Silva', 'carlos@playgame.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(11) 99999-0002', 'atleta'),
('Ana Lima', 'ana@playgame.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(11) 99999-0003', 'atleta'),
('Bruno Costa', 'bruno@playgame.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(11) 99999-0004', 'atleta');

-- Arenas
INSERT INTO arenas (name, address, city, state, phone, email, description) VALUES
('Arena Beach SP', 'Rua das Palmeiras, 500', 'São Paulo', 'SP', '(11) 3333-0001', 'contato@arenabeachsp.com.br', 'Arena completa com 6 quadras de areia, vestiários e estacionamento.'),
('Beach Club Norte', 'Av. Paulista, 1200', 'São Paulo', 'SP', '(11) 3333-0002', 'contato@beachclubnorte.com.br', '4 quadras iluminadas para eventos noturnos.'),
('Arena Sol e Areia', 'Rua do Sol, 88', 'Campinas', 'SP', '(19) 3333-0003', 'contato@soleareia.com.br', 'Arena no interior com estrutura completa para torneios.');

-- Eventos de exemplo
INSERT INTO events (organizer_id, arena_id, title, modality, event_date, start_time, registration_fee, participant_limit, rules, description, status, arena_confirmed) VALUES
(1, 1, 'Torneio Vôlei de Dupla Masculino - Abril', 'volei_dupla_masculino', '2026-04-15', '08:00:00', 80.00, 16, 'Regras oficiais da CBV. Sets de 21 pontos. Duas duplas por time. Pontualidade obrigatória.', 'Grande torneio de duplas masculino na Arena Beach SP. Premiação para os 3 primeiros lugares!', 'confirmado', true),
(1, 2, 'Beach Tennis 2x2 Misto - Open', 'beach_tennis_2x2_misto', '2026-04-22', '09:00:00', 120.00, 12, 'Regras ITF. Games até 4. Tie-break em caso de empate. Bola oficial do torneio fornecida.', 'Torneio open de Beach Tennis duplas misto. Venha competir!', 'pendente', false),
(1, 1, 'Futevôlei Masculino - Copa Verão', 'futevolei_masculino', '2026-05-10', '07:30:00', 100.00, 8, 'Duplas. Sets de 18 pontos. Regras CBFS. Chuteiras não permitidas.', 'Copa de futevôlei masculino com premiação em dinheiro para os finalistas.', 'confirmado', true);

-- Inscrições de exemplo
INSERT INTO registrations (event_id, athlete_id, partner_name, partner_email, team_name, payment_status) VALUES
(1, 2, 'João Pereira', 'joao@email.com', 'Silva & Pereira', 'pago'),
(1, 3, 'Fernanda Rocha', 'fernanda@email.com', 'Lima & Rocha', 'pendente'),
(3, 4, 'Rafael Mendes', 'rafael@email.com', 'Costa & Mendes', 'pago');

-- Comentários de exemplo
INSERT INTO comments (event_id, user_id, message) VALUES
(1, 2, 'Qual o prazo final para inscrição?'),
(1, 3, 'Tem estacionamento gratuito na arena?'),
(3, 4, 'A premiação é em dinheiro mesmo? Qual o valor?');

-- Notificações de exemplo
INSERT INTO notifications (user_id, type, title, message, event_id) VALUES
(1, 'comment', 'Novo comentário', 'Carlos Silva fez uma pergunta no evento Torneio Vôlei de Dupla Masculino.', 1),
(1, 'comment', 'Novo comentário', 'Ana Lima fez uma pergunta no evento Torneio Vôlei de Dupla Masculino.', 1),
(1, 'registration', 'Nova inscrição', 'Bruno Costa se inscreveu no evento Copa Verão Futevôlei.', 3);
