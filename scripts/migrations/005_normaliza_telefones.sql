-- Normaliza telefones para o formato 55DDNUMERO (somente digitos).
--
-- A coluna telefone acumulou formatos mistos: valores vindos da query string
-- chegam limpos (ex.: 5514991626912), mas linhas preenchidas a mao ficaram
-- como "(11) 933638292". Como existe indice em telefone, busca por numero
-- exato so casa se o formato bater.
--
-- Idempotente: linhas ja no formato correto sao ignoradas pelo NOT REGEXP.
-- Seguro: so altera linhas cujo numero limpo tenha 10 ou 11 digitos (fixo ou
-- celular com DDD), evitando corromper valores truncados ou invalidos.

UPDATE leads
SET telefone = CONCAT('55', REGEXP_REPLACE(telefone, '[^0-9]', ''))
WHERE telefone IS NOT NULL
  AND telefone <> ''
  AND telefone NOT REGEXP '^55[0-9]{10,11}$'
  AND CHAR_LENGTH(REGEXP_REPLACE(telefone, '[^0-9]', '')) IN (10, 11);
