-- Rastreia na propria linha do lead se o disparo pro n8n deu certo.
--
-- O webhook do n8n e o unico caminho ate o ChatGuru, a planilha, a Pacto e o
-- Slack. Antes desta coluna, uma falha no fetch morria num console.error: o
-- lead gravava, a cliente via a tela de resultado normalmente, e nada no
-- sistema indicava que o fluxo tinha parado ali. Foi assim que o lead 93
-- (28/08/2026, Sandra) passou tres dias despercebido -- so apareceu quando a
-- propria cliente reclamou de nao ter recebido nada.
--
-- Com a coluna, lead orfao vira um SELECT:
--   SELECT id, nome_completo, telefone, created_at, webhook_erro
--   FROM leads WHERE webhook_status <> 'ok' AND created_at >= CURDATE();

ALTER TABLE leads
  ADD COLUMN webhook_status VARCHAR(20) NOT NULL DEFAULT 'pendente' AFTER status,
  ADD COLUMN webhook_erro VARCHAR(500) NULL AFTER webhook_status,
  ADD INDEX idx_webhook_status (webhook_status);

-- Linhas anteriores a esta migration nao tem como ser classificadas: nao da
-- pra afirmar em retrospectiva se o webhook delas disparou ou nao. Marcar como
-- 'desconhecido' evita que elas poluam a busca por leads orfaos de verdade.
UPDATE leads SET webhook_status = 'desconhecido';
