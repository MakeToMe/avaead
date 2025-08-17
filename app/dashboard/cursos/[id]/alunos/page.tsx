'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Users, UserPlus, Mail, Crown, User, Search, Filter } from 'lucide-react';
import { GerenciarAlunos } from '@/components/dashboard-instrutor/GerenciarAlunos';
import { ModalConviteCursoCompleto } from '@/components/dashboard-instrutor/ModalConviteCursoCompleto';
import { ModalConviteAulasEspecificas } from '@/components/dashboard-instrutor/ModalConviteAulasEspecificas';

interface Curso {
  id: string;
  titulo: string;
  descricao?: string;
  instrutor_id: string;
}

export default function GerenciarAlunosCursoPage() {
  const params = useParams();
  const cursoId = params.id as string;
  
  const [curso, setCurso] = useState<Curso | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modalCursoCompleto, setModalCursoCompleto] = useState(false);
  const [modalAulasEspecificas, setModalAulasEspecificas] = useState(false);

  useEffect(() => {
    carregarCurso();
  }, [cursoId]);

  const carregarCurso = async () => {
    try {
      const response = await fetch(`/api/cursos/${cursoId}`);
      if (response.ok) {
        const data = await response.json();
        setCurso(data);
      }
    } catch (error) {
      console.error('Erro ao carregar curso:', error);
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando informações do curso...</p>
        </div>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Curso não encontrado</h1>
          <p className="text-gray-600">O curso solicitado não foi encontrado ou você não tem permissão para acessá-lo.</p>
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
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Users className="w-8 h-8 text-blue-600 mr-3" />
                  Gerenciar Alunos
                </h1>
                <p className="text-gray-600 mt-1">
                  {curso.titulo}
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setModalAulasEspecificas(true)}
                  className="inline-flex items-center px-4 py-2 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Convidar para Aulas
                </button>
                
                <button
                  onClick={() => setModalCursoCompleto(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Convidar para Curso Completo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            {/* Informações do Sistema */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                💡 Como funciona o sistema de convites
              </h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Matriculados:</strong> Acesso apenas a aulas públicas</p>
                <p><strong>Convidados do Curso:</strong> Acesso total (todas as aulas públicas e privadas)</p>
                <p><strong>Convites Específicos:</strong> Acesso apenas às aulas selecionadas pelo instrutor</p>
              </div>
            </div>

            {/* Componente de Gerenciamento */}
            <GerenciarAlunos cursoId={cursoId} />
          </div>
        </div>
      </div>

      {/* Modais */}
      {modalCursoCompleto && (
        <ModalConviteCursoCompleto
          cursoId={cursoId}
          cursoTitulo={curso.titulo}
          onClose={() => setModalCursoCompleto(false)}
          onSuccess={() => {
            setModalCursoCompleto(false);
            // Recarregar lista de alunos
            window.location.reload();
          }}
        />
      )}

      {modalAulasEspecificas && (
        <ModalConviteAulasEspecificas
          cursoId={cursoId}
          cursoTitulo={curso.titulo}
          onClose={() => setModalAulasEspecificas(false)}
          onSuccess={() => {
            setModalAulasEspecificas(false);
            // Recarregar lista de alunos
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}