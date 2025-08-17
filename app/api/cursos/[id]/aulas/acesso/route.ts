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
    const alunoId = searchParams.get('aluno_id');

    if (!alunoId) {
      return NextResponse.json(
        { error: 'aluno_id é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o aluno está matriculado no curso
    const { data: matricula, error: matriculaError } = await supabase
      .from('matriculas')
      .select('id, tipo_acesso, data_matricula')
      .eq('curso_id', cursoId)
      .eq('aluno_id', alunoId)
      .eq('status', 'ativa')
      .single();

    if (matriculaError || !matricula) {
      return NextResponse.json(
        { error: 'Aluno não está matriculado neste curso' },
        { status: 403 }
      );
    }

    // Buscar todas as aulas do curso
    const { data: aulas, error: aulasError } = await supabase
      .from('aulas')
      .select('id, titulo, descricao, duracao, privada, media_url, ativo')
      .eq('curso_id', cursoId)
      .eq('ativo', true)
      .order('titulo');

    if (aulasError) {
      console.error('Erro ao buscar aulas:', aulasError);
      return NextResponse.json(
        { error: 'Erro ao buscar aulas do curso' },
        { status: 500 }
      );
    }

    // Buscar permissões específicas do aluno
    const { data: permissoes } = await supabase
      .from('aula_permissoes')
      .select('aula_id, tipo_permissao, criado_em')
      .eq('aluno_id', alunoId)
      .in('aula_id', aulas?.map(a => a.id) || []);

    const permissoesMap = new Map(
      permissoes?.map(p => [p.aula_id, p]) || []
    );

    // Processar cada aula para determinar acesso
    const aulasComAcesso = (aulas || []).map(aula => {
      let pode_assistir = false;
      let tipo_acesso: string | undefined;
      let motivo: string | undefined;

      // Regra 1: Aula pública - todos os matriculados têm acesso
      if (!aula.privada) {
        pode_assistir = true;
        tipo_acesso = 'aula_publica';
      }
      // Regra 2: Aula privada + convidado do curso - acesso total
      else if (matricula.tipo_acesso === 'convidado_curso') {
        pode_assistir = true;
        tipo_acesso = 'convidado_curso';
      }
      // Regra 3: Aula privada + permissão específica
      else if (permissoesMap.has(aula.id)) {
        pode_assistir = true;
        tipo_acesso = 'convite_especifico';
      }
      // Regra 4: Aula privada sem permissão
      else {
        pode_assistir = false;
        motivo = 'Esta aula requer convite específico do instrutor';
      }

      return {
        id: aula.id,
        titulo: aula.titulo,
        descricao: aula.descricao,
        duracao: aula.duracao,
        privada: aula.privada,
        media_url: aula.media_url,
        pode_assistir,
        tipo_acesso,
        motivo
      };
    });

    // Calcular estatísticas de acesso
    const totalAulas = aulasComAcesso.length;
    const aulasAcessiveis = aulasComAcesso.filter(a => a.pode_assistir).length;
    const aulasPrivadas = aulasComAcesso.filter(a => a.privada).length;
    const aulasPrivadasComAcesso = aulasComAcesso.filter(a => a.privada && a.pode_assistir).length;
    const aulasPrivadasPorConvite = aulasComAcesso.filter(a => a.tipo_acesso === 'convite_especifico').length;

    // Determinar tipo de acesso geral
    let tipoAcessoGeral: any = {
      tipo: 'matriculado',
      descricao: 'Matriculado - Acesso a aulas públicas',
      total_aulas: totalAulas,
      aulas_acessiveis: aulasAcessiveis,
      aulas_privadas_com_acesso: aulasPrivadasComAcesso
    };

    if (matricula.tipo_acesso === 'convidado_curso') {
      tipoAcessoGeral = {
        tipo: 'convidado_curso',
        descricao: 'Convidado do Curso - Acesso total',
        total_aulas: totalAulas,
        aulas_acessiveis: aulasAcessiveis,
        aulas_privadas_com_acesso: aulasPrivadasComAcesso
      };
    } else if (aulasPrivadasPorConvite > 0) {
      tipoAcessoGeral = {
        tipo: 'misto',
        descricao: 'Acesso Misto - Matriculado + Convites específicos',
        total_aulas: totalAulas,
        aulas_acessiveis: aulasAcessiveis,
        aulas_privadas_com_acesso: aulasPrivadasComAcesso
      };
    }

    return NextResponse.json({
      aulas: aulasComAcesso,
      tipo_acesso: tipoAcessoGeral,
      matricula: {
        id: matricula.id,
        tipo_acesso: matricula.tipo_acesso,
        data_matricula: matricula.data_matricula
      },
      estatisticas: {
        total_aulas: totalAulas,
        aulas_acessiveis: aulasAcessiveis,
        aulas_publicas: totalAulas - aulasPrivadas,
        aulas_privadas: aulasPrivadas,
        aulas_privadas_com_acesso: aulasPrivadasComAcesso,
        aulas_privadas_bloqueadas: aulasPrivadas - aulasPrivadasComAcesso,
        convites_especificos: aulasPrivadasPorConvite
      }
    });

  } catch (error) {
    console.error('Erro na API de acesso às aulas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}