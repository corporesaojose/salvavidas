import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Pessoa {
  [key: string]: unknown;
}

async function getPessoas(): Promise<{ rows: Pessoa[]; error: string | null }> {
  try {
    const pool = getDbPool();
    const [rows] = await pool.query("SELECT * FROM pessoas");
    return { rows: rows as Pessoa[], error: null };
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}

export default async function TestePage() {
  const { rows, error } = await getPessoas();
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="min-h-screen bg-ink-900 text-[#faf8f0] px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl mb-6">Teste de conexão MySQL — tabela pessoas</h1>

        {error && (
          <div className="rounded-card border border-[#cc4b3c]/40 bg-[#cc4b3c]/10 px-5 py-4 mb-6">
            <p className="font-semibold text-[#cc4b3c] mb-1">Erro ao conectar no banco</p>
            <p className="text-sm text-[#faf8f0]/70 normal-case break-all">{error}</p>
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
