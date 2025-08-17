-- Script para criar tabela de auditoria do sistema híbrido de aulas privadas
-- Execute este script no banco de dados para habilitar o sistema de auditoria completo

BEGIN;

-- Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS rarcursos.logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações do evento
  tipo_evento VARCHAR NOT NULL,
  severidade VARCHAR NOT NULL CHECK (severidade IN ('info', 'warning', 'error', 'critical')),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Usuários envolvidos
  usuario_id UUID REFERENCES rarcursos.users(uid) ON DELETE SET NULL,
  usuario_afetado_id UUID REFERENCES rarcursos.users(uid) ON DELETE SET NULL,
  
  -- Recurso afetado
  recurso_tipo VARCHAR NOT NULL CHECK (recurso_tipo IN ('aula', 'curso', 'convite', 'permissao', 'sistema')),
  recurso_id UUID,
  
  -- Detalhes técnicos
  detalhes JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  sessao_id VARCHAR,
  
  -- Metadados
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_timestamp ON rarcursos.logs_auditoria(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_tipo_evento ON rarcursos.logs_auditoria(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_usuario_id ON rarcursos.logs_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_recurso ON rarcursos.logs_auditoria(recurso_tipo, recurso_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_severidade ON rarcursos.logs_auditoria(severidade);

-- Índice composto para consultas comuns
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_usuario_timestamp 
ON rarcursos.logs_auditoria(usuario_id, timestamp DESC);

-- Índice GIN para busca em detalhes JSON
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_detalhes 
ON rarcursos.logs_auditoria USING GIN (detalhes);

-- Criar tabela de métricas de auditoria (para relatórios rápidos)
CREATE TABLE IF NOT EXISTS rarcursos.metricas_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_referencia DATE NOT NULL,
  tipo_evento VARCHAR NOT NULL,
  recurso_tipo VARCHAR NOT NULL,
  total_eventos INTEGER NOT NULL DEFAULT 0,
  usuarios_unicos INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(data_referencia, tipo_evento, recurso_tipo)
);

-- Índices para métricas
CREATE INDEX IF NOT EXISTS idx_metricas_auditoria_data ON rarcursos.metricas_auditoria(data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_metricas_auditoria_tipo ON rarcursos.metricas_auditoria(tipo_evento);

-- Função para atualizar métricas automaticamente
CREATE OR REPLACE FUNCTION rarcursos.atualizar_metricas_auditoria()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir ou atualizar métricas do dia
  INSERT INTO rarcursos.metricas_auditoria (
    data_referencia,
    tipo_evento,
    recurso_tipo,
    total_eventos,
    usuarios_unicos
  )
  SELECT 
    DATE(NEW.timestamp),
    NEW.tipo_evento,
    NEW.recurso_tipo,
    1,
    1
  ON CONFLICT (data_referencia, tipo_evento, recurso_tipo)
  DO UPDATE SET
    total_eventos = rarcursos.metricas_auditoria.total_eventos + 1,
    usuarios_unicos = (
      SELECT COUNT(DISTINCT usuario_id)
      FROM rarcursos.logs_auditoria
      WHERE DATE(timestamp) = DATE(NEW.timestamp)
        AND tipo_evento = NEW.tipo_evento
        AND recurso_tipo = NEW.recurso_tipo
        AND usuario_id IS NOT NULL
    ),
    atualizado_em = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar métricas
DROP TRIGGER IF EXISTS trigger_atualizar_metricas_auditoria ON rarcursos.logs_auditoria;
CREATE TRIGGER trigger_atualizar_metricas_auditoria
  AFTER INSERT ON rarcursos.logs_auditoria
  FOR EACH ROW
  EXECUTE FUNCTION rarcursos.atualizar_metricas_auditoria();

-- Função para limpeza automática de logs antigos (opcional)
CREATE OR REPLACE FUNCTION rarcursos.limpar_logs_auditoria_antigos(dias_retencao INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  registros_removidos INTEGER;
BEGIN
  DELETE FROM rarcursos.logs_auditoria
  WHERE timestamp < NOW() - INTERVAL '1 day' * dias_retencao;
  
  GET DIAGNOSTICS registros_removidos = ROW_COUNT;
  
  -- Log da operação de limpeza
  INSERT INTO rarcursos.logs_auditoria (
    tipo_evento,
    severidade,
    recurso_tipo,
    detalhes
  ) VALUES (
    'limpeza_logs',
    'info',
    'sistema',
    jsonb_build_object(
      'registros_removidos', registros_removidos,
      'dias_retencao', dias_retencao
    )
  );
  
  RETURN registros_removidos;
END;
$$ LANGUAGE plpgsql;

-- View para relatórios de auditoria
CREATE OR REPLACE VIEW rarcursos.v_relatorio_auditoria AS
SELECT 
  la.id,
  la.tipo_evento,
  la.severidade,
  la.timestamp,
  u1.nome as usuario_nome,
  u1.email as usuario_email,
  u2.nome as usuario_afetado_nome,
  u2.email as usuario_afetado_email,
  la.recurso_tipo,
  la.recurso_id,
  CASE 
    WHEN la.recurso_tipo = 'curso' THEN c.titulo
    WHEN la.recurso_tipo = 'aula' THEN a.titulo
    ELSE NULL
  END as recurso_nome,
  la.detalhes,
  la.ip_address,
  la.user_agent
FROM rarcursos.logs_auditoria la
LEFT JOIN rarcursos.users u1 ON la.usuario_id = u1.uid
LEFT JOIN rarcursos.users u2 ON la.usuario_afetado_id = u2.uid
LEFT JOIN rarcursos.cursos c ON la.recurso_tipo = 'curso' AND la.recurso_id = c.id
LEFT JOIN rarcursos.aulas a ON la.recurso_tipo = 'aula' AND la.recurso_id = a.id
ORDER BY la.timestamp DESC;

-- View para métricas resumidas
CREATE OR REPLACE VIEW rarcursos.v_metricas_resumidas AS
SELECT 
  data_referencia,
  SUM(total_eventos) as total_eventos_dia,
  SUM(usuarios_unicos) as total_usuarios_unicos,
  COUNT(DISTINCT tipo_evento) as tipos_eventos_distintos
FROM rarcursos.metricas_auditoria
GROUP BY data_referencia
ORDER BY data_referencia DESC;

-- Inserir evento inicial de criação do sistema
INSERT INTO rarcursos.logs_auditoria (
  tipo_evento,
  severidade,
  recurso_tipo,
  detalhes
) VALUES (
  'sistema_auditoria_criado',
  'info',
  'sistema',
  jsonb_build_object(
    'versao', '1.0',
    'descricao', 'Sistema de auditoria para aulas privadas híbrido criado',
    'tabelas_criadas', ARRAY['logs_auditoria', 'metricas_auditoria'],
    'views_criadas', ARRAY['v_relatorio_auditoria', 'v_metricas_resumidas']
  )
);

COMMIT;

-- Comentários para documentação
COMMENT ON TABLE rarcursos.logs_auditoria IS 'Tabela principal de auditoria para rastrear todas as operações do sistema de aulas privadas';
COMMENT ON TABLE rarcursos.metricas_auditoria IS 'Tabela de métricas agregadas para relatórios de performance';
COMMENT ON VIEW rarcursos.v_relatorio_auditoria IS 'View para relatórios de auditoria com informações enriquecidas';
COMMENT ON VIEW rarcursos.v_metricas_resumidas IS 'View para métricas resumidas por dia';

COMMENT ON COLUMN rarcursos.logs_auditoria.tipo_evento IS 'Tipo do evento auditado (ex: convite_enviado, permissao_concedida)';
COMMENT ON COLUMN rarcursos.logs_auditoria.severidade IS 'Nível de severidade: info, warning, error, critical';
COMMENT ON COLUMN rarcursos.logs_auditoria.detalhes IS 'Detalhes específicos do evento em formato JSON';
COMMENT ON COLUMN rarcursos.logs_auditoria.recurso_tipo IS 'Tipo do recurso afetado: aula, curso, convite, permissao, sistema';

-- Exemplo de consultas úteis:

-- 1. Eventos de um usuário específico nos últimos 30 dias
-- SELECT * FROM rarcursos.v_relatorio_auditoria 
-- WHERE usuario_email = 'usuario@exemplo.com' 
-- AND timestamp >= NOW() - INTERVAL '30 days';

-- 2. Todos os convites enviados hoje
-- SELECT * FROM rarcursos.v_relatorio_auditoria 
-- WHERE tipo_evento = 'convite_enviado' 
-- AND DATE(timestamp) = CURRENT_DATE;

-- 3. Métricas dos últimos 7 dias
-- SELECT * FROM rarcursos.v_metricas_resumidas 
-- WHERE data_referencia >= CURRENT_DATE - INTERVAL '7 days';

-- 4. Eventos de erro ou críticos
-- SELECT * FROM rarcursos.v_relatorio_auditoria 
-- WHERE severidade IN ('error', 'critical') 
-- ORDER BY timestamp DESC;

-- 5. Atividade por tipo de evento
-- SELECT tipo_evento, COUNT(*) as total, DATE(timestamp) as data
-- FROM rarcursos.logs_auditoria 
-- WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
-- GROUP BY tipo_evento, DATE(timestamp)
-- ORDER BY data DESC, total DESC;