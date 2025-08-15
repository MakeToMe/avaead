import psycopg2
from psycopg2.extras import RealDictCursor

def get_connection():
    """Estabelece conexão com o banco de dados PostgreSQL."""
    try:
        conn = psycopg2.connect(
            host="studio.rardevops.com",
            port=4202,
            database="postgres",
            user="postgres",
            password="Aha517_Rar-PGRS_U2a59w"
        )
        conn.autocommit = False
        print("✅ Conectado ao banco")
        return conn
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        return None

def check_matriculas_structure():
    """Verifica estrutura da tabela matriculas."""
    conn = get_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verificar estrutura da tabela matriculas
        print("🔍 Verificando estrutura da tabela matriculas...")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'matriculas'
            ORDER BY ordinal_position;
        """)
        
        matriculas_cols = cursor.fetchall()
        if matriculas_cols:
            print(f"📋 Estrutura da tabela matriculas ({len(matriculas_cols)} colunas):")
            for col in matriculas_cols:
                nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
                default = f" (default: {col['column_default']})" if col['column_default'] else ""
                print(f"  - {col['column_name']}: {col['data_type']} (nullable: {nullable}){default}")
        else:
            print("❌ Tabela matriculas não encontrada")
        
        # Verificar alguns registros de exemplo
        if matriculas_cols:
            print("\n📊 Verificando alguns registros de exemplo...")
            cursor.execute("""
                SELECT * FROM rarcursos.matriculas 
                LIMIT 3;
            """)
            
            registros = cursor.fetchall()
            if registros:
                print(f"Encontrados {len(registros)} registros de exemplo:")
                for i, registro in enumerate(registros, 1):
                    print(f"  Registro {i}:")
                    for key, value in registro.items():
                        print(f"    {key}: {value}")
                    print()
            else:
                print("  Nenhum registro encontrado na tabela")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro durante verificação: {e}")
        if conn:
            conn.close()

if __name__ == "__main__":
    check_matriculas_structure()