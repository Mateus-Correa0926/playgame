-- PlayGAME Migration v2 — Profile completeness + Partner invites

-- Add athlete profile fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS shirt_size VARCHAR(5);
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner VARCHAR(255);

-- Add partner_id to registrations (linked user as partner)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS partner_id INT REFERENCES users(id) ON DELETE SET NULL;

-- Partner invites table
CREATE TABLE IF NOT EXISTS partner_invites (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id INT REFERENCES registrations(id) ON DELETE CASCADE,
  inviter_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id INT REFERENCES users(id) ON DELETE SET NULL,
  invitee_email VARCHAR(150),
  invite_token VARCHAR(64) UNIQUE,
  status VARCHAR(20) DEFAULT 'pendente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_invites_invitee ON partner_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_partner_invites_token ON partner_invites(invite_token);
