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
    const cursoId = params.id;
    const { searchParams } = new URL(request.url);
    const apenasPrivadas = searchParams.get('apenas_privadas') === 'true';

    // Construir query baseada nos filtros
    let query = supabase
      .from('aulas')
      .select('id, titulo, descricao, duracao, privada, ativo')
      .eq('curso_id', cursoId)
      .eq('ativo', true)
      .order('titulo');

    // Filtrar apenas aulas privadas se solicitado
    if (apenasPrivadas) {
      query = query.eq('privada', true);
    }

    const { data: aulas, error } = await query;

    if (error) {
      console.error('Erro ao buscar aulas:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar aulas do curso' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      aulas: aulas || [],
      total: aulas?.length || 0,
      filtros: {
        apenas_privadas: apenasPrivadas
      }
    });

  } catch (error) {
    console.error('Erro na API de aulas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}