'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Lock, Users, UserPlus, UserMinus, Eye, Search, ArrowLeft, Shield } from 'lucide-react';
import { GerenciarPermissoesAula } from '@/components/dashboard-instrutor/GerenciarPermissoesAula';

interface Aula {
  id: string;
  titulo: string;
  descricao?: string;
  privada: boolean;
  curso_id: string;
  curso_titulo?: string;
}

export default function GerenciarPermissoesAulaPage() {
  const params = useParams();
  const router = useRouter();
  const aulaId = params.id as string;
  
  const [aula, setAula] = useState<Aula | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarAula();
  }, [aulaId]);

  const carregarAula = async () => {
    try {
      const response = await fetch(`/api/aulas/${aulaId}`);
      if (response.ok) {
        const data = await response.json();
        setAula(data);
      }
    } catch (error) {
      console.error('Erro ao carregar aula:', error);
    } finally {
      setCarregando(false);
    }
  };

  const voltarParaCurso = () => {
    if (aula?.curso_id) {
      router.push(`/dashboard/cursos/${aula.curso_id}/aulas`);
    } else {
      router.back();
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando informações da aula...</p>
        </div>
      </div>
    );
  }

  if (!aula) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Aula não encontrada</h1>
          <p className="text-gray-600 mb-6">A aula solicitada não foi encontrada ou você não tem permissão para acessá-la.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!aula.privada) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Eye className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Aula Pública</h1>
          <p className="text-gray-600 mb-6">
            Esta aula é pública e todos os alunos matriculados no curso têm acesso automaticamente.
          </p>
          <button
            onClick={voltarParaCurso}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Voltar ao Curso
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={voltarParaCurso}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Shield className="w-8 h-8 text-purple-600 mr-3" />
                    Gerenciar Permissões
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <Lock className="w-4 h-4 text-purple-600" />
                    <span className="text-gray-600">{aula.titulo}</span>
                    {aula.curso_titulo && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">{aula.curso_titulo}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            {/* Informações da Aula Privada */}
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="text-sm font-medium text-purple-800 mb-2 flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                Aula Privada - Controle de Acesso
              </h3>
              <div className="text-sm text-purple-700 space-y-1">
                <p><strong>Acesso automático:</strong> Alunos "Convidados do Curso" têm acesso total</p>
                <p><strong>Acesso específico:</strong> Você pode conceder permissões individuais para alunos matriculados</p>
                <p><strong>Aulas públicas:</strong> Todos os alunos matriculados têm acesso automaticamente</p>
              </div>
              {aula.descricao && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <p className="text-sm text-purple-700">
                    <strong>Descrição:</strong> {aula.descricao}
                  </p>
                </div>
              )}
            </div>

            {/* Componente de Gerenciamento de Permissões */}
            <GerenciarPermissoesAula aulaId={aulaId} />
          </div>
        </div>
      </div>
    </div>
  );
}