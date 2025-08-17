'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, Lock, AlertTriangle, ArrowLeft, Mail, HelpCircle } from 'lucide-react';

function AcessoNegadoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [motivo, setMotivo] = useState('');
  const [aulaId, setAulaId] = useState('');

  useEffect(() => {
    setMotivo(searchParams.get('motivo') || 'Acesso negado');
    setAulaId(searchParams.get('aula_id') || '');
  }, [searchParams]);

  const getMensagemEAcoes = (motivo: string) => {
    if (motivo.includes('não está matriculado')) {
      return {
        titulo: 'Matrícula Necessária',
        descricao: 'Você precisa estar matriculado neste curso para acessar esta aula.',
        icon: Shield,
        cor: 'blue',
        acoes: [
          {
            texto: 'Ver Cursos Disponíveis',
            acao: () => router.push('/cursos'),
            tipo: 'primary'
          }
        ]
      };
    }

    if (motivo.includes('convite específico')) {
      return {
        titulo: 'Aula Privada',
        descricao: 'Esta aula requer um convite específico do instrutor para ser acessada.',
        icon: Lock,
        cor: 'purple',
        acoes: [
          {
            texto: 'Entrar em Contato com Instrutor',
            acao: () => alert('Funcionalidade em desenvolvimento'),
            tipo: 'primary'
          },
          {
            texto: 'Ver Outras Aulas',
            acao: () => router.back(),
            tipo: 'secondary'
          }
        ]
      };
    }

    if (motivo.includes('não está disponível') || motivo.includes('inativa')) {
      return {
        titulo: 'Aula Indisponível',
        descricao: 'Esta aula não está disponível no momento.',
        icon: AlertTriangle,
        cor: 'orange',
        acoes: [
          {
            texto: 'Voltar ao Curso',
            acao: () => router.back(),
            tipo: 'primary'
          }
        ]
      };
    }

    if (motivo.includes('não encontrada')) {
      return {
        titulo: 'Aula Não Encontrada',
        descricao: 'A aula solicitada não foi encontrada ou foi removida.',
        icon: HelpCircle,
        cor: 'gray',
        acoes: [
          {
            texto: 'Voltar ao Curso',
            acao: () => router.back(),
            tipo: 'primary'
          }
        ]
      };
    }

    // Caso genérico
    return {
      titulo: 'Acesso Restrito',
      descricao: motivo || 'Você não tem permissão para acessar este conteúdo.',
      icon: Shield,
      cor: 'red',
      acoes: [
        {
          texto: 'Voltar',
          acao: () => router.back(),
          tipo: 'primary'
        }
      ]
    };
  };

  const config = getMensagemEAcoes(motivo);
  const IconeComponent = config.icon;

  const getCoresClasses = (cor: string) => {
    const cores = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-500',
        titulo: 'text-blue-900',
        texto: 'text-blue-800',
        botaoPrimary: 'bg-blue-500 hover:bg-blue-600 text-white',
        botaoSecondary: 'bg-blue-100 hover:bg-blue-200 text-blue-700'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'text-purple-500',
        titulo: 'text-purple-900',
        texto: 'text-purple-800',
        botaoPrimary: 'bg-purple-500 hover:bg-purple-600 text-white',
        botaoSecondary: 'bg-purple-100 hover:bg-purple-200 text-purple-700'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: 'text-orange-500',
        titulo: 'text-orange-900',
        texto: 'text-orange-800',
        botaoPrimary: 'bg-orange-500 hover:bg-orange-600 text-white',
        botaoSecondary: 'bg-orange-100 hover:bg-orange-200 text-orange-700'
      },
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-500',
        titulo: 'text-red-900',
        texto: 'text-red-800',
        botaoPrimary: 'bg-red-500 hover:bg-red-600 text-white',
        botaoSecondary: 'bg-red-100 hover:bg-red-200 text-red-700'
      },
      gray: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        icon: 'text-gray-500',
        titulo: 'text-gray-900',
        texto: 'text-gray-800',
        botaoPrimary: 'bg-gray-500 hover:bg-gray-600 text-white',
        botaoSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }
    };

    return cores[cor as keyof typeof cores] || cores.red;
  };

  const classes = getCoresClasses(config.cor);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Card Principal */}
        <div className={`${classes.bg} ${classes.border} border rounded-lg p-8 text-center`}>
          <IconeComponent className={`w-16 h-16 ${classes.icon} mx-auto mb-4`} />
          
          <h1 className={`text-xl font-bold ${classes.titulo} mb-2`}>
            {config.titulo}
          </h1>
          
          <p className={`${classes.texto} mb-6`}>
            {config.descricao}
          </p>

          {/* Botões de Ação */}
          <div className="space-y-3">
            {config.acoes.map((acao, index) => (
              <button
                key={index}
                onClick={acao.acao}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                  acao.tipo === 'primary' ? classes.botaoPrimary : classes.botaoSecondary
                }`}
              >
                {acao.texto}
              </button>
            ))}
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            💡 Sobre os tipos de acesso:
          </h3>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-2 text-blue-500" />
              <span><strong>Matriculado:</strong> Acesso a aulas públicas</span>
            </div>
            
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-2 text-purple-500" />
              <span><strong>Aula Privada:</strong> Requer convite do instrutor</span>
            </div>
            
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-2 text-green-500" />
              <span><strong>Convite Específico:</strong> Acesso concedido individualmente</span>
            </div>
          </div>
        </div>

        {/* Botão Voltar */}
        <div className="mt-4 text-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar à página anterior
          </button>
        </div>

        {/* Debug Info (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
            <strong>Debug:</strong><br />
            Motivo: {motivo}<br />
            Aula ID: {aulaId}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcessoNegadoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <AcessoNegadoContent />
    </Suspense>
  );
}