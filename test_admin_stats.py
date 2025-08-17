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

def testar_admin_stats():
    """Testa as queries que o admin-actions.ts deveria executar."""
    
    # IDs do cenário
    admin_uid = "db7b5806-7d5a-40d7-b049-1e55c364bf3e"
    
    conn = get_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("🧪 Testando queries de estatísticas do admin...")
        
        # 1. Testar estatísticas globais (admin)
        print("\n1️⃣ Estatísticas globais (admin):")
        
        # Cursos
        cursor.execute("SELECT COUNT(*) as count FROM rarcursos.cursos")
        cursos_count = cursor.fetchone()['count']
        print(f"  - Total de cursos: {cursos_count}")
        
        # Aulas
        cursor.execute("SELECT COUNT(*) as count FROM rarcursos.aulas")
        aulas_count = cursor.fetchone()['count']
        print(f"  - Total de aulas: {aulas_count}")
        
        # Alunos únicos
        cursor.execute("""
            SELECT COUNT(DISTINCT aluno_id) as count 
            FROM rarcursos.matriculas 
            WHERE status = 'ativa'
        """)
        alunos_count = cursor.fetchone()['count']
        print(f"  - Total de alunos únicos: {alunos_count}")
        
        # 2. Testar estatísticas do instrutor
        print(f"\n2️⃣ Estatísticas do instrutor ({admin_uid}):")
        
        # Cursos do instrutor
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM rarcursos.cursos 
            WHERE instrutor_id = %s
        """, (admin_uid,))
        cursos_instrutor = cursor.fetchone()['count']
        print(f"  - Cursos do instrutor: {cursos_instrutor}")
        
        # Aulas do instrutor
        cursor.execute("""
            SELECT COUNT(DISTINCT a.id) as count
            FROM rarcursos.aulas a
            JOIN rarcursos.modulos m ON a.modulo_id = m.id
            JOIN rarcursos.cursos c ON m.curso_id = c.id
            WHERE c.instrutor_id = %s
        """, (admin_uid,))
        aulas_instrutor = cursor.fetchone()['count']
        print(f"  - Aulas do instrutor: {aulas_instrutor}")
        
        # Alunos do instrutor
        cursor.execute("""
            SELECT COUNT(DISTINCT m.aluno_id) as count
            FROM rarcursos.matriculas m
            JOIN rarcursos.cursos c ON m.curso_id = c.id
            WHERE m.status = 'ativa' AND c.instrutor_id = %s
        """, (admin_uid,))
        alunos_instrutor = cursor.fetchone()['count']
        print(f"  - Alunos do instrutor: {alunos_instrutor}")
        
        # 3. Testar query de alunos detalhada
        print(f"\n3️⃣ Query detalhada de alunos do instrutor:")
        
        cursor.execute("""
            SELECT 
                m.id as matricula_id,
                m.aluno_id,
                m.curso_id,
                m.criado_em,
                u.uid,
                u.nome,
                u.email,
                u.whatsapp,
                u.mail_valid,
                u.wpp_valid,
                c.id as curso_id,
                c.titulo as curso_titulo
            FROM rarcursos.matriculas m
            JOIN rarcursos.users u ON m.aluno_id = u.uid
            JOIN rarcursos.cursos c ON m.curso_id = c.id
            WHERE m.status = 'ativa' AND c.instrutor_id = %s
            ORDER BY m.criado_em DESC
            LIMIT 10
        """, (admin_uid,))
        
        alunos_detalhados = cursor.fetchall()
        print(f"  - Alunos encontrados: {len(alunos_detalhados)}")
        
        for aluno in alunos_detalhados:
            print(f"    • {aluno['nome']} ({aluno['email']}) - Curso: {aluno['curso_titulo']}")
        
        # 4. Verificar se há diferença entre as queries
        print(f"\n4️⃣ Comparação de resultados:")
        print(f"  - Estatística global de alunos: {alunos_count}")
        print(f"  - Estatística do instrutor: {alunos_instrutor}")
        print(f"  - Query detalhada encontrou: {len(alunos_detalhados)} registros")
        
        if alunos_instrutor != len(alunos_detalhados):
            print("  ⚠️ Há diferença entre as queries!")
            
            # Investigar a diferença
            print("\n🔍 Investigando diferenças...")
            
            # Verificar se há alunos duplicados
            cursor.execute("""
                SELECT aluno_id, COUNT(*) as count
                FROM rarcursos.matriculas m
                JOIN rarcursos.cursos c ON m.curso_id = c.id
                WHERE m.status = 'ativa' AND c.instrutor_id = %s
                GROUP BY aluno_id
                HAVING COUNT(*) > 1
            """, (admin_uid,))
            
            duplicados = cursor.fetchall()
            if duplicados:
                print(f"  - Alunos com múltiplas matrículas: {len(duplicados)}")
                for dup in duplicados:
                    print(f"    • Aluno {dup['aluno_id']}: {dup['count']} matrículas")
        else:
            print("  ✅ Queries consistentes!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro durante teste: {e}")
        conn.close()

if __name__ == "__main__":
    testar_admin_stats()