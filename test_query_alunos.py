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

def testar_query_alunos():
    """Testa a query que a API deveria executar."""
    
    curso_id = "80374430-e883-43ea-92bf-ca0b2ebde23d"
    
    conn = get_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print(f"🧪 Testando query para curso: {curso_id}")
        
        # Query que a API usa
        matriculas_query = """
          SELECT 
            m.id,
            m.aluno_id,
            m.tipo_acesso,
            m.data_matricula,
            m.progresso_percentual,
            u.nome,
            u.email
          FROM rarcursos.matriculas m
          JOIN rarcursos.users u ON m.aluno_id = u.uid
          WHERE m.curso_id = %s AND m.status = 'ativa'
          ORDER BY m.data_matricula DESC
        """
        
        cursor.execute(matriculas_query, (curso_id,))
        matriculas = cursor.fetchall()
        
        print(f"📊 Matrículas encontradas: {len(matriculas)}")
        
        if matriculas:
            for i, matricula in enumerate(matriculas, 1):
                print(f"\n👤 Aluno {i}:")
                print(f"  - ID: {matricula['id']}")
                print(f"  - Aluno ID: {matricula['aluno_id']}")
                print(f"  - Nome: {matricula['nome']}")
                print(f"  - Email: {matricula['email']}")
                print(f"  - Tipo Acesso: {matricula['tipo_acesso']}")
                print(f"  - Data Matrícula: {matricula['data_matricula']}")
                print(f"  - Progresso: {matricula['progresso_percentual']}%")
            
            # Testar query de aulas específicas
            alunos_ids = [m['aluno_id'] for m in matriculas]
            
            print(f"\n🔍 Testando aulas específicas para {len(alunos_ids)} alunos...")
            
            # Converter para formato correto do PostgreSQL
            alunos_ids_str = '{' + ','.join(alunos_ids) + '}'
            
            permissoes_query = """
              SELECT 
                ap.aluno_id,
                COUNT(*) as total_aulas_especificas
              FROM rarcursos.aula_permissoes ap
              JOIN rarcursos.aulas a ON ap.aula_id = a.id
              WHERE ap.aluno_id = ANY(%s::uuid[]) AND a.curso_id = %s
              GROUP BY ap.aluno_id
            """
            
            cursor.execute(permissoes_query, (alunos_ids_str, curso_id))
            aulas_especificas = cursor.fetchall()
            
            print(f"📊 Permissões especiais encontradas: {len(aulas_especificas)}")
            for perm in aulas_especificas:
                print(f"  - Aluno {perm['aluno_id']}: {perm['total_aulas_especificas']} aulas específicas")
            
            # Simular resposta da API
            print(f"\n🎯 Resposta simulada da API:")
            
            alunos_processados = []
            for matricula in matriculas:
                aulas_especificas_count = 0
                for perm in aulas_especificas:
                    if perm['aluno_id'] == matricula['aluno_id']:
                        aulas_especificas_count = perm['total_aulas_especificas']
                        break
                
                aluno_processado = {
                    'id': matricula['id'],
                    'aluno_id': matricula['aluno_id'],
                    'nome': matricula['nome'],
                    'email': matricula['email'],
                    'tipo_acesso': matricula['tipo_acesso'],
                    'data_matricula': str(matricula['data_matricula']),
                    'progresso_percentual': matricula['progresso_percentual'] or 0,
                    'aulas_especificas': aulas_especificas_count
                }
                alunos_processados.append(aluno_processado)
            
            matriculados = len([a for a in alunos_processados if a['tipo_acesso'] == 'matriculado'])
            convidados = len([a for a in alunos_processados if a['tipo_acesso'] == 'convidado_curso'])
            
            resposta_api = {
                'alunos': alunos_processados,
                'total': len(alunos_processados),
                'matriculados': matriculados,
                'convidados': convidados
            }
            
            import json
            print(json.dumps(resposta_api, indent=2, ensure_ascii=False, default=str))
            
        else:
            print("❌ Nenhuma matrícula encontrada!")
            
            # Verificar se o problema é na query
            print("\n🔍 Verificando possíveis problemas...")
            
            # Verificar se curso existe
            cursor.execute("SELECT id, titulo FROM rarcursos.cursos WHERE id = %s", (curso_id,))
            curso = cursor.fetchone()
            if curso:
                print(f"✅ Curso existe: {curso['titulo']}")
            else:
                print("❌ Curso não encontrado!")
                return
            
            # Verificar matrículas sem filtro de status
            cursor.execute("""
                SELECT m.*, u.nome, u.email 
                FROM rarcursos.matriculas m
                JOIN rarcursos.users u ON m.aluno_id = u.uid
                WHERE m.curso_id = %s
            """, (curso_id,))
            
            todas_matriculas = cursor.fetchall()
            print(f"📊 Total de matrículas (sem filtro): {len(todas_matriculas)}")
            
            for matricula in todas_matriculas:
                print(f"  - {matricula['nome']} - Status: {matricula['status']}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro durante teste: {e}")
        conn.close()

if __name__ == "__main__":
    testar_query_alunos()