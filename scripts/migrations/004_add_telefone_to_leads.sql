ALTER TABLE leads
  ADD COLUMN telefone VARCHAR(20) NULL AFTER email,
  ADD INDEX idx_telefone (telefone);
