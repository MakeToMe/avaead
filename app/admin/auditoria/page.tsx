'use client';

import { useEffect, useState } from 'react';
import { Shield, Activity, Users, AlertTriangle, Download, Filter, Calendar } from 'lucide-react';

interface EventoAuditoria {
  id: string;
  tipo_evento: string;
  severidade: string;
  timestamp: string;
  usuario_nome?: string;
  usuario_email?: string;
  usuario_afetado_nome?: string;
  recurso_tipo: string;
  recurso_nome?: string;
  detalhes: Record<string, any>;
  ip_address?: string;
}

interface MetricasResumo {
  total_eventos_hoje: number;
  total_usuarios_ativos: number;
  eventos_criticos: number;
  tipos_eventos_distintos: number;
}

export default function DashboardAuditoriaPage() {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [metricas, setMetricas] = useState<MetricasResumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [filtros, setFiltros] = useState({
    data_inicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0],
    tipo_evento: '',
    severidade: '',
    usuario_email: ''
  });

  useEffect(() => {
    carregarDados();
  }, [filtros]);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [eventosResponse, metricasResponse] = await Promise.all([
        fetch(`/api/admin/auditoria/eventos?${new URLSearchParams(filtros)}`),
        fetch('/api/admin/auditoria/metricas')
      ]);

      if (eventosResponse.ok) {
        const eventosData = await eventosResponse.json();
        setEventos(eventosData.eventos || []);
      }

      if (metricasResponse.ok) {
        const metricasData = await metricasResponse.json();
        setMetricas(metricasData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de auditoria:', error);
    } finally {
      setCarregando(false);
    }
  };

  const exportarRelatorio = async () => {
    try {
      const response = await fetch(`/api/admin/auditoria/exportar?${new URLSearchParams(filtros)}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auditoria-${filtros.data_inicio}-${filtros.data_fim}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
    }
  };

  const getSeveridadeColor = (severidade: string) => {
    const cores = {
      info: 'text-blue-600 bg-blue-100',
      warning: 'text-yellow-600 bg-yellow-100',
      error: 'text-red-600 bg-red-100',
      critical: 'text-purple-600 bg-purple-100'
    };
    return cores[severidade as keyof typeof cores] || 'text-gray-600 bg-gray-100';
  };

  const getTipoEventoEmoji = (tipo: string) => {
    const emojis = {
      convite_enviado: '📧',
      convite_aceito: '✅',
      permissao_concedida: '🔓',
      permissao_removida: '🔒',
      acesso_aula_permitido: '👁️',
      acesso_aula_negado: '🚫',
      tipo_acesso_alterado: '🔄'
    };
    return emojis[tipo as keyof typeof emojis] || '📝';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              Dashboard de Auditoria
            </h1>
            <p className="text-gray-600 mt-1">
              Monitoramento e rastreamento de atividades do sistema
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Métricas Resumo */}
        {metricas && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Activity className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Eventos Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">{metricas.total_eventos_hoje}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">{metricas.total_usuarios_ativos}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Eventos Críticos</p>
                  <p className="text-2xl font-bold text-gray-900">{metricas.eventos_criticos}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Filter className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tipos de Eventos</p>
                  <p className="text-2xl font-bold text-gray-900">{metricas.tipos_eventos_distintos}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={filtros.data_inicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, data_inicio: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={filtros.data_fim}
                onChange={(e) => setFiltros(prev => ({ ...prev, data_fim: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Evento
              </label>
              <select
                value={filtros.tipo_evento}
                onChange={(e) => setFiltros(prev => ({ ...prev, tipo_evento: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="convite_enviado">Convite Enviado</option>
                <option value="convite_aceito">Convite Aceito</option>
                <option value="permissao_concedida">Permissão Concedida</option>
                <option value="permissao_removida">Permissão Removida</option>
                <option value="acesso_aula_permitido">Acesso Permitido</option>
                <option value="acesso_aula_negado">Acesso Negado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severidade
              </label>
              <select
                value={filtros.severidade}
                onChange={(e) => setFiltros(prev => ({ ...prev, severidade: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email do Usuário
              </label>
              <input
                type="email"
                value={filtros.usuario_email}
                onChange={(e) => setFiltros(prev => ({ ...prev, usuario_email: e.target.value }))}
                placeholder="usuario@exemplo.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={exportarRelatorio}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Lista de Eventos */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Eventos de Auditoria ({eventos.length})
            </h3>
          </div>

          {carregando ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando eventos...</p>
            </div>
          ) : eventos.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum evento encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recurso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eventos.map((evento) => (
                    <tr key={evento.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">
                            {getTipoEventoEmoji(evento.tipo_evento)}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {evento.tipo_evento.replace(/_/g, ' ').toUpperCase()}
                            </div>
                            {evento.usuario_afetado_nome && (
                              <div className="text-xs text-gray-500">
                                Afetou: {evento.usuario_afetado_nome}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {evento.usuario_nome || 'Sistema'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {evento.usuario_email}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {evento.recurso_tipo}
                        </div>
                        <div className="text-xs text-gray-500">
                          {evento.recurso_nome}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeveridadeColor(evento.severidade)}`}>
                          {evento.severidade}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(evento.timestamp).toLocaleString('pt-BR')}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {evento.ip_address || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}