-- Migration v4: Audit trail + payment history
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

-- Histórico de mudanças de status de pagamento
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
