import { NextRequest, NextResponse } from 'next/server';
import { ConviteService } from '@/lib/services/convite-service';
import { SistemaAuditoria } from '@/lib/auditoria/sistema-auditoria';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, cursoId, tipoConvite, aulaIds, mensagem, enviadoPor } = body;

    // Validações básicas
    if (!email || !cursoId || !tipoConvite || !enviadoPor) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    // Validar tipo de convite
    if (!['curso_completo', 'aulas_especificas'].includes(tipoConvite)) {
      return NextResponse.json(
        { error: 'Tipo de convite inválido' },
        { status: 400 }
      );
    }

    // Se for aulas específicas, validar aulaIds
    if (tipoConvite === 'aulas_especificas' && (!aulaIds || aulaIds.length === 0)) {
      return NextResponse.json(
        { error: 'Aulas devem ser especificadas para este tipo de convite' },
        { status: 400 }
      );
    }

    // Criar convite
    const convite = await ConviteService.criarConvite({
      email,
      cursoId,
      tipoConvite,
      aulaIds: tipoConvite === 'aulas_especificas' ? aulaIds : null,
      mensagem,
      enviadoPor
    });

    // Log de auditoria
    await SistemaAuditoria.registrarEvento({
      tipoEvento: 'convite_enviado',
      severidade: 'info',
      usuarioId: enviadoPor,
      recursoTipo: 'convite',
      recursoId: convite.id,
      detalhes: {
        email,
        cursoId,
        tipoConvite,
        aulaIds: aulaIds || null,
        temMensagem: !!mensagem
      },
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent')
    });

    return NextResponse.json({
      success: true,
      convite: {
        id: convite.id,
        token: convite.token,
        email: convite.email,
        tipoConvite: convite.tipoConvite,
        criadoEm: convite.criadoEm,
        expiraEm: convite.expiraEm
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar convite:', error);

    // Log de erro
    await SistemaAuditoria.registrarEvento({
      tipoEvento: 'erro_criar_convite',
      severidade: 'error',
      recursoTipo: 'convite',
      detalhes: {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      },
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent')
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursoId = searchParams.get('cursoId');
    const status = searchParams.get('status'); // 'pendente', 'aceito', 'expirado'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!cursoId) {
      return NextResponse.json(
        { error: 'ID do curso é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar convites
    const convites = await ConviteService.listarConvites({
      cursoId,
      status,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      convites,
      pagination: {
        limit,
        offset,
        total: convites.length
      }
    });

  } catch (error) {
    console.error('Erro ao listar convites:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conviteId = searchParams.get('id');
    const usuarioId = searchParams.get('usuarioId');

    if (!conviteId || !usuarioId) {
      return NextResponse.json(
        { error: 'ID do convite e usuário são obrigatórios' },
        { status: 400 }
      );
    }

    // Cancelar convite
    const resultado = await ConviteService.cancelarConvite(conviteId, usuarioId);

    if (!resultado.success) {
      return NextResponse.json(
        { error: resultado.error },
        { status: 400 }
      );
    }

    // Log de auditoria
    await SistemaAuditoria.registrarEvento({
      tipoEvento: 'convite_cancelado',
      severidade: 'info',
      usuarioId,
      recursoTipo: 'convite',
      recursoId: conviteId,
      detalhes: {
        motivo: 'cancelado_pelo_instrutor'
      },
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent')
    });

    return NextResponse.json({
      success: true,
      message: 'Convite cancelado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao cancelar convite:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}