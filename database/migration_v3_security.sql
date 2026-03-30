-- Migration v3: Security hardening
-- Adicionar coluna pix_key na tabela de eventos

ALTER TABLE events ADD COLUMN IF NOT EXISTS pix_key VARCHAR(255);
