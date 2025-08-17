'use client';

import { useState } from 'react';
import { X, Crown, Mail, Send, AlertCircle } from 'lucide-react';

interface ModalConviteCursoCompletoProps {
  cursoId: string;
  cursoTitulo: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalConviteCursoCompleto({ 
  cursoId, 
  cursoTitulo, 
  onClose, 
  onSuccess 
}: ModalConviteCursoCompletoProps) {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const enviarConvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro('');

    try {
      const response = await fetch(`/api/cursos/${cursoId}/convites/curso-completo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Crown className="w-6 h-6 text-yellow-500 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Convite para Curso Completo
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Curso: {cursoTitulo}</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p className="flex items-center">
                <Crown className="w-4 h-4 text-yellow-500 mr-2" />
                <strong>Acesso Total:</strong> Todas as aulas públicas e privadas
              </p>
              <p className="text-gray-600">
                O aluno convidado terá acesso completo ao curso, incluindo todo conteúdo exclusivo.
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
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
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
              placeholder="Escreva uma mensagem de boas-vindas para o aluno..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Esta mensagem será incluída no email de convite.
            </p>
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
              <li>• O convite expira em 7 dias</li>
              <li>• O aluno receberá um email com link para aceitar</li>
              <li>• Se o aluno não tiver conta, uma será criada automaticamente</li>
              <li>• Você pode alterar o tipo de acesso depois se necessário</li>
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
              disabled={enviando || !email.trim()}
              className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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