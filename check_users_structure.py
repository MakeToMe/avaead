import psycopg2

def get_connection():
    """Estabelece conexão com o banco de dados PostgreSQL."""
    try:
        conn = psycopg2.connect(
            host="studio.rardevops.com",
            port=4202,
            database="postgres",
            user="supabase_admin",
            password="Aha517_Rar-PGRS_U2a59w"
        )
        conn.autocommit = False
        print("✅ Conectado ao banco")
        return conn
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        return None

def verificar_estrutura_users():
    """Verifica a estrutura da tabela users."""
    conn = get_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 Verificando estrutura da tabela users...")
        
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'users'
            ORDER BY ordinal_position;
        """)
        
        cols = cursor.fetchall()
        print(f"📋 Tabela users: {len(cols)} colunas")
        
        for col in cols:
            nullable = "SIM" if col[2] == 'YES' else "NÃO"
            print(f"  - {col[0]}: {col[1]} (nullable: {nullable})")
        
        # Verificar chaves primárias
        cursor.execute("""
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'rarcursos' 
              AND tc.table_name = 'users'
              AND tc.constraint_type = 'PRIMARY KEY';
        """)
        
        pk_cols = cursor.fetchall()
        print(f"\n🔑 Chaves primárias:")
        for pk in pk_cols:
            print(f"  - {pk[0]}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        conn.close()

if __name__ == "__main__":
    verificar_estrutura_users()