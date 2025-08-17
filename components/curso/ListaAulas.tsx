'use client';

import { useEffect, useState } from 'react';
import { Play, Lock, Eye, Crown, Target, Clock, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface AulaComAcesso {
  id: string;
  titulo: string;
  descricao?: string;
  duracao?: number;
  privada: boolean;
  pode_assistir: boolean;
  tipo_acesso?: 'aula_publica' | 'convidado_curso' | 'convite_especifico';
  motivo?: string;
  media_url?: string;
}

interface TipoAcessoCurso {
  tipo: 'matriculado' | 'convidado_curso' | 'misto';
  descricao: string;
  total_aulas: number;
  aulas_acessiveis: number;
  aulas_privadas_com_acesso: number;
}

interface ListaAulasProps {
  cursoId: string;
  alunoId: string;
}

export function ListaAulas({ cursoId, alunoId }: ListaAulasProps) {
  const [aulas, setAulas] = useState<AulaComAcesso[]>([]);
  const [tipoAcesso, setTipoAcesso] = useState<TipoAcessoCurso | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarAulasComAcesso();
  }, [cursoId, alunoId]);

  const carregarAulasComAcesso = async () => {
    try {
      const response = await fetch(`/api/cursos/${cursoId}/aulas/acesso?aluno_id=${alunoId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar aulas');
      }

      const data = await response.json();
      setAulas(data.aulas || []);
      setTipoAcesso(data.tipo_acesso || null);
    } catch (error) {
      console.error('Erro ao carregar aulas:', error);
      setErro('Erro ao carregar lista de aulas');
    } finally {
      setCarregando(false);
    }
  };

  const formatarDuracao = (duracao?: number) => {
    if (!duracao) return '';
    const minutos = Math.floor(duracao / 60);
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    
    if (horas > 0) {
      return `${horas}h ${minutosRestantes}min`;
    }
    return `${minutos}min`;
  };

  const getBadgeAcesso = (aula: AulaComAcesso) => {
    if (!aula.privada) {
      return {
        icon: Eye,
        text: 'Pública',
        className: 'bg-green-100 text-green-800',
        description: 'Todos os alunos matriculados têm acesso'
      };
    }

    if (!aula.pode_assistir) {
      return {
        icon: Lock,
        text: 'Bloqueada',
        className: 'bg-red-100 text-red-800',
        description: aula.motivo || 'Acesso restrito'
      };
    }

    switch (aula.tipo_acesso) {
      case 'convidado_curso':
        return {
          icon: Crown,
          text: 'Acesso Total',
          className: 'bg-yellow-100 text-yellow-800',
          description: 'Você tem acesso completo ao curso'
        };
      case 'convite_especifico':
        return {
          icon: Target,
          text: 'Convite Específico',
          className: 'bg-purple-100 text-purple-800',
          description: 'Acesso concedido especificamente para esta aula'
        };
      default:
        return {
          icon: CheckCircle,
          text: 'Liberada',
          className: 'bg-blue-100 text-blue-800',
          description: 'Aula acessível'
        };
    }
  };

  const getTipoAcessoBadge = () => {
    if (!tipoAcesso) return null;

    switch (tipoAcesso.tipo) {
      case 'convidado_curso':
        return {
          icon: Crown,
          text: 'Convidado do Curso (Acesso Total)',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          description: `Você tem acesso a todas as ${tipoAcesso.total_aulas} aulas deste curso, incluindo conteúdo exclusivo.`
        };
      case 'misto':
        return {
          icon: Target,
          text: 'Acesso Misto',
          className: 'bg-purple-100 text-purple-800 border-purple-200',
          description: `Você tem acesso a ${tipoAcesso.aulas_acessiveis} de ${tipoAcesso.total_aulas} aulas (${tipoAcesso.aulas_privadas_com_acesso} por convites específicos).`
        };
      default:
        return {
          icon: Eye,
          text: 'Matriculado',
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          description: `Você tem acesso a ${tipoAcesso.aulas_acessiveis} aulas públicas de ${tipoAcesso.total_aulas} total.`
        };
    }
  };

  if (carregando) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 rounded-lg mb-4"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg mb-3"></div>
          ))}
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar aulas</h3>
        <p className="text-gray-600 mb-4">{erro}</p>
        <button
          onClick={carregarAulasComAcesso}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const tipoAcessoBadge = getTipoAcessoBadge();

  return (
    <div className="space-y-6">
      {/* Badge de Tipo de Acesso */}
      {tipoAcessoBadge && (
        <div className={`p-4 rounded-lg border ${tipoAcessoBadge.className}`}>
          <div className="flex items-center mb-2">
            <tipoAcessoBadge.icon className="w-5 h-5 mr-2" />
            <span className="font-medium">{tipoAcessoBadge.text}</span>
          </div>
          <p className="text-sm opacity-90">{tipoAcessoBadge.description}</p>
        </div>
      )}

      {/* Lista de Aulas */}
      {aulas.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma aula encontrada</h3>
          <p className="text-gray-600">Este curso ainda não possui aulas disponíveis.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {aulas.map((aula, index) => {
            const badge = getBadgeAcesso(aula);
            const IconeBadge = badge.icon;

            return (
              <div
                key={aula.id}
                className={`border rounded-lg p-6 transition-all hover:shadow-md ${
                  aula.pode_assistir 
                    ? 'bg-white border-gray-200 hover:border-blue-300' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                        {index + 1}
                      </span>
                      <h3 className={`text-lg font-medium ${
                        aula.pode_assistir ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {aula.titulo}
                      </h3>
                    </div>

                    {aula.descricao && (
                      <p className={`text-sm mb-3 ${
                        aula.pode_assistir ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {aula.descricao}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 mb-3">
                      {aula.duracao && (
                        <span className="inline-flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatarDuracao(aula.duracao)}
                        </span>
                      )}

                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                        <IconeBadge className="w-3 h-3 mr-1" />
                        {badge.text}
                      </span>
                    </div>

                    {/* Explicação do Status */}
                    <p className="text-xs text-gray-500 mb-4">
                      {badge.description}
                    </p>

                    {/* Motivo de Bloqueio */}
                    {!aula.pode_assistir && aula.motivo && (
                      <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                        <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Acesso restrito</p>
                          <p className="text-xs text-red-700">{aula.motivo}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botão de Ação */}
                  <div className="ml-4">
                    {aula.pode_assistir ? (
                      <Link
                        href={`/cursos/${cursoId}/aulas/${aula.id}`}
                        className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Assistir
                      </Link>
                    ) : (
                      <div className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed">
                        <Lock className="w-4 h-4 mr-2" />
                        Bloqueada
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Informações Adicionais */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">
          💡 Sobre os tipos de acesso:
        </h4>
        <div className="text-xs text-blue-700 space-y-1">
          <div className="flex items-center">
            <Eye className="w-3 h-3 mr-2" />
            <span><strong>Pública:</strong> Todos os alunos matriculados têm acesso</span>
          </div>
          <div className="flex items-center">
            <Crown className="w-3 h-3 mr-2" />
            <span><strong>Acesso Total:</strong> Você foi convidado para o curso completo</span>
          </div>
          <div className="flex items-center">
            <Target className="w-3 h-3 mr-2" />
            <span><strong>Convite Específico:</strong> Acesso concedido pelo instrutor para esta aula</span>
          </div>
          <div className="flex items-center">
            <Lock className="w-3 h-3 mr-2" />
            <span><strong>Bloqueada:</strong> Entre em contato com o instrutor para solicitar acesso</span>
          </div>
        </div>
      </div>
    </div>
  );
}