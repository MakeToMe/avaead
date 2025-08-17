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

def testar_buscar_curso():
    """Testa a query que buscarCursoPorId deveria executar."""
    
    # IDs do cenário
    curso_id = "80374430-e883-43ea-92bf-ca0b2ebde23d"
    instrutor_id = "db7b5806-7d5a-40d7-b049-1e55c364bf3e"
    
    conn = get_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print(f"🧪 Testando busca do curso: {curso_id}")
        print(f"👤 Instrutor: {instrutor_id}")
        
        # Query que a função buscarCursoPorId usa
        query = """
            SELECT * FROM rarcursos.cursos 
            WHERE id = %s AND instrutor_id = %s
        """
        
        cursor.execute(query, (curso_id, instrutor_id))
        curso = cursor.fetchone()
        
        if curso:
            print("✅ Curso encontrado!")
            print(f"📋 Dados do curso:")
            print(f"  - ID: {curso['id']}")
            print(f"  - Título: {curso['titulo']}")
            print(f"  - Descrição: {curso['descricao'][:100]}...")
            print(f"  - Nível: {curso['nivel']}")
            print(f"  - Ativo: {curso['ativo']}")
            print(f"  - Instrutor ID: {curso['instrutor_id']}")
            print(f"  - Criado em: {curso['criado_em']}")
            print(f"  - Duração total: {curso.get('duracao_total', 'N/A')} minutos")
            print(f"  - Imagem URL: {curso.get('imagem_url', 'N/A')}")
        else:
            print("❌ Curso não encontrado!")
            
            # Verificar se o curso existe (sem filtro de instrutor)
            cursor.execute("SELECT * FROM rarcursos.cursos WHERE id = %s", (curso_id,))
            curso_sem_filtro = cursor.fetchone()
            
            if curso_sem_filtro:
                print(f"⚠️ Curso existe mas com instrutor diferente:")
                print(f"  - Instrutor real: {curso_sem_filtro['instrutor_id']}")
                print(f"  - Instrutor buscado: {instrutor_id}")
            else:
                print("❌ Curso não existe no banco de dados")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro durante teste: {e}")
        conn.close()

if __name__ == "__main__":
    testar_buscar_curso()