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

def debug_matriculas_especificas():
    """Debug específico para o cenário relatado."""
    print("=" * 60)
    print("🔍 DEBUG: PROBLEMA DE MATRÍCULAS NO DASHBOARD")
    print("=" * 60)
    
    # IDs específicos do cenário
    admin_uid = "db7b5806-7d5a-40d7-b049-1e55c364bf3e"
    curso_uid = "80374430-e883-43ea-92bf-ca0b2ebde23d"
    aluno_uid = "06349a32-6f28-4d16-8bf0-2997f0dad83b"
    
    conn = get_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Verificar se os usuários existem
        print("\n1️⃣ Verificando usuários...")
        
        cursor.execute("""
            SELECT uid, nome, email, perfis 
            FROM rarcursos.users 
            WHERE uid IN (%s, %s)
        """, (admin_uid, aluno_uid))
        
        usuarios = cursor.fetchall()
        print(f"📋 Usuários encontrados: {len(usuarios)}")
        for user in usuarios:
            print(f"  - {user['nome']} ({user['email']}) - Perfil: {user['perfis']} - UID: {user['uid']}")
        
        # 2. Verificar se o curso existe
        print("\n2️⃣ Verificando curso...")
        
        cursor.execute("""
            SELECT id, titulo, instrutor_id, criado_em
            FROM rarcursos.cursos 
            WHERE id = %s
        """, (curso_uid,))
        
        curso = cursor.fetchone()
        if curso:
            print(f"📋 Curso encontrado:")
            print(f"  - Título: {curso['titulo']}")
            print(f"  - Instrutor ID: {curso['instrutor_id']}")
            print(f"  - Criado em: {curso['criado_em']}")
            print(f"  - ID: {curso['id']}")
        else:
            print("❌ Curso não encontrado!")
            return
        
        # 3. Verificar matrículas na tabela matriculas
        print("\n3️⃣ Verificando matrículas...")
        
        cursor.execute("""
            SELECT m.*, u.nome as aluno_nome, u.email as aluno_email
            FROM rarcursos.matriculas m
            JOIN rarcursos.users u ON m.aluno_id = u.uid
            WHERE m.curso_id = %s
        """, (curso_uid,))
        
        matriculas = cursor.fetchall()
        print(f"📋 Matrículas encontradas: {len(matriculas)}")
        for matricula in matriculas:
            print(f"  - Aluno: {matricula['aluno_nome']} ({matricula['aluno_email']})")
            print(f"    ID: {matricula['aluno_id']}")
            print(f"    Tipo Acesso: {matricula.get('tipo_acesso', 'N/A')}")
            print(f"    Adicionado Por: {matricula.get('adicionado_por', 'N/A')}")
            print(f"    Criado em: {matricula['criado_em']}")
            print()
        
        # 4. Verificar se existe matrícula específica do aluno
        print("\n4️⃣ Verificando matrícula específica do aluno...")
        
        cursor.execute("""
            SELECT * FROM rarcursos.matriculas 
            WHERE curso_id = %s AND aluno_id = %s
        """, (curso_uid, aluno_uid))
        
        matricula_especifica = cursor.fetchone()
        if matricula_especifica:
            print("✅ Matrícula específica encontrada:")
            for key, value in matricula_especifica.items():
                print(f"  - {key}: {value}")
        else:
            print("❌ Matrícula específica NÃO encontrada!")
        
        # 5. Verificar se admin é instrutor do curso
        print("\n5️⃣ Verificando se admin é instrutor do curso...")
        
        if curso['instrutor_id'] == admin_uid:
            print("✅ Admin é o instrutor do curso")
        else:
            print(f"❌ Admin NÃO é instrutor do curso!")
            print(f"  - Instrutor do curso: {curso['instrutor_id']}")
            print(f"  - Admin UID: {admin_uid}")
        
        # 6. Verificar estrutura da tabela matriculas
        print("\n6️⃣ Verificando estrutura da tabela matriculas...")
        
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' AND table_name = 'matriculas'
            ORDER BY ordinal_position;
        """)
        
        colunas = cursor.fetchall()
        print(f"📋 Colunas da tabela matriculas ({len(colunas)}):")
        for col in colunas:
            nullable = "SIM" if col['is_nullable'] == 'YES' else "NÃO"
            default = f" (default: {col['column_default']})" if col['column_default'] else ""
            print(f"  - {col['column_name']}: {col['data_type']} (nullable: {nullable}){default}")
        
        # 7. Verificar se existe tabela curso_alunos (antiga)
        print("\n7️⃣ Verificando se existe tabela curso_alunos (antiga)...")
        
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM information_schema.tables 
            WHERE table_schema = 'rarcursos' AND table_name = 'curso_alunos'
        """)
        
        curso_alunos_exists = cursor.fetchone()['count'] > 0
        
        if curso_alunos_exists:
            print("⚠️ Tabela curso_alunos ainda existe!")
            
            cursor.execute("""
                SELECT ca.*, u.nome as aluno_nome, u.email as aluno_email
                FROM rarcursos.curso_alunos ca
                JOIN rarcursos.users u ON ca.aluno_id = u.uid
                WHERE ca.curso_id = %s
            """, (curso_uid,))
            
            curso_alunos = cursor.fetchall()
            print(f"📋 Registros em curso_alunos: {len(curso_alunos)}")
            for ca in curso_alunos:
                print(f"  - Aluno: {ca['aluno_nome']} ({ca['aluno_email']})")
                print(f"    ID: {ca['aluno_id']}")
                print(f"    Tipo Acesso: {ca.get('tipo_acesso', 'N/A')}")
        else:
            print("✅ Tabela curso_alunos não existe (correto)")
        
        # 8. Verificar query que o dashboard pode estar usando
        print("\n8️⃣ Testando query do dashboard...")
        
        # Query que o dashboard provavelmente usa
        cursor.execute("""
            SELECT COUNT(*) as total_alunos
            FROM rarcursos.matriculas m
            JOIN rarcursos.cursos c ON m.curso_id = c.id
            WHERE c.instrutor_id = %s AND c.id = %s
        """, (admin_uid, curso_uid))
        
        total_dashboard = cursor.fetchone()['total_alunos']
        print(f"📊 Total de alunos que o dashboard deveria mostrar: {total_dashboard}")
        
        # 9. Verificar se há problema com foreign keys
        print("\n9️⃣ Verificando foreign keys...")
        
        cursor.execute("""
            SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name,
                   ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_schema = 'rarcursos' 
            AND tc.table_name = 'matriculas'
            AND tc.constraint_type = 'FOREIGN KEY'
        """)
        
        fks = cursor.fetchall()
        print(f"📋 Foreign keys da tabela matriculas: {len(fks)}")
        for fk in fks:
            print(f"  - {fk['constraint_name']}: {fk['column_name']} -> {fk['foreign_table_name']}.{fk['foreign_column_name']}")
        
        cursor.close()
        conn.close()
        
        # 10. Diagnóstico final
        print("\n" + "=" * 60)
        print("🔍 DIAGNÓSTICO")
        print("=" * 60)
        
        if not matricula_especifica:
            print("❌ PROBLEMA IDENTIFICADO: Matrícula não existe na tabela matriculas")
            print("💡 POSSÍVEIS CAUSAS:")
            print("  1. Dados ainda estão em tabela antiga (curso_alunos)")
            print("  2. Matrícula foi removida acidentalmente")
            print("  3. Migração não foi executada corretamente")
            print("  4. Dashboard está consultando tabela errada")
        elif curso['instrutor_id'] != admin_uid:
            print("❌ PROBLEMA IDENTIFICADO: Admin não é instrutor do curso")
            print("💡 SOLUÇÃO: Verificar permissões de instrutor")
        elif total_dashboard == 0:
            print("❌ PROBLEMA IDENTIFICADO: Query do dashboard não retorna resultados")
            print("💡 SOLUÇÃO: Verificar lógica do dashboard")
        else:
            print("✅ Dados parecem corretos no banco")
            print("💡 POSSÍVEL CAUSA: Problema no frontend/cache")
        
    except Exception as e:
        print(f"❌ Erro durante debug: {e}")
        conn.close()

if __name__ == "__main__":
    debug_matriculas_especificas()