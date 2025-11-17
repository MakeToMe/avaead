import { Pool } from 'pg';

// Pool de conexões PostgreSQL centralizado com configuração otimizada
let globalPool: Pool | null = null;

function getPool(): Pool {
  if (!globalPool) {
    globalPool = new Pool({
      host: "studio.rardevops.com",
      port: 4202,
      database: "postgres",
      user: "supabase_admin",
      password: "Aha517_Rar-PGRS_U2a59w",
      ssl: false,
      max: 20, // Máximo de conexões no pool
      idleTimeoutMillis: 30000, // Tempo antes de fechar conexão ociosa
      connectionTimeoutMillis: 10000, // Timeout para obter conexão
    });

    // Log de erros do pool
    globalPool.on('error', (err) => {
      console.error('❌ Erro inesperado no pool PostgreSQL:', err);
    });

    console.log('✅ Pool PostgreSQL inicializado');
  }
  return globalPool;
}

export const pool = getPool();

// Helper para executar queries com tratamento de erro
export async function executeQuery<T = any>(
  query: string,
  params: any[] = []
): Promise<{ data: T | null; error: Error | null }> {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return { data: result.rows as T, error: null };
  } catch (error) {
    console.error('Database query error:', error);
    return { data: null, error: error as Error };
  } finally {
    client.release();
  }
}

// Helper para executar query que retorna um único registro
export async function executeQuerySingle<T = any>(
  query: string,
  params: any[] = []
): Promise<{ data: T | null; error: Error | null }> {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return { data: result.rows[0] || null, error: null };
  } catch (error) {
    console.error('Database query error:', error);
    return { data: null, error: error as Error };
  } finally {
    client.release();
  }
}
