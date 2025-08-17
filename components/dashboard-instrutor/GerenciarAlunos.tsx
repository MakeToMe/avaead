'use client';

import { useEffect, useState } from 'react';
import { Users, Crown, User, ArrowUp, ArrowDown, Eye, Search, Filter } from 'lucide-react';

interface AlunoMatricula {
  id: string;
  aluno_id: string;
  nome: string;
  email: string;
  tipo_acesso: 'matriculado' | 'convidado_curso';
  data_matricula: string;
  progresso_percentual: number;
  aulas_especificas?: number; // Quantidade de aulas específicas que tem acesso
}

interface GerenciarAlunosProps {
  cursoId: string;
}

export function GerenciarAlunos({ cursoId }: GerenciarAlunosProps) {
  const [alunos, setAlunos] = useState<AlunoMatricula[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'matriculados' | 'convidados'>('todos');
  const [busca, setBusca] = useState('');
  const [processando, setProcessando] = useState<string | null>(null);

  useEffect(() => {
    carregarAlunos();
  }, [cursoId]);

  const carregarAlunos = async () => {
    try {
      const response = await fetch(`/api/cursos/${cursoId}/alunos`);
      if (response.ok) {
        const data = await response.json();
        setAlunos(data.alunos || []);
      }
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    } finally {
      setCarregando(false);
    }
  };

  const alterarTipoAcesso = async (alunoId: string, novoTipo: 'matriculado' | 'convidado_curso') => {
    setProcessando(alunoId);
    try {
      const response = await fetch(`/api/cursos/${cursoId}/alunos/${alunoId}/tipo-acesso`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tipo_acesso: novoTipo })
      });

      if (response.ok) {
        await carregarAlunos(); // Recarregar lista
      } else {
        alert('Erro ao alterar tipo de acesso');
      }
    } catch (error) {
      console.error('Erro ao alterar tipo de acesso:', error);
      alert('Erro ao alterar tipo de acesso');
    } finally {
      setProcessando(null);
    }
  };

  const alunosFiltrados = alunos.filter(aluno => {
    const matchBusca = aluno.nome.toLowerCase().includes(busca.toLowerCase()) ||
                      aluno.email.toLowerCase().includes(busca.toLowerCase());
    
    if (!matchBusca) return false;

    switch (filtro) {
      case 'matriculados':
        return aluno.tipo_acesso === 'matriculado';
      case 'convidados':
        return aluno.tipo_acesso === 'convidado_curso';
      default:
        return true;
    }
  });

  const matriculados = alunosFiltrados.filter(a => a.tipo_acesso === 'matriculado');
  const convidados = alunosFiltrados.filter(a => a.tipo_acesso === 'convidado_curso');

  if (carregando) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Carregando alunos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder:text-slate-400"
            />
          </div>
          
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as any)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white backdrop-blur-sm"
          >
            <option value="todos" className="bg-slate-800 text-white">Todos os alunos</option>
            <option value="matriculados" className="bg-slate-800 text-white">Apenas matriculados</option>
            <option value="convidados" className="bg-slate-800 text-white">Apenas convidados</option>
          </select>
        </div>

        <div className="flex items-center space-x-4 text-sm text-slate-400">
          <span className="flex items-center">
            <User className="w-4 h-4 mr-1" />
            {matriculados.length} Matriculados
          </span>
          <span className="flex items-center">
            <Crown className="w-4 h-4 mr-1 text-yellow-400" />
            {convidados.length} Convidados
          </span>
        </div>
      </div>

      {alunosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {busca ? 'Nenhum aluno encontrado' : 'Nenhum aluno matriculado'}
          </h3>
          <p className="text-slate-400">
            {busca 
              ? 'Tente ajustar os filtros de busca.' 
              : 'Comece enviando convites para alunos se juntarem ao curso.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Lista Unificada para "Todos os alunos" */}
          {filtro === 'todos' && (
            <div>
              <div className="flex items-center mb-4">
                <Users className="w-5 h-5 text-indigo-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">
                  Todos os Alunos ({alunosFiltrados.length})
                </h3>
                <span className="ml-2 text-sm text-slate-400">
                  Matriculados e Convidados
                </span>
              </div>
              
              {alunosFiltrados.length > 0 ? (
                <div className="grid gap-4">
                  {alunosFiltrados.map(aluno => (
                    <div key={aluno.id} className={`${
                      aluno.tipo_acesso === 'convidado_curso' 
                        ? 'bg-yellow-600/10 border-yellow-600/30' 
                        : 'bg-slate-800/30 border-slate-700/50'
                    } border rounded-lg p-4`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              aluno.tipo_acesso === 'convidado_curso'
                                ? 'bg-yellow-600/20'
                                : 'bg-indigo-600/20'
                            }`}>
                              {aluno.tipo_acesso === 'convidado_curso' ? (
                                <Crown className="w-5 h-5 text-yellow-400" />
                              ) : (
                                <span className="text-indigo-400 font-medium">
                                  {aluno.nome.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-white flex items-center">
                                {aluno.nome}
                                {aluno.tipo_acesso === 'convidado_curso' && (
                                  <span className="ml-2 inline-block px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded-full">
                                    Acesso Total
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-slate-400">{aluno.email}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs text-slate-500">
                                  Matriculado em {new Date(aluno.data_matricula).toLocaleDateString()}
                                </span>
                                <span className="text-xs text-slate-500">
                                  Progresso: {aluno.progresso_percentual}%
                                </span>
                                {aluno.aulas_especificas && aluno.aulas_especificas > 0 && (
                                  <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">
                                    +{aluno.aulas_especificas} aulas específicas
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => alert('Funcionalidade em desenvolvimento')}
                            className="p-2 text-slate-400 hover:text-slate-300 transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => alterarTipoAcesso(
                              aluno.aluno_id, 
                              aluno.tipo_acesso === 'matriculado' ? 'convidado_curso' : 'matriculado'
                            )}
                            disabled={processando === aluno.aluno_id}
                            className={`inline-flex items-center px-3 py-1 text-white text-sm rounded transition-colors disabled:opacity-50 ${
                              aluno.tipo_acesso === 'matriculado'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-slate-600 hover:bg-slate-700'
                            }`}
                          >
                            {processando === aluno.aluno_id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                            ) : aluno.tipo_acesso === 'matriculado' ? (
                              <ArrowUp className="w-3 h-3 mr-1" />
                            ) : (
                              <ArrowDown className="w-3 h-3 mr-1" />
                            )}
                            {aluno.tipo_acesso === 'matriculado' ? 'Promover' : 'Rebaixar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Nenhum aluno ainda</h3>
                  <p className="text-slate-400">
                    Comece enviando convites para alunos se juntarem ao curso.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Matriculados */}
          {filtro === 'matriculados' && (
            <div>
              <div className="flex items-center mb-4">
                <User className="w-5 h-5 text-indigo-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">
                  Matriculados ({matriculados.length})
                </h3>
                <span className="ml-2 text-sm text-slate-400">
                  Acesso apenas a aulas públicas
                </span>
              </div>
              
              {matriculados.length > 0 ? (
                <div className="grid gap-4">
                  {matriculados.map(aluno => (
                  <div key={aluno.id} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-indigo-600/20 rounded-full flex items-center justify-center">
                            <span className="text-indigo-400 font-medium">
                              {aluno.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{aluno.nome}</h4>
                            <p className="text-sm text-slate-400">{aluno.email}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-slate-500">
                                Matriculado em {new Date(aluno.data_matricula).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-slate-500">
                                Progresso: {aluno.progresso_percentual}%
                              </span>
                              {aluno.aulas_especificas && aluno.aulas_especificas > 0 && (
                                <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">
                                  +{aluno.aulas_especificas} aulas específicas
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => alert('Funcionalidade em desenvolvimento')}
                          className="p-2 text-slate-400 hover:text-slate-300 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => alterarTipoAcesso(aluno.aluno_id, 'convidado_curso')}
                          disabled={processando === aluno.aluno_id}
                          className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {processando === aluno.aluno_id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                          ) : (
                            <ArrowUp className="w-3 h-3 mr-1" />
                          )}
                          Promover
                        </button>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-800/20 rounded-lg border border-slate-700/30">
                  <User className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Nenhum aluno matriculado ainda</p>
                </div>
              )}
            </div>
          )}

          {/* Convidados do Curso */}
          {filtro === 'convidados' && (
            <div>
              <div className="flex items-center mb-4">
                <Crown className="w-5 h-5 text-yellow-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">
                  Convidados do Curso ({convidados.length})
                </h3>
                <span className="ml-2 text-sm text-slate-400">
                  Acesso total (todas as aulas)
                </span>
              </div>
              
              {convidados.length > 0 ? (
                <div className="grid gap-4">
                  {convidados.map(aluno => (
                  <div key={aluno.id} className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-yellow-600/20 rounded-full flex items-center justify-center">
                            <Crown className="w-5 h-5 text-yellow-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-white flex items-center">
                              {aluno.nome}
                              <span className="ml-2 inline-block px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded-full">
                                Acesso Total
                              </span>
                            </h4>
                            <p className="text-sm text-slate-400">{aluno.email}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-slate-500">
                                Matriculado em {new Date(aluno.data_matricula).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-slate-500">
                                Progresso: {aluno.progresso_percentual}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => alert('Funcionalidade em desenvolvimento')}
                          className="p-2 text-slate-400 hover:text-slate-300 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => alterarTipoAcesso(aluno.aluno_id, 'matriculado')}
                          disabled={processando === aluno.aluno_id}
                          className="inline-flex items-center px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                          {processando === aluno.aluno_id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                          ) : (
                            <ArrowDown className="w-3 h-3 mr-1" />
                          )}
                          Rebaixar
                        </button>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-800/20 rounded-lg border border-slate-700/30">
                  <Crown className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Nenhum aluno convidado ainda</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}