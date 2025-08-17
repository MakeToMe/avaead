'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BookOpen, Users, Clock, AlertCircle } from 'lucide-react';
import { ListaAulas } from '@/components/curso/ListaAulas';
import { ResumoAcessoAluno } from '@/components/curso/ResumoAcessoAluno';

interface Curso {
  id: string;
  titulo: string;
  descricao?: string;
  instrutor_nome?: string;
  total_aulas?: number;
}

interface EstatisticasAcesso {
  total_aulas: number;
  aulas_acessiveis: number;
  aulas_publicas: number;
  aulas_privadas: number;
  aulas_privadas_com_acesso: number;
  aulas_privadas_bloqueadas: number;
  convites_especificos: number;
}

interface TipoAcesso {
  tipo: 'matriculado' | 'convidado_curso' | 'misto';
  descricao: string;
  total_aulas: number;
  aulas_acessiveis: number;
  aulas_privadas_com_acesso: number;
}

export default function CursoPage() {
  const params = useParams();
  const cursoId = params.id as string;
  
  const [curso, setCurso] = useState<Curso | null>(null);
  const [tipoAcesso, setTipoAcesso] = useState<TipoAcesso | null>(null);
  const [estatisticas, setEstatisticas] = useState<EstatisticasAcesso | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // TODO: Pegar ID do usuário atual do contexto de autenticação
  const alunoId = 'current_user_id';

  useEffect(() => {
    carregarCurso();
  }, [cursoId]);

  const carregarCurso = async () => {
    try {
      // Carregar informações básicas do curso
      const [cursoResponse, acessoResponse] = await Promise.all([
        fetch(`/api/cursos/${cursoId}`),
        fetch(`/api/cursos/${cursoId}/aulas/acesso?aluno_id=${alunoId}`)
      ]);

      if (!cursoResponse.ok || !acessoResponse.ok) {
        throw new Error('Erro ao carregar informações do curso');
      }

      const cursoData = await cursoResponse.json();
      const acessoData = await acessoResponse.json();

      setCurso(cursoData);
      setTipoAcesso(acessoData.tipo_acesso);
      setEstatisticas(acessoData.estatisticas);
    } catch (error) {
      console.error('Erro ao carregar curso:', error);
      setErro('Erro ao carregar informações do curso');
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (erro || !curso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {erro || 'Curso não encontrado'}
          </h1>
          <p className="text-gray-600 mb-6">
            Não foi possível carregar as informações do curso solicitado.
          </p>
          <button
            onClick={carregarCurso}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header do Curso */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {curso.titulo}
              </h1>
              
              {curso.descricao && (
                <p className="text-gray-600 mb-4 max-w-3xl">
                  {curso.descricao}
                </p>
              )}

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                {curso.instrutor_nome && (
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>Instrutor: {curso.instrutor_nome}</span>
                  </div>
                )}
                
                {estatisticas && (
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-1" />
                    <span>{estatisticas.total_aulas} aulas</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Aulas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Aulas do Curso
              </h2>
              <ListaAulas cursoId={cursoId} alunoId={alunoId} />
            </div>
          </div>

          {/* Sidebar com Resumo de Acesso */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Resumo de Acesso */}
              {tipoAcesso && estatisticas && (
                <ResumoAcessoAluno
                  tipoAcesso={tipoAcesso}
                  estatisticas={estatisticas}
                />
              )}

              {/* Informações Adicionais */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Informações do Curso
                </h3>
                
                <div className="space-y-3 text-sm">
                  {curso.instrutor_nome && (
                    <div>
                      <span className="text-gray-500">Instrutor:</span>
                      <span className="ml-2 text-gray-900">{curso.instrutor_nome}</span>
                    </div>
                  )}
                  
                  {estatisticas && (
                    <>
                      <div>
                        <span className="text-gray-500">Total de aulas:</span>
                        <span className="ml-2 text-gray-900">{estatisticas.total_aulas}</span>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Aulas acessíveis:</span>
                        <span className="ml-2 text-gray-900">{estatisticas.aulas_acessiveis}</span>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Aulas públicas:</span>
                        <span className="ml-2 text-gray-900">{estatisticas.aulas_publicas}</span>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Aulas privadas:</span>
                        <span className="ml-2 text-gray-900">{estatisticas.aulas_privadas}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Ajuda */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">
                  Precisa de ajuda?
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Se você não consegue acessar alguma aula ou tem dúvidas sobre o conteúdo, entre em contato com o instrutor.
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Entrar em contato →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}