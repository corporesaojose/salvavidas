import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Pessoa {
  [key: string]: unknown;
}

interface DbError {
  message: string;
  code?: string;
  sqlMessage?: string;
}

function envSnapshot() {
  const v = (name: string) => {
    const val = process.env[name];
    return { set: Boolean(val), length: val?.length ?? 0 };
  };
  return {
    DB_HOST: v("DB_HOST"),
    DB_PORT: process.env.DB_PORT || null,
    DB_USER: v("DB_USER"),
    DB_PASSWORD: v("DB_PASSWORD"),
    DB_NAME: v("DB_NAME"),
  };
}

async function getPessoas(): Promise<{ rows: Pessoa[]; error: DbError | null }> {
  try {
    const pool = getDbPool();
    const [rows] = await pool.query("SELECT * FROM pessoas");
    return { rows: rows as Pessoa[], error: null };
  } catch (err) {
    const e = err as { message?: string; code?: string; sqlMessage?: string };
    return {
      rows: [],
      error: {
        message: e?.message ?? "Erro desconhecido",
        code: e?.code,
        sqlMessage: e?.sqlMessage,
      },
    };
  }
}

export default async function TestePage() {
  const { rows, error } = await getPessoas();
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const env = envSnapshot();

  return (
    <div className="min-h-screen bg-ink-900 text-[#faf8f0] px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl mb-6">Teste de conexão MySQL — tabela pessoas</h1>

        <div className="rounded-card border border-[#faf8f0]/20 bg-[#faf8f0]/5 px-5 py-4 mb-6">
          <p className="font-semibold mb-2 normal-case">Diagnóstico (temporário)</p>
          <pre className="text-xs normal-case whitespace-pre-wrap break-all">{JSON.stringify(env, null, 2)}</pre>
        </div>

        {error && (
          <div className="rounded-card border border-[#cc4b3c]/40 bg-[#cc4b3c]/10 px-5 py-4 mb-6">
            <p className="font-semibold text-[#cc4b3c] mb-1">Erro ao conectar no banco</p>
            <p className="text-sm text-[#faf8f0]/70 normal-case break-all">{error.message}</p>
            {error.code && (
              <p className="text-xs text-[#faf8f0]/50 normal-case break-all mt-2">code: {error.code}</p>
            )}
            {error.sqlMessage && (
              <p className="text-xs text-[#faf8f0]/50 normal-case break-all">sqlMessage: {error.sqlMessage}</p>
            )}
          </div>
        )}

        {!error && rows.length === 0 && (
          <p className="text-[#faf8f0]/60 normal-case">Conectado, mas a tabela "pessoas" está vazia.</p>
        )}

        {!error && rows.length > 0 && (
          <div className="overflow-x-auto rounded-card border border-[#faf8f0]/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#232320]">
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-semibold normal-case whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-[#faf8f0]/10">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-3 normal-case whitespace-nowrap">
                        {String(row[col] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
