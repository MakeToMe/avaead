'use client';

import { Shield, Lock, Eye } from 'lucide-react';
import Link from 'next/link';

interface BotaoGerenciarPermissoesProps {
  aulaId: string;
  aulaPrivada: boolean;
  className?: string;
}

export function BotaoGerenciarPermissoes({ 
  aulaId, 
  aulaPrivada, 
  className = '' 
}: BotaoGerenciarPermissoesProps) {
  if (!aulaPrivada) {
    return (
      <div className={`inline-flex items-center px-2 py-1 text-xs text-gray-500 ${className}`}>
        <Eye className="w-3 h-3 mr-1" />
        Pública
      </div>
    );
  }

  return (
    <Link
      href={`/dashboard/aulas/${aulaId}/permissoes`}
      className={`inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full hover:bg-purple-200 transition-colors ${className}`}
    >
      <Shield className="w-3 h-3 mr-1" />
      Gerenciar Acesso
    </Link>
  );
}

interface IconeAulaPrivadaProps {
  privada: boolean;
  className?: string;
}

export function IconeAulaPrivada({ privada, className = '' }: IconeAulaPrivadaProps) {
  if (!privada) {
    return (
      <Eye className={`w-4 h-4 text-green-500 ${className}`} title="Aula pública" />
    );
  }

  return (
    <Lock className={`w-4 h-4 text-purple-500 ${className}`} title="Aula privada" />
  );
}