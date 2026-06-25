import { readFileSync } from "fs";
import { config } from "dotenv";
import mysql from "mysql2/promise";

config({ path: ".env.local" });

const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/run-migration.mjs <arquivo.sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

try {
  await connection.query(sql);
  console.log(`Migration aplicada com sucesso: ${file}`);
} finally {
  await connection.end();
}
