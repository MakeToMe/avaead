import psycopg2
import sys

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

def executar_sql_auditoria():
    """Executa o script SQL de criação da tabela de auditoria."""
    print("=" * 60)
    print("🚀 MIGRAÇÃO DA TABELA DE AUDITORIA")
    print("=" * 60)
    
    # Ler o arquivo SQL
    try:
        with open('sql/criar-tabela-auditoria.sql', 'r', encoding='utf-8') as f:
            sql_content = f.read()
        print("📄 Script SQL carregado com sucesso")
    except Exception as e:
        print(f"❌ Erro ao ler arquivo SQL: {e}")
        return False
    
    # Conectar ao banco
    conn = get_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        print("\n🔄 Executando script de auditoria...")
        
        # Executar o script SQL completo
        cursor.execute(sql_content)
        
        print("✅ Script executado com sucesso")
        
        # Verificar se as tabelas foram criadas
        print("\n🔍 Verificando estruturas criadas...")
        
        # Verificar tabela logs_auditoria
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'logs_auditoria'
            ORDER BY ordinal_position;
        """)
        
        cols_logs = cursor.fetchall()
        print(f"📋 Tabela logs_auditoria: {len(cols_logs)} colunas")
        
        # Verificar tabela metricas_auditoria
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'metricas_auditoria'
            ORDER BY ordinal_position;
        """)
        
        cols_metricas = cursor.fetchall()
        print(f"📋 Tabela metricas_auditoria: {len(cols_metricas)} colunas")
        
        # Verificar views criadas
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'rarcursos' 
            AND table_name IN ('v_relatorio_auditoria', 'v_metricas_resumidas');
        """)
        
        views = cursor.fetchall()
        print(f"📋 Views criadas: {len(views)}")
        for view in views:
            print(f"  - {view[0]}")
        
        # Verificar se o evento inicial foi inserido
        cursor.execute("""
            SELECT COUNT(*) 
            FROM rarcursos.logs_auditoria 
            WHERE tipo_evento = 'sistema_auditoria_criado';
        """)
        
        evento_inicial = cursor.fetchone()[0]
        print(f"📋 Evento inicial criado: {'✅' if evento_inicial > 0 else '❌'}")
        
        # Commit das alterações
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("🎉 MIGRAÇÃO DE AUDITORIA CONCLUÍDA!")
        print("=" * 60)
        print("📋 Estruturas criadas:")
        print("  - Tabela logs_auditoria")
        print("  - Tabela metricas_auditoria") 
        print("  - View v_relatorio_auditoria")
        print("  - View v_metricas_resumidas")
        print("  - Função atualizar_metricas_auditoria()")
        print("  - Função limpar_logs_auditoria_antigos()")
        print("  - Trigger para métricas automáticas")
        print("  - Índices para performance")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro durante migração: {e}")
        conn.rollback()
        conn.close()
        return False

if __name__ == "__main__":
    success = executar_sql_auditoria()
    if not success:
        sys.exit(1)