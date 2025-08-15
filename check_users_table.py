import psycopg2
from psycopg2.extras import RealDictCursor

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

def check_users_structure():
    """Verifica estrutura da tabela users."""
    conn = get_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verificar estrutura da tabela users
        print("🔍 Verificando estrutura da tabela users...")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'users'
            ORDER BY ordinal_position;
        """)
        
        users_cols = cursor.fetchall()
        if users_cols:
            print(f"📋 Estrutura da tabela users ({len(users_cols)} colunas):")
            for col in users_cols:
                nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
                default = f" (default: {col['column_default']})" if col['column_default'] else ""
                print(f"  - {col['column_name']}: {col['data_type']} (nullable: {nullable}){default}")
        else:
            print("❌ Tabela users não encontrada")
        
        # Verificar chaves primárias da tabela users
        print("\n🔍 Verificando chaves primárias da tabela users...")
        cursor.execute("""
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = 'rarcursos'
                AND tc.table_name = 'users';
        """)
        
        pk_cols = cursor.fetchall()
        if pk_cols:
            print(f"📋 Chaves primárias da tabela users:")
            for col in pk_cols:
                print(f"  - {col['column_name']}")
        else:
            print("❌ Nenhuma chave primária encontrada na tabela users")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro durante verificação: {e}")
        if conn:
            conn.close()

if __name__ == "__main__":
    check_users_structure()