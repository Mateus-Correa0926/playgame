-- PlayGAME — Migration v1.1 (PostgreSQL)
-- Execute após schema.sql inicial
-- Nota: A tabela brackets e os índices já estão incluídos no schema.sql

-- Adicionar campo payment_proof se não existir
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_proof VARCHAR(255);
