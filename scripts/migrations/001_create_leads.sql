CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Bloco 1 — Identificação
  nome_completo VARCHAR(255) NOT NULL,
  bairro VARCHAR(255) NOT NULL,
  nome_indicador VARCHAR(255) NOT NULL,

  -- Bloco 2 — Histórico de Treino
  historico_treino VARCHAR(20) NOT NULL,
  o_que_praticava VARCHAR(255) NULL,
  onde_treina VARCHAR(20) NULL,
  qual_atividade VARCHAR(255) NULL,
  objetivos JSON NOT NULL,
  outro_objetivo VARCHAR(255) NULL,
  dias_semana VARCHAR(10) NOT NULL,
  horario_preferencia VARCHAR(10) NOT NULL,

  -- Bloco 3 — Hábitos de Vida
  habito_stress VARCHAR(20) NOT NULL,
  habito_sono VARCHAR(20) NOT NULL,
  habito_alimentacao VARCHAR(20) NOT NULL,
  habito_agua VARCHAR(20) NOT NULL,

  -- Bloco 4 — Saúde
  problema_saude VARCHAR(255) NULL,
  dores_lesoes VARCHAR(255) NULL,
  cirurgia_recente VARCHAR(255) NULL,

  -- Bloco 5 — Motivação
  nivel_motivacao TINYINT NOT NULL,
  desafios JSON NOT NULL,
  outro_desafio VARCHAR(255) NULL,

  -- Resultado calculado
  score_prontidao TINYINT NOT NULL,
  nivel_prontidao VARCHAR(10) NOT NULL,

  -- Gestão do lead (painel admin, fase 2)
  status VARCHAR(20) NOT NULL DEFAULT 'novo',

  INDEX idx_nome_indicador (nome_indicador),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
