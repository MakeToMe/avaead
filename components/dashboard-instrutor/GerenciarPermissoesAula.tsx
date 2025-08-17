'use client';

import { useEffect, useState } from 'react';
import { Crown, User, UserPlus, UserMinus, Search, Filter, Eye, Clock } from 'lucide-react';

interface AlunoComAcesso {
  id: string;
  aluno_id: string;
  nome: string;
  email: string;
  tipo_acesso: 'convidado_curso' | 'convite_especifico';
  data_permissao?: string;
  concedida_por?: string;
  concedida_por_nome?: string;
}

interface AlunoSemAcesso {
  id: string;
  aluno_id: string;
  nome: string;
  email: string;
  data_matricula: string;
  progresso_percentual: number;
}

interface GerenciarPermissoesAulaProps {
  aulaId: string;
}

export function GerenciarPermissoesAula({ aulaId }: GerenciarPermissoesAulaProps) {
  const [alunosComAcesso, setAlunosComAcesso] = useState<AlunoComAcesso[]>([]);
  const [alunosSemAcesso, setAlunosSemAcesso] = useState<AlunoSemAcesso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'com_acesso' | 'sem_acesso'>('todos');

  useEffect(() => {
    carregarPermissoes();
  }, [aulaId]);

  const carregarPermissoes = async () => {
    try {
      const response = await fetch(`/api/aulas/${aulaId}/permissoes`);
      if (response.ok) {
        const data = await response.json();
        setAlunosComAcesso(data.alunos_com_acesso || []);
        setAlunosSemAcesso(data.alunos_sem_acesso || []);
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
    } finally {
      setCarregando(false);
    }
  };

  const concederPermissao = async (alunoId: string) => {
    setProcessando(alunoId);
    try {
      const response = await fetch(`/api/aulas/${aulaId}/permissoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aluno_id: alunoId,
          tipo_permissao: 'convite_especifico'
        })
      });

      if (response.ok) {
        await carregarPermissoes(); // Recarregar listas
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao conceder permissão');
      }
    } catch (error) {
      console.error('Erro ao conceder permissão:', error);
      alert('Erro ao conceder permissão');
    } finally {
      setProcessando(null);
    }
  };

  const removerPermissao = async (alunoId: string) => {
    if (!confirm('Tem certeza que deseja remover o acesso desta aula para este aluno?')) {
      return;
    }

    setProcessando(alunoId);
    try {
      const response = await fetch(`/api/aulas/${aulaId}/permissoes/${alunoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await carregarPermissoes(); // Recarregar listas
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao remover permissão');
      }
    } catch (error) {
      console.error('Erro ao remover permissão:', error);
      alert('Erro ao remover permissão');
    } finally {
      setProcessando(null);
    }
  };

  // Filtrar alunos baseado na busca
  const alunosComAcessoFiltrados = alunosComAcesso.filter(aluno =>
    aluno.nome.toLowerCase().includes(busca.toLowerCase()) ||
    aluno.email.toLowerCase().includes(busca.toLowerCase())
  );

  const alunosSemAcessoFiltrados = alunosSemAcesso.filter(aluno =>
    aluno.nome.toLowerCase().includes(busca.toLowerCase()) ||
    aluno.email.toLowerCase().includes(busca.toLowerCase())
  );

  if (carregando) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando permissões...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="todos">Todos os alunos</option>
            <option value="com_acesso">Apenas com acesso</option>
            <option value="sem_acesso">Apenas sem acesso</option>
          </select>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className="flex items-center">
            <Crown className="w-4 h-4 mr-1 text-green-500" />
            {alunosComAcessoFiltrados.length} Com acesso
          </span>
          <span className="flex items-center">
            <User className="w-4 h-4 mr-1 text-gray-500" />
            {alunosSemAcessoFiltrados.length} Sem acesso
          </span>
        </div>
      </div>

      {/* Alunos com Acesso */}
      {(filtro === 'todos' || filtro === 'com_acesso') && (
        <div>
          <div className="flex items-center mb-4">
            <Crown className="w-5 h-5 text-green-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Alunos com Acesso ({alunosComAcessoFiltrados.length})
            </h3>
            <span className="ml-2 text-sm text-gray-500">
              Podem assistir esta aula privada
            </span>
          </div>
          
          {alunosComAcessoFiltrados.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Crown className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">
                {busca ? 'Nenhum aluno com acesso encontrado' : 'Nenhum aluno tem acesso específico a esta aula'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Alunos "Convidados do Curso" têm acesso automático a todas as aulas privadas
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {alunosComAcessoFiltrados.map(aluno => (
                <div key={aluno.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          {aluno.tipo_acesso === 'convidado_curso' ? (
                            <Crown className="w-5 h-5 text-green-600" />
                          ) : (
                            <span className="text-green-600 font-medium">
                              {aluno.nome.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 flex items-center">
                            {aluno.nome}
                            <span className={`ml-2 inline-block px-2 py-1 text-xs rounded-full ${
                              aluno.tipo_acesso === 'convidado_curso'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {aluno.tipo_acesso === 'convidado_curso' ? 'Acesso Total' : 'Convite Específico'}
                            </span>
                          </h4>
                          <p className="text-sm text-gray-600">{aluno.email}</p>
                          {aluno.data_permissao && (
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-500 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                Acesso concedido em {new Date(aluno.data_permissao).toLocaleDateString()}
                              </span>
                              {aluno.concedida_por_nome && (
                                <span className="text-xs text-gray-500">
                                  por {aluno.concedida_por_nome}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {aluno.tipo_acesso === 'convite_especifico' && (
                        <button
                          onClick={() => removerPermissao(aluno.aluno_id)}
                          disabled={processando === aluno.aluno_id}
                          className="inline-flex items-center px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {processando === aluno.aluno_id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                          ) : (
                            <UserMinus className="w-3 h-3 mr-1" />
                          )}
                          Remover
                        </button>
                      )}
                      
                      {aluno.tipo_acesso === 'convidado_curso' && (
                        <span className="text-xs text-gray-500 italic">
                          Acesso automático
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alunos sem Acesso */}
      {(filtro === 'todos' || filtro === 'sem_acesso') && (
        <div>
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Alunos Matriculados sem Acesso ({alunosSemAcessoFiltrados.length})
            </h3>
            <span className="ml-2 text-sm text-gray-500">
              Podem receber permissão específica
            </span>
          </div>
          
          {alunosSemAcessoFiltrados.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">
                {busca 
                  ? 'Nenhum aluno sem acesso encontrado' 
                  : 'Todos os alunos matriculados já têm acesso a esta aula'
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {alunosSemAcessoFiltrados.map(aluno => (
                <div key={aluno.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {aluno.nome.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{aluno.nome}</h4>
                          <p className="text-sm text-gray-600">{aluno.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">
                              Matriculado em {new Date(aluno.data_matricula).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-gray-500">
                              Progresso: {aluno.progresso_percentual}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => concederPermissao(aluno.aluno_id)}
                        disabled={processando === aluno.aluno_id}
                        className="inline-flex items-center px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition-colors disabled:opacity-50"
                      >
                        {processando === aluno.aluno_id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                        ) : (
                          <UserPlus className="w-3 h-3 mr-1" />
                        )}
                        Dar Acesso
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}