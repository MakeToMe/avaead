'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Mail } from 'lucide-react';

interface PageProps {
  params: {
    token: string;
  };
}

interface ResultadoAceitacao {
  sucesso: boolean;
  curso_id?: string;
  erro?: string;
  curso_titulo?: string;
}

export default function AceitarConvitePage({ params }: PageProps) {
  const [resultado, setResultado] = useState<ResultadoAceitacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    aceitarConvite();
  }, [params.token]);

  const aceitarConvite = async () => {
    try {
      const response = await fetch('/api/convites/aceitar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: params.token })
      });

      const data = await response.json();
      setResultado(data);
    } catch (error) {
      setResultado({
        sucesso: false,
        erro: 'Erro de conexão. Tente novamente.'
      });
    } finally {
      setCarregando(false);
    }
  };

  const irParaCurso = () => {
    if (resultado?.curso_id) {
      router.push(`/cursos/${resultado.curso_id}`);
    }
  };

  const irParaLogin = () => {
    router.push('/login');
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Processando convite...
            </h1>
            <p className="text-gray-600">
              Aguarde enquanto validamos seu convite.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!resultado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Erro inesperado
            </h1>
            <p className="text-gray-600 mb-6">
              Não foi possível processar o convite.
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (resultado.sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Convite aceito com sucesso! 🎉
            </h1>
            <p className="text-gray-600 mb-6">
              Você agora tem acesso ao curso. Faça login para começar a estudar.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={irParaCurso}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Acessar curso
              </button>
              
              <button
                onClick={irParaLogin}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Fazer login
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Mail className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">
                  Primeira vez aqui?
                </span>
              </div>
              <p className="text-xs text-blue-700">
                Se você ainda não tem uma conta, será necessário criar uma senha no primeiro login.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Caso de erro
  const getErrorMessage = (erro: string) => {
    switch (erro) {
      case 'Token inválido':
        return {
          titulo: 'Link inválido',
          descricao: 'Este link de convite não é válido. Verifique se copiou corretamente.',
          icon: XCircle,
          color: 'text-red-500'
        };
      case 'Convite não encontrado':
        return {
          titulo: 'Convite não encontrado',
          descricao: 'Este convite não existe ou já foi removido.',
          icon: XCircle,
          color: 'text-red-500'
        };
      case 'Convite já foi aceito anteriormente':
        return {
          titulo: 'Convite já aceito',
          descricao: 'Este convite já foi aceito anteriormente. Faça login para acessar o curso.',
          icon: CheckCircle,
          color: 'text-yellow-500'
        };
      case 'Convite expirado':
        return {
          titulo: 'Convite expirado',
          descricao: 'Este convite expirou. Entre em contato com o instrutor para receber um novo convite.',
          icon: Clock,
          color: 'text-orange-500'
        };
      default:
        return {
          titulo: 'Erro ao processar convite',
          descricao: erro || 'Ocorreu um erro inesperado. Tente novamente.',
          icon: XCircle,
          color: 'text-red-500'
        };
    }
  };

  const errorInfo = getErrorMessage(resultado.erro || '');
  const IconComponent = errorInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
        <div className="text-center">
          <IconComponent className={`w-12 h-12 ${errorInfo.color} mx-auto mb-4`} />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {errorInfo.titulo}
          </h1>
          <p className="text-gray-600 mb-6">
            {errorInfo.descricao}
          </p>
          
          <div className="space-y-3">
            {resultado.erro === 'Convite já foi aceito anteriormente' && (
              <button
                onClick={irParaLogin}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Fazer login
              </button>
            )}
            
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}