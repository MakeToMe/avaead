#!/usr/bin/env python3
"""
Script para debugar a estrutura da tabela aulas e verificar os dados
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import json

def main():
    print("🔍 DEBUGANDO ESTRUTURA DA TABELA AULAS")
    print("=" * 60)
    
    # Configuração da conexão
    conn_params = {
        'host': 'studio.rardevops.com',
        'port': 4202,
        'database': 'postgres',
        'user': 'supabase_admin',
        'password': 'Aha517_Rar-PGRS_U2a59w'
    }
    
    try:
        # Conectar ao banco
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("✅ Conectado ao banco de dados")
        
        # 1. Verificar estrutura completa da tabela aulas
        print("\n1️⃣ Estrutura completa da tabela aulas:")
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_schema = 'rarcursos' 
            AND table_name = 'aulas'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']}) (default: {col['column_default']})")
        
        # 2. Verificar se existe campo tipo_acesso
        print(f"\n2️⃣ Verificando campo tipo_acesso:")
        tipo_acesso_exists = any(col['column_name'] == 'tipo_acesso' for col in columns)
        print(f"  Campo tipo_acesso existe: {tipo_acesso_exists}")
        
        # 3. Buscar uma aula específica para ver os dados
        print(f"\n3️⃣ Buscando aula específica (5d9c24b5-d08a-4251-9416-4003bee1f6e5):")
        cursor.execute("""
            SELECT 
                a.id,
                a.titulo,
                a.privada,
                a.ao_vivo,
                m.curso_id
            FROM rarcursos.aulas a
            JOIN rarcursos.modulos m ON a.modulo_id = m.id
            WHERE a.id = %s
        """, ('5d9c24b5-d08a-4251-9416-4003bee1f6e5',))
        
        aula = cursor.fetchone()
        if aula:
            print(f"  ✅ Aula encontrada:")
            print(f"    - ID: {aula['id']}")
            print(f"    - Título: {aula['titulo']}")
            print(f"    - Privada: {aula['privada']}")
            print(f"    - Ao Vivo: {aula['ao_vivo']}")
            print(f"    - Curso ID: {aula['curso_id']}")
        else:
            print(f"  ❌ Aula não encontrada")
        
        # 4. Verificar se existem alunos matriculados no curso
        if aula:
            print(f"\n4️⃣ Verificando alunos matriculados no curso {aula['curso_id']}:")
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_alunos,
                    COUNT(CASE WHEN tipo_acesso = 'convidado_curso' THEN 1 END) as convidados_curso,
                    COUNT(CASE WHEN tipo_acesso != 'convidado_curso' THEN 1 END) as outros_tipos
                FROM rarcursos.matriculas 
                WHERE curso_id = %s AND status = 'ativa'
            """, (aula['curso_id'],))
            
            stats = cursor.fetchone()
            print(f"  - Total de alunos: {stats['total_alunos']}")
            print(f"  - Convidados do curso: {stats['convidados_curso']}")
            print(f"  - Outros tipos: {stats['outros_tipos']}")
            
            # 5. Verificar permissões específicas para esta aula
            print(f"\n5️⃣ Verificando permissões específicas para a aula:")
            cursor.execute("""
                SELECT COUNT(*) as total_permissoes
                FROM rarcursos.aula_permissoes 
                WHERE aula_id = %s
            """, (aula['id'],))
            
            permissoes = cursor.fetchone()
            print(f"  - Permissões específicas: {permissoes['total_permissoes']}")
        
        # 6. Verificar estrutura da tabela matriculas
        print(f"\n6️⃣ Verificando tipos de acesso na tabela matriculas:")
        cursor.execute("""
            SELECT 
                tipo_acesso,
                COUNT(*) as quantidade
            FROM rarcursos.matriculas 
            WHERE status = 'ativa'
            GROUP BY tipo_acesso
            ORDER BY quantidade DESC
        """)
        
        tipos_acesso = cursor.fetchall()
        for tipo in tipos_acesso:
            print(f"  - {tipo['tipo_acesso']}: {tipo['quantidade']} alunos")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    finally:
        if 'conn' in locals():
            conn.close()
            print(f"\n🔌 Conexão fechada")

if __name__ == "__main__":
    main()