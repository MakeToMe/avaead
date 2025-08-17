import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const aulaId = params.id;

    // Buscar dados da aula com informações do curso
    const { data: aula, error } = await supabase
      .from('aulas')
      .select(`
        id,
        titulo,
        descricao,
        privada,
        ativo,
        curso_id,
        cursos!aulas_curso_id_fkey (
          titulo
        )
      `)
      .eq('id', aulaId)
      .single();

    if (error || !aula) {
      return NextResponse.json(
        { error: 'Aula não encontrada' },
        { status: 404 }
      );
    }

    // TODO: Verificar se o usuário atual tem permissão para acessar esta aula
    // const userId = await getCurrentUserId(request);
    // const temPermissao = await verificarPermissaoAula(aulaId, userId);
    // if (!temPermissao) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    // }

    const curso = aula.cursos as any;

    return NextResponse.json({
      id: aula.id,
      titulo: aula.titulo,
      descricao: aula.descricao,
      privada: aula.privada,
      ativo: aula.ativo,
      curso_id: aula.curso_id,
      curso_titulo: curso?.titulo
    });

  } catch (error) {
    console.error('Erro na API de aula:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}