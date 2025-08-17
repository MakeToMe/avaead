'use client';

import { Crown, Eye, Target, User } from 'lucide-react';

interface BadgeAcessoCursoProps {
  tipoAcesso: 'matriculado' | 'convidado_curso' | 'misto';
  aulasAcessiveis?: number;
  totalAulas?: number;
  className?: string;
  tamanho?: 'sm' | 'md' | 'lg';
}

export function BadgeAcessoCurso({ 
  tipoAcesso, 
  aulasAcessiveis, 
  totalAulas,
  className = '',
  tamanho = 'md'
}: BadgeAcessoCursoProps) {
  const getBadgeConfig = () => {
    switch (tipoAcesso) {
      case 'convidado_curso':
        return {
          icon: Crown,
          text: 'Acesso Total',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          description: 'Você tem acesso completo a todas as aulas'
        };
      case 'misto':
        return {
          icon: Target,
          text: 'Acesso Misto',
          className: 'bg-purple-100 text-purple-800 border-purple-200',
          description: `${aulasAcessiveis} de ${totalAulas} aulas acessíveis`
        };
      default:
        return {
          icon: User,
          text: 'Matriculado',
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          description: 'Acesso a aulas públicas'
        };
    }
  };

  const config = getBadgeConfig();
  const IconeComponent = config.icon;

  const tamanhos = {
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'w-3 h-3',
      spacing: 'mr-1'
    },
    md: {
      container: 'px-3 py-1 text-sm',
      icon: 'w-4 h-4',
      spacing: 'mr-1.5'
    },
    lg: {
      container: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      spacing: 'mr-2'
    }
  };

  const tamanhoConfig = tamanhos[tamanho];

  return (
    <div className={`inline-flex items-center border rounded-full font-medium ${config.className} ${tamanhoConfig.container} ${className}`}>
      <IconeComponent className={`${tamanhoConfig.icon} ${tamanhoConfig.spacing}`} />
      <span>{config.text}</span>
      {aulasAcessiveis && totalAulas && tipoAcesso === 'misto' && (
        <span className="ml-1 opacity-75">
          ({aulasAcessiveis}/{totalAulas})
        </span>
      )}
    </div>
  );
}

interface IndicadorProgressoAcessoProps {
  aulasAcessiveis: number;
  totalAulas: number;
  className?: string;
}

export function IndicadorProgressoAcesso({ 
  aulasAcessiveis, 
  totalAulas, 
  className = '' 
}: IndicadorProgressoAcessoProps) {
  const porcentagem = Math.round((aulasAcessiveis / totalAulas) * 100);
  
  const getCorBarra = () => {
    if (porcentagem === 100) return 'bg-green-400';
    if (porcentagem >= 75) return 'bg-yellow-400';
    if (porcentagem >= 50) return 'bg-blue-400';
    return 'bg-gray-400';
  };

  return (
    <div className={`${className}`}>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Acesso às aulas</span>
        <span>{aulasAcessiveis}/{totalAulas} ({porcentagem}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getCorBarra()}`}
          style={{ width: `${porcentagem}%` }}
        ></div>
      </div>
    </div>
  );
}