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

    // Buscar informações do curso com dados do instrutor
    const { data: curso, error } = await supabase
      .from('cursos')
      .select(`
        id,
        titulo,
        descricao,
        ativo,
        criado_em,
        instrutor_id,
        users!cursos_instrutor_id_fkey (
          nome,
          email
        )
      `)
      .eq('id', cursoId)
      .eq('ativo', true)
      .single();

    if (error || !curso) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      );
    }

    // Buscar estatísticas básicas do curso
    const { data: estatisticas } = await supabase
      .from('aulas')
      .select('id, privada, ativo')
      .eq('curso_id', cursoId)
      .eq('ativo', true);

    const totalAulas = estatisticas?.length || 0;
    const aulasPublicas = estatisticas?.filter(a => !a.privada).length || 0;
    const aulasPrivadas = estatisticas?.filter(a => a.privada).length || 0;

    // Buscar total de alunos matriculados
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select('id')
      .eq('curso_id', cursoId)
      .eq('status', 'ativa');

    const totalAlunos = matriculas?.length || 0;

    const instrutor = curso.users as any;

    return NextResponse.json({
      id: curso.id,
      titulo: curso.titulo,
      descricao: curso.descricao,
      ativo: curso.ativo,
      criado_em: curso.criado_em,
      instrutor_id: curso.instrutor_id,
      instrutor_nome: instrutor?.nome,
      instrutor_email: instrutor?.email,
      estatisticas: {
        total_aulas: totalAulas,
        aulas_publicas: aulasPublicas,
        aulas_privadas: aulasPrivadas,
        total_alunos: totalAlunos
      }
    });

  } catch (error) {
    console.error('Erro na API de curso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}