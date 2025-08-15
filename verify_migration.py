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

def verificar_migracao():
    """Verifica se a migração foi executada corretamente."""
    print("=" * 60)
    print("🔍 VERIFICAÇÃO DA MIGRAÇÃO")
    print("=" * 60)
    
    conn = get_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("\n1️⃣ Verificando colunas da tabela matriculas...")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'matriculas'
            ORDER BY ordinal_position;
        """)
        
        colunas = cursor.fetchall()
        print(f"📋 Tabela matriculas: {len(colunas)} colunas")
        
        # Verificar colunas específicas
        colunas_nomes = [col['column_name'] for col in colunas]
        tipo_acesso_exists = 'tipo_acesso' in colunas_nomes
        adicionado_por_exists = 'adicionado_por' in colunas_nomes
        
        print(f"  - tipo_acesso: {'✅ Existe' if tipo_acesso_exists else '❌ Não existe'}")
        print(f"  - adicionado_por: {'✅ Existe' if adicionado_por_exists else '❌ Não existe'}")
        
        # Mostrar detalhes das novas colunas
        for col in colunas:
            if col['column_name'] in ['tipo_acesso', 'adicionado_por']:
                nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
                default = f" (default: {col['column_default']})" if col['column_default'] else ""
                print(f"    {col['column_name']}: {col['data_type']} (nullable: {nullable}){default}")
        
        print("\n2️⃣ Verificando tabelas criadas...")
        cursor.execute("""
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns 
                    WHERE table_schema = 'rarcursos' AND table_name = t.table_name) as num_colunas
            FROM information_schema.tables t
            WHERE table_schema = 'rarcursos' 
            AND table_name IN ('aula_permissoes', 'convites_pendentes')
            ORDER BY table_name;
        """)
        
        tabelas = cursor.fetchall()
        print(f"📋 Tabelas criadas: {len(tabelas)}")
        for tabela in tabelas:
            print(f"  - {tabela['table_name']}: {tabela['num_colunas']} colunas")
        
        print("\n3️⃣ Verificando estrutura da tabela aula_permissoes...")
        if any(t['table_name'] == 'aula_permissoes' for t in tabelas):
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_schema = 'rarcursos' AND table_name = 'aula_permissoes'
                ORDER BY ordinal_position;
            """)
            
            cols_aula_permissoes = cursor.fetchall()
            for col in cols_aula_permissoes:
                nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
                print(f"    {col['column_name']}: {col['data_type']} (nullable: {nullable})")
        
        print("\n4️⃣ Verificando estrutura da tabela convites_pendentes...")
        if any(t['table_name'] == 'convites_pendentes' for t in tabelas):
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_schema = 'rarcursos' AND table_name = 'convites_pendentes'
                ORDER BY ordinal_position;
            """)
            
            cols_convites = cursor.fetchall()
            for col in cols_convites:
                nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
                print(f"    {col['column_name']}: {col['data_type']} (nullable: {nullable})")
        
        print("\n5️⃣ Verificando índices criados...")
        cursor.execute("""
            SELECT indexname, tablename
            FROM pg_indexes 
            WHERE schemaname = 'rarcursos' 
            AND indexname LIKE 'idx_%'
            AND (tablename = 'matriculas' OR tablename = 'aula_permissoes' OR tablename = 'convites_pendentes')
            ORDER BY tablename, indexname;
        """)
        
        indices = cursor.fetchall()
        print(f"📋 Índices criados: {len(indices)}")
        
        indices_por_tabela = {}
        for indice in indices:
            tabela = indice['tablename']
            if tabela not in indices_por_tabela:
                indices_por_tabela[tabela] = []
            indices_por_tabela[tabela].append(indice['indexname'])
        
        for tabela, lista_indices in indices_por_tabela.items():
            print(f"  {tabela}:")
            for indice in lista_indices:
                print(f"    - {indice}")
        
        print("\n6️⃣ Verificando constraints...")
        cursor.execute("""
            SELECT tc.constraint_name, tc.table_name, tc.constraint_type, 
                   kcu.column_name, ccu.table_name AS foreign_table_name,
                   ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.table_schema = 'rarcursos'
            AND tc.table_name IN ('matriculas', 'aula_permissoes', 'convites_pendentes')
            AND tc.constraint_type IN ('CHECK', 'FOREIGN KEY', 'UNIQUE')
            ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
        """)
        
        constraints = cursor.fetchall()
        print(f"📋 Constraints encontradas: {len(constraints)}")
        
        constraints_por_tabela = {}
        for constraint in constraints:
            tabela = constraint['table_name']
            if tabela not in constraints_por_tabela:
                constraints_por_tabela[tabela] = []
            
            info = f"{constraint['constraint_type']}: {constraint['constraint_name']}"
            if constraint['constraint_type'] == 'FOREIGN KEY':
                info += f" ({constraint['column_name']} -> {constraint['foreign_table_name']}.{constraint['foreign_column_name']})"
            elif constraint['column_name']:
                info += f" ({constraint['column_name']})"
            
            constraints_por_tabela[tabela].append(info)
        
        for tabela, lista_constraints in constraints_por_tabela.items():
            print(f"  {tabela}:")
            for constraint in lista_constraints:
                print(f"    - {constraint}")
        
        print("\n7️⃣ Resumo da verificação...")
        
        # Verificar se tudo foi criado corretamente
        esperado_colunas = 2  # tipo_acesso, adicionado_por
        esperado_tabelas = 2  # aula_permissoes, convites_pendentes
        esperado_indices_min = 6  # pelo menos 6 índices
        
        colunas_ok = tipo_acesso_exists and adicionado_por_exists
        tabelas_ok = len(tabelas) >= esperado_tabelas
        indices_ok = len(indices) >= esperado_indices_min
        
        print(f"  - Colunas adicionadas: {'✅' if colunas_ok else '❌'} ({2 if colunas_ok else 0}/{esperado_colunas})")
        print(f"  - Tabelas criadas: {'✅' if tabelas_ok else '❌'} ({len(tabelas)}/{esperado_tabelas})")
        print(f"  - Índices criados: {'✅' if indices_ok else '❌'} ({len(indices)}/{esperado_indices_min}+)")
        
        sucesso_geral = colunas_ok and tabelas_ok and indices_ok
        
        print("\n" + "=" * 60)
        if sucesso_geral:
            print("🎉 MIGRAÇÃO VERIFICADA COM SUCESSO!")
            print("✅ Todas as estruturas foram criadas corretamente")
        else:
            print("⚠️ MIGRAÇÃO INCOMPLETA")
            print("❌ Algumas estruturas podem estar faltando")
        print("=" * 60)
        
        cursor.close()
        conn.close()
        
        return sucesso_geral
        
    except Exception as e:
        print(f"❌ Erro durante verificação: {e}")
        if conn:
            conn.close()
        return False

if __name__ == "__main__":
    verificar_migracao()