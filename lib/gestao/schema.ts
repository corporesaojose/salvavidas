import { getDbPool } from "@/lib/db";

// O acesso remoto ao MySQL da Hostinger não é liberado para a máquina de dev, então
// não dá para rodar migração pelo terminal: o schema é criado pelo próprio app, na
// primeira chamada que precisa dele. É idempotente e barato (CREATE ... IF NOT EXISTS).
let schemaPronto = false;

const TABELAS = [
  // Um voucher por lançamento. A chave repete a que o relatório usa (matrícula +
  // início da vigência), porque a mesma pessoa recebe mais de um passe.
  `CREATE TABLE IF NOT EXISTS freepass_vouchers (
    chave VARCHAR(64) NOT NULL PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL,
    nome VARCHAR(160) NOT NULL,
    foto_url TEXT NULL,
    treinador_web VARCHAR(120) NULL,
    coordenador VARCHAR(120) NULL,
    consultora VARCHAR(120) NULL,
    inicio_vigencia DATE NOT NULL,
    fim_vigencia DATE NOT NULL,
    plano VARCHAR(40) NOT NULL,
    frequencia INT NOT NULL DEFAULT 0,
    fechou_plano TINYINT(1) NOT NULL DEFAULT 0,
    plano_fechado VARCHAR(160) NULL,
    data_contrato DATE NULL,
    lancado_por VARCHAR(120) NULL,
    situacao_atual VARCHAR(60) NULL,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_inicio (inicio_vigencia),
    INDEX idx_matricula (matricula)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS freepass_anotacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chave VARCHAR(64) NOT NULL,
    texto TEXT NOT NULL,
    autor VARCHAR(80) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_chave (chave)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Exclusão é lógica: o lançamento sai das contas do relatório, nunca da Pacto.
  `CREATE TABLE IF NOT EXISTS freepass_exclusoes (
    chave VARCHAR(64) NOT NULL PRIMARY KEY,
    justificativa TEXT NOT NULL,
    autor VARCHAR(80) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS freepass_pendencias (
    id VARCHAR(48) NOT NULL PRIMARY KEY,
    autor VARCHAR(80) NOT NULL,
    nota TEXT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

export async function garantirSchema() {
  if (schemaPronto) return;
  const pool = getDbPool();
  for (const sql of TABELAS) {
    await pool.query(sql);
  }
  schemaPronto = true;
}
