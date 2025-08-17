import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Configuração do banco PostgreSQL
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  
  try {
    const { id: aulaId } = await params;
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuario_id');

    console.log(`🔍 Verificando acesso - Aula: ${aulaId}, Usuário: ${usuarioId}`);

    if (!usuarioId) {
      return NextResponse.json(
        { 
          permitido: false,
          motivo: 'Usuário não identificado',
          usuario_id: usuarioId,
          aula_id: aulaId
        },
        { status: 400 }
      );
    }

    // 1. Buscar dados da aula
    const aulaQuery = `
      SELECT 
        a.id,
        a.titulo,
        a.privada,
        a.ao_vivo,
        a.modulo_id,
        m.curso_id,
        c.titulo as curso_titulo,
        c.instrutor_id
      FROM rarcursos.aulas a
      JOIN rarcursos.modulos m ON a.modulo_id = m.id
      JOIN rarcursos.cursos c ON m.curso_id = c.id
      WHERE a.id = $1
    `;

    const aulaResult = await client.query(aulaQuery, [aulaId]);
    
    if (aulaResult.rows.length === 0) {
      console.log(`❌ Aula não encontrada: ${aulaId}`);
      return NextResponse.json({
        permitido: false,
        motivo: 'Aula não encontrada',
        usuario_id: usuarioId,
        aula_id: aulaId
      }, { status: 404 });
    }

    const aula = aulaResult.rows[0];
    console.log(`📚 Aula encontrada: ${aula.titulo} (Privada: ${aula.privada}, Ao Vivo: ${aula.ao_vivo})`);

    // 2. Verificar se é aula ao vivo - precisa de permissão específica
    if (aula.ao_vivo) {
      console.log(`🔴 Aula ao vivo detectada - verificando permissões específicas`);
      
      // Para aulas ao vivo, verificar permissões específicas primeiro
      const permissaoAoVivoQuery = `
        SELECT tipo_permissao 
        FROM rarcursos.aula_permissoes 
        WHERE aluno_id = $1 AND aula_id = $2 AND tipo_permissao IN ('acesso_ao_vivo', 'acesso_completo')
      `;
      
      const permissaoAoVivoResult = await client.query(permissaoAoVivoQuery, [usuarioId, aulaId]);
      
      if (permissaoAoVivoResult.rows.length === 0) {
        console.log(`❌ Acesso negado: Sem permissão para aula ao vivo`);
        return NextResponse.json({
          permitido: false,
          motivo: 'Esta é uma aula ao vivo. Você precisa de permissão específica do instrutor para acessá-la.',
          usuario_id: usuarioId,
          aula_id: aulaId
        });
      }
      
      console.log(`✅ Acesso liberado: Permissão para aula ao vivo encontrada`);
      return NextResponse.json({
        permitido: true,
        motivo: 'Você tem permissão para acessar esta aula ao vivo',
        tipo_acesso: 'aula_ao_vivo',
        usuario_id: usuarioId,
        aula_id: aulaId
      });
    }

    // 3. Se a aula é pública, sempre permitir
    if (!aula.privada) {
      console.log(`✅ Acesso liberado: Aula pública`);
      return NextResponse.json({
        permitido: true,
        motivo: 'Aula pública - acesso liberado',
        tipo_acesso: 'aula_publica',
        usuario_id: usuarioId,
        aula_id: aulaId
      });
    }

    // 4. Verificar se é o instrutor do curso
    if (aula.instrutor_id === usuarioId) {
      console.log(`✅ Acesso liberado: Usuário é o instrutor`);
      return NextResponse.json({
        permitido: true,
        motivo: 'Você é o instrutor deste curso',
        tipo_acesso: 'instrutor',
        usuario_id: usuarioId,
        aula_id: aulaId
      });
    }

    // 5. Verificar matrícula no curso
    const matriculaQuery = `
      SELECT tipo_acesso, status 
      FROM rarcursos.matriculas 
      WHERE aluno_id = $1 AND curso_id = $2 AND status = 'ativa'
    `;
    
    const matriculaResult = await client.query(matriculaQuery, [usuarioId, aula.curso_id]);
    
    if (matriculaResult.rows.length === 0) {
      console.log(`❌ Usuário não matriculado no curso`);
      return NextResponse.json({
        permitido: false,
        motivo: 'Você não está matriculado neste curso ou sua matrícula não está ativa',
        usuario_id: usuarioId,
        aula_id: aulaId
      });
    }

    const matricula = matriculaResult.rows[0];
    console.log(`📝 Matrícula encontrada: ${matricula.tipo_acesso}`);

    // 6. Verificar se tem acesso total (convidado_curso)
    if (matricula.tipo_acesso === 'convidado_curso') {
      console.log(`✅ Acesso liberado: Convidado do curso`);
      return NextResponse.json({
        permitido: true,
        motivo: 'Você tem acesso total a este curso',
        tipo_acesso: 'convidado_curso',
        usuario_id: usuarioId,
        aula_id: aulaId
      });
    }

    // 7. Verificar permissão específica para esta aula privada
    const permissaoQuery = `
      SELECT tipo_permissao 
      FROM rarcursos.aula_permissoes 
      WHERE aluno_id = $1 AND aula_id = $2 AND tipo_permissao IN ('acesso_privada', 'acesso_completo')
    `;
    
    const permissaoResult = await client.query(permissaoQuery, [usuarioId, aulaId]);
    
    if (permissaoResult.rows.length > 0) {
      const tipoPermissao = permissaoResult.rows[0].tipo_permissao;
      console.log(`✅ Acesso liberado: Permissão específica (${tipoPermissao})`);
      return NextResponse.json({
        permitido: true,
        motivo: 'Você tem permissão específica para esta aula',
        tipo_acesso: 'convite_especifico',
        tipo_permissao: tipoPermissao,
        usuario_id: usuarioId,
        aula_id: aulaId
      });
    }

    // 8. Sem permissão para aula privada
    console.log(`❌ Acesso negado: Sem permissão para aula privada`);
    return NextResponse.json({
      permitido: false,
      motivo: 'Esta é uma aula privada. Entre em contato com o instrutor para solicitar acesso.',
      usuario_id: usuarioId,
      aula_id: aulaId
    });

  } catch (error) {
    console.error('❌ Erro na API de verificação de acesso:', error);
    return NextResponse.json(
      { 
        permitido: false,
        motivo: 'Erro interno do servidor. Tente novamente mais tarde.',
        usuario_id: request.nextUrl.searchParams.get('usuario_id'),
        aula_id: (await params).id
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}