'use client';

import { useState, useEffect } from 'react';
import { X, Target, Mail, Send, AlertCircle, Check, Clock } from 'lucide-react';

interface Aula {
  id: string;
  titulo: string;
  descricao?: string;
  duracao?: number;
  privada: boolean;
}

interface ModalConviteAulasEspecificasProps {
  cursoId: string;
  cursoTitulo: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalConviteAulasEspecificas({ 
  cursoId, 
  cursoTitulo, 
  onClose, 
  onSuccess 
}: ModalConviteAulasEspecificasProps) {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [aulasSelecionadas, setAulasSelecionadas] = useState<string[]>([]);
  const [carregandoAulas, setCarregandoAulas] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarAulas();
  }, [cursoId]);

  const carregarAulas = async () => {
    try {
      const response = await fetch(`/api/cursos/${cursoId}/aulas?apenas_privadas=true`);
      if (response.ok) {
        const data = await response.json();
        setAulas(data.aulas || []);
      }
    } catch (error) {
      console.error('Erro ao carregar aulas:', error);
    } finally {
      setCarregandoAulas(false);
    }
  };

  const toggleAula = (aulaId: string) => {
    setAulasSelecionadas(prev => 
      prev.includes(aulaId) 
        ? prev.filter(id => id !== aulaId)
        : [...prev, aulaId]
    );
  };

  const selecionarTodas = () => {
    setAulasSelecionadas(aulas.map(aula => aula.id));
  };

  const deselecionarTodas = () => {
    setAulasSelecionadas([]);
  };

  const enviarConvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (aulasSelecionadas.length === 0) {
      setErro('Selecione pelo menos uma aula');
      return;
    }

    setEnviando(true);
    setErro('');

    try {
      const response = await fetch(`/api/cursos/${cursoId}/convites/aulas-especificas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          aula_ids: aulasSelecionadas,
          mensagem: mensagem.trim() || undefined,
          instrutor_id: 'current_user_id' // TODO: Pegar do contexto de autenticação
        })
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        setErro(data.error || 'Erro ao enviar convite');
      }
    } catch (error) {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const formatarDuracao = (duracao?: number) => {
    if (!duracao) return '';
    const minutos = Math.floor(duracao / 60);
    return `${minutos}min`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Target className="w-6 h-6 text-purple-500 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Convite para Aulas Específicas
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <form onSubmit={enviarConvite} className="p-6 space-y-6">
          {/* Informações do Curso */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Curso: {cursoTitulo}</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p className="flex items-center">
                <Target className="w-4 h-4 text-purple-500 mr-2" />
                <strong>Acesso Seletivo:</strong> Apenas às aulas selecionadas
              </p>
              <p className="text-gray-600">
                O aluno terá acesso apenas às aulas privadas que você selecionar abaixo.
              </p>
            </div>
          </div>

          {/* Email do Convidado */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email do aluno *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aluno@exemplo.com"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Seleção de Aulas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Selecionar aulas privadas *
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={selecionarTodas}
                  className="text-xs text-purple-600 hover:text-purple-800"
                >
                  Selecionar todas
                </button>
                <span className="text-xs text-gray-400">|</span>
                <button
                  type="button"
                  onClick={deselecionarTodas}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            {carregandoAulas ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Carregando aulas...</p>
              </div>
            ) : aulas.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Nenhuma aula privada encontrada neste curso.</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {aulas.map(aula => (
                  <label
                    key={aula.id}
                    className={`flex items-center p-4 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                      aulasSelecionadas.includes(aula.id) ? 'bg-purple-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={aulasSelecionadas.includes(aula.id)}
                      onChange={() => toggleAula(aula.id)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {aula.titulo}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {aula.duracao && (
                            <span className="inline-flex items-center text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatarDuracao(aula.duracao)}
                            </span>
                          )}
                          {aulasSelecionadas.includes(aula.id) && (
                            <Check className="w-4 h-4 text-purple-600" />
                          )}
                        </div>
                      </div>
                      {aula.descricao && (
                        <p className="text-xs text-gray-600 mt-1">{aula.descricao}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {aulasSelecionadas.length > 0 && (
              <p className="text-sm text-purple-600 mt-2">
                {aulasSelecionadas.length} aula{aulasSelecionadas.length !== 1 ? 's' : ''} selecionada{aulasSelecionadas.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Mensagem Personalizada */}
          <div>
            <label htmlFor="mensagem" className="block text-sm font-medium text-gray-700 mb-2">
              Mensagem personalizada (opcional)
            </label>
            <textarea
              id="mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Explique por que está dando acesso a essas aulas específicas..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Erro */}
          {erro && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-700">{erro}</p>
            </div>
          )}

          {/* Informações Importantes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              ℹ️ Informações importantes:
            </h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• O aluno terá acesso apenas às aulas selecionadas</li>
              <li>• O convite expira em 7 dias</li>
              <li>• Você pode conceder acesso a mais aulas depois</li>
              <li>• Aulas públicas são sempre acessíveis para alunos matriculados</li>
            </ul>
          </div>

          {/* Botões */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || !email.trim() || aulasSelecionadas.length === 0}
              className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Convite
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}