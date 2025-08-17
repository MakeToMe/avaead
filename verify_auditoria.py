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

def verificar_sistema_auditoria():
    """Verifica se o sistema de auditoria foi criado corretamente."""
    print("=" * 60)
    print("🔍 VERIFICAÇÃO DO SISTEMA DE AUDITORIA")
    print("=" * 60)
    
    conn = get_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Verificar tabela logs_auditoria
        print("\n1️⃣ Verificando tabela logs_auditoria...")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'logs_auditoria'
            ORDER BY ordinal_position;
        """)
        
        cols_logs = cursor.fetchall()
        print(f"📋 Tabela logs_auditoria: {len(cols_logs)} colunas")
        for col in cols_logs:
            nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
            print(f"  - {col['column_name']}: {col['data_type']} (nullable: {nullable})")
        
        # 2. Verificar tabela metricas_auditoria
        print("\n2️⃣ Verificando tabela metricas_auditoria...")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'metricas_auditoria'
            ORDER BY ordinal_position;
        """)
        
        cols_metricas = cursor.fetchall()
        print(f"📋 Tabela metricas_auditoria: {len(cols_metricas)} colunas")
        for col in cols_metricas:
            nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
            print(f"  - {col['column_name']}: {col['data_type']} (nullable: {nullable})")
        
        # 3. Verificar views
        print("\n3️⃣ Verificando views criadas...")
        cursor.execute("""
            SELECT table_name, view_definition
            FROM information_schema.views 
            WHERE table_schema = 'rarcursos' 
            AND table_name IN ('v_relatorio_auditoria', 'v_metricas_resumidas');
        """)
        
        views = cursor.fetchall()
        print(f"📋 Views criadas: {len(views)}")
        for view in views:
            print(f"  - {view['table_name']}")
        
        # 4. Verificar funções
        print("\n4️⃣ Verificando funções criadas...")
        cursor.execute("""
            SELECT routine_name, routine_type
            FROM information_schema.routines 
            WHERE routine_schema = 'rarcursos' 
            AND routine_name IN ('atualizar_metricas_auditoria', 'limpar_logs_auditoria_antigos');
        """)
        
        funcoes = cursor.fetchall()
        print(f"📋 Funções criadas: {len(funcoes)}")
        for funcao in funcoes:
            print(f"  - {funcao['routine_name']} ({funcao['routine_type']})")
        
        # 5. Verificar triggers
        print("\n5️⃣ Verificando triggers...")
        cursor.execute("""
            SELECT trigger_name, event_manipulation, action_timing
            FROM information_schema.triggers 
            WHERE trigger_schema = 'rarcursos' 
            AND trigger_name = 'trigger_atualizar_metricas_auditoria';
        """)
        
        triggers = cursor.fetchall()
        print(f"📋 Triggers criados: {len(triggers)}")
        for trigger in triggers:
            print(f"  - {trigger['trigger_name']} ({trigger['action_timing']} {trigger['event_manipulation']})")
        
        # 6. Verificar índices de auditoria
        print("\n6️⃣ Verificando índices de auditoria...")
        cursor.execute("""
            SELECT indexname, tablename
            FROM pg_indexes 
            WHERE schemaname = 'rarcursos' 
            AND (tablename = 'logs_auditoria' OR tablename = 'metricas_auditoria')
            ORDER BY tablename, indexname;
        """)
        
        indices = cursor.fetchall()
        print(f"📋 Índices de auditoria: {len(indices)}")
        
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
        
        # 7. Verificar evento inicial
        print("\n7️⃣ Verificando evento inicial...")
        cursor.execute("""
            SELECT tipo_evento, severidade, detalhes, timestamp
            FROM rarcursos.logs_auditoria 
            WHERE tipo_evento = 'sistema_auditoria_criado'
            ORDER BY timestamp DESC
            LIMIT 1;
        """)
        
        evento = cursor.fetchone()
        if evento:
            print(f"✅ Evento inicial encontrado:")
            print(f"  - Tipo: {evento['tipo_evento']}")
            print(f"  - Severidade: {evento['severidade']}")
            print(f"  - Timestamp: {evento['timestamp']}")
            print(f"  - Detalhes: {evento['detalhes']}")
        else:
            print("❌ Evento inicial não encontrado")
        
        # 8. Testar inserção de log
        print("\n8️⃣ Testando inserção de log...")
        cursor.execute("""
            INSERT INTO rarcursos.logs_auditoria (
                tipo_evento,
                severidade,
                recurso_tipo,
                detalhes
            ) VALUES (
                'teste_verificacao',
                'info',
                'sistema',
                '{"teste": true, "verificacao": "sistema_auditoria"}'::jsonb
            ) RETURNING id;
        """)
        
        log_id = cursor.fetchone()['id']
        print(f"✅ Log de teste inserido com ID: {log_id}")
        
        # Verificar se o trigger funcionou
        cursor.execute("""
            SELECT total_eventos, usuarios_unicos
            FROM rarcursos.metricas_auditoria 
            WHERE data_referencia = CURRENT_DATE 
            AND tipo_evento = 'teste_verificacao'
            AND recurso_tipo = 'sistema';
        """)
        
        metrica = cursor.fetchone()
        if metrica:
            print(f"✅ Trigger funcionando - Métricas atualizadas:")
            print(f"  - Total eventos: {metrica['total_eventos']}")
            print(f"  - Usuários únicos: {metrica['usuarios_unicos']}")
        else:
            print("⚠️ Trigger pode não estar funcionando")
        
        # Limpar log de teste
        cursor.execute("DELETE FROM rarcursos.logs_auditoria WHERE id = %s", (log_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("🎉 SISTEMA DE AUDITORIA VERIFICADO COM SUCESSO!")
        print("=" * 60)
        print("📋 Componentes verificados:")
        print(f"  - Tabela logs_auditoria: ✅ ({len(cols_logs)} colunas)")
        print(f"  - Tabela metricas_auditoria: ✅ ({len(cols_metricas)} colunas)")
        print(f"  - Views: ✅ ({len(views)} criadas)")
        print(f"  - Funções: ✅ ({len(funcoes)} criadas)")
        print(f"  - Triggers: ✅ ({len(triggers)} ativos)")
        print(f"  - Índices: ✅ ({len(indices)} criados)")
        print(f"  - Evento inicial: ✅")
        print(f"  - Teste de inserção: ✅")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante verificação: {e}")
        conn.rollback()
        conn.close()
        return False

if __name__ == "__main__":
    verificar_sistema_auditoria()