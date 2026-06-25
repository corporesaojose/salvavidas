ALTER TABLE leads
  ADD COLUMN idade SMALLINT NOT NULL DEFAULT 0 AFTER nome_completo,
  DROP COLUMN onde_treina,
  ADD COLUMN habito_energia VARCHAR(20) NULL AFTER habito_agua,
  ADD COLUMN horas_sentado VARCHAR(10) NULL AFTER habito_energia,
  ADD COLUMN historico_familiar VARCHAR(255) NULL AFTER cirurgia_recente,
  ADD COLUMN por_que_agora VARCHAR(500) NULL AFTER historico_familiar,
  ADD COLUMN desejos_futuros JSON NULL AFTER outro_desafio,
  ADD COLUMN outro_desejo_futuro VARCHAR(255) NULL AFTER desejos_futuros;
