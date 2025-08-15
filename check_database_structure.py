import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_config():
    """Extrai configuração do banco de dados."""
    return {
        'host': "studio.rardevops.com",
        'database': "postgres",
        'user': "postgres",
        'password': "Aha517_Rar-PGRS_U2a59w",
        'port': 4202
    }

def get_connection():
    """Estabelece conexão com o banco de dados PostgreSQL."""
    db_config = get_db_config()
    
    # Tentativa 1: Conexão direta
    try:
        conn = psycopg2.connect(**db_config)
        conn.autocommit = False
        print(f"✅ Conectado ao banco: {db_config['host']}/{db_config['database']}")
        return conn
    except Exception as e1:
        print(f"❌ Tentativa 1 falhou: {e1}")
        
        # Tentativa 2: Com search_path
        try:
            conn_str = f"postgresql://{db_config['user']}:{db_config['password']}@{db_config['host']}:{db_config['port']}/{db_config['database']}?options=-csearch_path%3Drarcursos"
            conn = psycopg2.connect(conn_str)
            conn.autocommit = False
            print(f"✅ Conectado com search_path=rarcursos")
            return conn
        except Exception as e2:
            print(f"❌ Tentativa 2 falhou: {e2}")
            
            # Tentativa 3: Database rarcursos
            try:
                db_config['database'] = 'rarcursos'
                conn = psycopg2.connect(**db_config)
                conn.autocommit = False
                print(f"✅ Conectado ao database rarcursos")
                return conn
            except Exception as e3:
                print(f"❌ Todas as tentativas falharam:")
                print(f"  1. Conexão direta: {e1}")
                print(f"  2. Com search_path: {e2}")
                print(f"  3. Database rarcursos: {e3}")
                return None

def verificar_conexao(conn):
    """Verifica se a conexão está ativa."""
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()[0]
            print(f"📊 Versão do PostgreSQL: {version}")
            return True
    except Exception as e:
        print(f"❌ Erro ao verificar conexão: {e}")
        return False

def check_database_structure():
    """Função principal para verificar estrutura do banco."""
    print("=" * 60)
    print("🔍 VERIFICAÇÃO DA ESTRUTURA DO BANCO DE DADOS")
    print("=" * 60)
    
    # 1. Conectar ao banco
    print("\n1️⃣ Conectando ao banco de dados...")
    conn = get_connection()
    if not conn:
        print("❌ Não foi possível conectar ao banco")
        return
    
    # 2. Verificar conexão
    print("\n2️⃣ Verificando conexão...")
    if not verificar_conexao(conn):
        print("❌ Falha na verificação da conexão")
        conn.close()
        return
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 3. Verificar schemas disponíveis
        print("\n3️⃣ Verificando schemas disponíveis...")
        cursor.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            ORDER BY schema_name;
        """)
        
        schemas = cursor.fetchall()
        print(f"📋 Schemas encontrados ({len(schemas)}):")
        for schema in schemas:
            print(f"  - {schema['schema_name']}")
        
        # 4. Verificar tabelas no schema rarcursos
        print("\n4️⃣ Verificando tabelas no schema rarcursos...")
        cursor.execute("""
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'rarcursos'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"📋 Tabelas no schema rarcursos ({len(tables)} encontradas):")
        for table in tables:
            print(f"  - {table['table_name']} ({table['table_type']})")
        
        # 5. Verificar estrutura da tabela curso_alunos
        print("\n5️⃣ Verificando estrutura da tabela curso_alunos...")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'curso_alunos'
            ORDER BY ordinal_position;
        """)
        
        curso_alunos_cols = cursor.fetchall()
        if curso_alunos_cols:
            print(f"🔍 Estrutura da tabela curso_alunos ({len(curso_alunos_cols)} colunas):")
            for col in curso_alunos_cols:
                nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
                default = f" (default: {col['column_default']})" if col['column_default'] else ""
                print(f"  - {col['column_name']}: {col['data_type']} (nullable: {nullable}){default}")
                
            # Verificar se já existe coluna tipo_acesso
            tipo_acesso_exists = any(col['column_name'] == 'tipo_acesso' for col in curso_alunos_cols)
            if tipo_acesso_exists:
                print("  ✅ Coluna 'tipo_acesso' já existe")
            else:
                print("  ❌ Coluna 'tipo_acesso' não existe - precisa ser adicionada")
        else:
            print("❌ Tabela curso_alunos não encontrada")
        
        # 6. Verificar se tabela aula_permissoes existe
        print("\n6️⃣ Verificando tabela aula_permissoes...")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'aula_permissoes'
            ORDER BY ordinal_position;
        """)
        
        aula_permissoes_cols = cursor.fetchall()
        if aula_permissoes_cols:
            print(f"🔍 Estrutura da tabela aula_permissoes ({len(aula_permissoes_cols)} colunas):")
            for col in aula_permissoes_cols:
                nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
                print(f"  - {col['column_name']}: {col['data_type']} (nullable: {nullable})")
        else:
            print("❌ Tabela aula_permissoes não existe - precisa ser criada")
        
        # 7. Verificar estrutura da tabela aulas
        print("\n7️⃣ Verificando estrutura da tabela aulas...")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'aulas'
            ORDER BY ordinal_position;
        """)
        
        aulas_cols = cursor.fetchall()
        if aulas_cols:
            print(f"🔍 Estrutura da tabela aulas ({len(aulas_cols)} colunas):")
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
            print("❌ Tabela aulas não encontrada")
        
        # 8. Verificar outras tabelas importantes
        print("\n8️⃣ Verificando outras tabelas importantes...")
        
        tabelas_importantes = ['users', 'cursos', 'convites_pendentes']
        for tabela in tabelas_importantes:
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM information_schema.columns 
                WHERE table_schema = 'rarcursos' AND table_name = %s;
            """, (tabela,))
            
            result = cursor.fetchone()
            if result['count'] > 0:
                print(f"  ✅ Tabela '{tabela}' existe ({result['count']} colunas)")
            else:
                print(f"  ❌ Tabela '{tabela}' não encontrada")
        
        # 9. Resumo das migrações necessárias
        print("\n" + "=" * 60)
        print("📋 RESUMO DAS MIGRAÇÕES NECESSÁRIAS:")
        print("=" * 60)
        
        migracoes_necessarias = []
        
        if not curso_alunos_cols:
            migracoes_necessarias.append("❌ Criar tabela curso_alunos")
        elif not any(col['column_name'] == 'tipo_acesso' for col in curso_alunos_cols):
            migracoes_necessarias.append("🔧 Adicionar coluna tipo_acesso à tabela curso_alunos")
        
        if not aula_permissoes_cols:
            migracoes_necessarias.append("❌ Criar tabela aula_permissoes")
        
        if not aulas_cols:
            migracoes_necessarias.append("❌ Criar tabela aulas")
        elif not any(col['column_name'] == 'privada' for col in aulas_cols):
            migracoes_necessarias.append("🔧 Adicionar coluna privada à tabela aulas")
        
        # Verificar convites_pendentes
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'convites_pendentes';
        """)
        convites_result = cursor.fetchone()
        if convites_result['count'] == 0:
            migracoes_necessarias.append("❌ Criar tabela convites_pendentes")
        
        if migracoes_necessarias:
            for migracao in migracoes_necessarias:
                print(f"  {migracao}")
        else:
            print("  ✅ Todas as tabelas e colunas necessárias já existem!")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("🏁 VERIFICAÇÃO CONCLUÍDA")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Erro durante verificação: {e}")
        conn.close()

if __name__ == "__main__":
    check_database_structure()