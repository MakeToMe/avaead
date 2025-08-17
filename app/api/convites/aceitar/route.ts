import { NextRequest, NextResponse } from 'next/server';
import { conviteService } from '@/lib/services/convite-service';
import { z } from 'zod';

const AceitarConviteSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar dados de entrada
    const { token } = AceitarConviteSchema.parse(body);

    // Processar aceitação do convite
    const resultado = await conviteService.aceitarConvite(token);

    if (resultado.sucesso) {
      return NextResponse.json({
        sucesso: true,
        curso_id: resultado.curso_id,
        message: 'Convite aceito com sucesso'
      });
    } else {
      return NextResponse.json({
        sucesso: false,
        erro: resultado.erro
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Erro ao aceitar convite:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        sucesso: false,
        erro: 'Dados inválidos',
        detalhes: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      sucesso: false,
      erro: 'Erro interno do servidor'
    }, { status: 500 });
  }
}