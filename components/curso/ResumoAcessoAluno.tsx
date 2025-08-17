'use client';

import { Crown, Eye, Target, Lock, BarChart3 } from 'lucide-react';

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

interface ResumoAcessoAlunoProps {
  tipoAcesso: TipoAcesso;
  estatisticas: EstatisticasAcesso;
  className?: string;
}

export function ResumoAcessoAluno({ 
  tipoAcesso, 
  estatisticas, 
  className = '' 
}: ResumoAcessoAlunoProps) {
  const porcentagemAcesso = Math.round((estatisticas.aulas_acessiveis / estatisticas.total_aulas) * 100);

  const getIconeETema = () => {
    switch (tipoAcesso.tipo) {
      case 'convidado_curso':
        return {
          icon: Crown,
          cor: 'yellow',
          bgClass: 'bg-yellow-50',
          borderClass: 'border-yellow-200',
          textClass: 'text-yellow-800',
          iconClass: 'text-yellow-600'
        };
      case 'misto':
        return {
          icon: Target,
          cor: 'purple',
          bgClass: 'bg-purple-50',
          borderClass: 'border-purple-200',
          textClass: 'text-purple-800',
          iconClass: 'text-purple-600'
        };
      default:
        return {
          icon: Eye,
          cor: 'blue',
          bgClass: 'bg-blue-50',
          borderClass: 'border-blue-200',
          textClass: 'text-blue-800',
          iconClass: 'text-blue-600'
        };
    }
  };

  const tema = getIconeETema();
  const IconePrincipal = tema.icon;

  return (
    <div className={`${tema.bgClass} ${tema.borderClass} border rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <IconePrincipal className={`w-6 h-6 ${tema.iconClass} mr-3`} />
          <div>
            <h3 className={`font-semibold ${tema.textClass}`}>
              Seu Acesso ao Curso
            </h3>
            <p className={`text-sm ${tema.textClass} opacity-80`}>
              {tipoAcesso.descricao}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-2xl font-bold ${tema.textClass}`}>
            {porcentagemAcesso}%
          </div>
          <div className={`text-xs ${tema.textClass} opacity-70`}>
            de acesso
          </div>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className={tema.textClass}>
            {estatisticas.aulas_acessiveis} de {estatisticas.total_aulas} aulas
          </span>
        </div>
        <div className="w-full bg-white rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              tema.cor === 'yellow' ? 'bg-yellow-400' :
              tema.cor === 'purple' ? 'bg-purple-400' : 'bg-blue-400'
            }`}
            style={{ width: `${porcentagemAcesso}%` }}
          ></div>
        </div>
      </div>

      {/* Estatísticas Detalhadas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {estatisticas.aulas_publicas}
              </div>
              <div className="text-xs text-gray-600">Aulas Públicas</div>
            </div>
            <Eye className="w-5 h-5 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {estatisticas.aulas_privadas_com_acesso}
              </div>
              <div className="text-xs text-gray-600">Privadas Liberadas</div>
            </div>
            <Target className="w-5 h-5 text-purple-500" />
          </div>
        </div>

        {estatisticas.aulas_privadas_bloqueadas > 0 && (
          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {estatisticas.aulas_privadas_bloqueadas}
                </div>
                <div className="text-xs text-gray-600">Privadas Bloqueadas</div>
              </div>
              <Lock className="w-5 h-5 text-red-500" />
            </div>
          </div>
        )}

        {estatisticas.convites_especificos > 0 && (
          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {estatisticas.convites_especificos}
                </div>
                <div className="text-xs text-gray-600">Convites Específicos</div>
              </div>
              <Target className="w-5 h-5 text-purple-500" />
            </div>
          </div>
        )}
      </div>

      {/* Mensagem Motivacional */}
      {porcentagemAcesso === 100 ? (
        <div className="mt-4 p-3 bg-white rounded-lg">
          <p className="text-sm text-green-700 font-medium">
            🎉 Parabéns! Você tem acesso completo a todas as aulas deste curso.
          </p>
        </div>
      ) : estatisticas.aulas_privadas_bloqueadas > 0 ? (
        <div className="mt-4 p-3 bg-white rounded-lg">
          <p className="text-sm text-gray-700">
            💡 <strong>Dica:</strong> Entre em contato com o instrutor para solicitar acesso às aulas privadas restantes.
          </p>
        </div>
      ) : null}
    </div>
  );
}