import psycopg2
from psycopg2.extras import RealDictCursor

def check_database_structure():
    try:
        # Tentar diferentes formas de conexão
        connection_attempts = [
            # Tentativa 1: User com schema
            {
                "host": "studio.rardevops.com",
                "port": 5432,
                "database": "postgres", 
                "user": "postgres.rarcursos",
                "password": "Aha517_Rar-PGRS_U2a59w"
            },
            # Tentativa 2: Database rarcursos
            {
                "host": "studio.rardevops.com",
                "port": 5432,
                "database": "rarcursos",
                "user": "postgres",
                "password": "Aha517_Rar-PGRS_U2a59w"
            },
            # Tentativa 3: Com search_path
            {
                "host": "studio.rardevops.com",
                "port": 5432,
                "database": "postgres",
                "user": "postgres",
                "password": "Aha517_Rar-PGRS_U2a59w",
                "options": "-c search_path=rarcursos"
            },
            # Tentativa 4: Porta diferente (comum em Supabase)
            {
                "host": "studio.rardevops.com",
                "port": 6543,
                "database": "postgres",
                "user": "postgres",
                "password": "Aha517_Rar-PGRS_U2a59w"
            }
        ]
        
        conn = None
        for i, params in enumerate(connection_attempts, 1):
            try:
                print(f"Tentativa {i}: {params}")
                conn = psycopg2.connect(**params)
                print(f"✅ Conectado na tentativa {i}")
                break
            except Exception as e:
                print(f"❌ Tentativa {i} falhou: {e}")
                continue
        
        if not conn:
            raise Exception("Todas as tentativas de conexão falharam")
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        print("✅ Conectado ao PostgreSQL")
        
        # Verificar tabelas no schema rarcursos
        cursor.execute("""
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'rarcursos'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"\n📋 Tabelas no schema rarcursos ({len(tables)} encontradas):")
        for table in tables:
            print(f"  - {table['table_name']} ({table['table_type']})")
        
        # Verificar estrutura da tabela curso_alunos
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'curso_alunos'
            ORDER BY ordinal_position;
        """)
        
        curso_alunos_cols = cursor.fetchall()
        if curso_alunos_cols:
            print(f"\n🔍 Estrutura da tabela curso_alunos ({len(curso_alunos_cols)} colunas):")
            for col in curso_alunos_cols:
                nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
                default = f" (default: {col['column_default']})" if col['column_default'] else ""
                print(f"  - {col['column_name']}: {col['data_type']} (nullable: {nullable}){default}")
        else:
            print("\n❌ Tabela curso_alunos não encontrada")
        
        # Verificar se tabela aula_permissoes existe
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'aula_permissoes'
            ORDER BY ordinal_position;
        """)
        
        aula_permissoes_cols = cursor.fetchall()
        if aula_permissoes_cols:
            print(f"\n🔍 Estrutura da tabela aula_permissoes ({len(aula_permissoes_cols)} colunas):")
            for col in aula_permissoes_cols:
                nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
                print(f"  - {col['column_name']}: {col['data_type']} (nullable: {nullable})")
        else:
            print("\n❌ Tabela aula_permissoes não existe - precisa ser criada")
        
        # Verificar estrutura da tabela aulas
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'aulas'
            ORDER BY ordinal_position;
        """)
        
        aulas_cols = cursor.fetchall()
        if aulas_cols:
            print(f"\n🔍 Estrutura da tabela aulas ({len(aulas_cols)} colunas):")
            for col in aulas_cols:
                nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
                print(f"  - {col['column_name']}: {col['data_type']} (nullable: {nullable})")
                
            # Verificar se já existe coluna 'privada'
            privada_exists = any(col['column_name'] == 'privada' for col in aulas_cols)
            if privada_exists:
                print("  ✅ Coluna 'privada' já existe na tabela aulas")
            else:
                print("  ❌ Coluna 'privada' não existe - precisa ser adicionada")
        else:
            print("\n❌ Tabela aulas não encontrada")
        
        # Verificar tabela users
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'users'
            ORDER BY ordinal_position;
        """)
        
        users_cols = cursor.fetchall()
        if users_cols:
            print(f"\n🔍 Tabela users existe ({len(users_cols)} colunas)")
        else:
            print("\n❌ Tabela users não encontrada")
        
        # Verificar tabela cursos
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'cursos'
            ORDER BY ordinal_position;
        """)
        
        cursos_cols = cursor.fetchall()
        if cursos_cols:
            print(f"\n🔍 Tabela cursos existe ({len(cursos_cols)} colunas)")
        else:
            print("\n❌ Tabela cursos não encontrada")
            
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")

if __name__ == "__main__":
    check_database_structure()