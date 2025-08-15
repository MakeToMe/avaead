-- ============================================================
-- MIGRAÇÃO DO SISTEMA DE AULAS PRIVADAS HÍBRIDO
-- Data: 2025-08-15
-- ============================================================

-- IMPORTANTE: Execute este script no editor SQL do Supabase
-- Este script é idempotente - pode ser executado múltiplas vezes

BEGIN;

-- ============================================================
-- 1. BACKUP DA TABELA MATRICULAS (OPCIONAL)
-- ============================================================

-- Criar backup da tabela matriculas (descomente se desejar)
-- CREATE TABLE rarcursos.matriculas_backup_20250815 AS 
-- SELECT * FROM rarcursos.matriculas;

-- ============================================================
-- 2. EXTENSÃO DA TABELA MATRICULAS
-- ============================================================

-- Adicionar coluna tipo_acesso se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'rarcursos' 
        AND table_name = 'matriculas' 
        AND column_name = 'tipo_acesso'
    ) THEN
        ALTER TABLE rarcursos.matriculas 
        ADD COLUMN tipo_acesso VARCHAR DEFAULT 'matriculado' 
        CHECK (tipo_acesso IN ('matriculado', 'convidado_curso'));
        
        -- Atualizar registros existentes
        UPDATE rarcursos.matriculas 
        SET tipo_acesso = 'matriculado' 
        WHERE tipo_acesso IS NULL;
        
        -- Tornar coluna obrigatória
        ALTER TABLE rarcursos.matriculas 
        ALTER COLUMN tipo_acesso SET NOT NULL;
        
        RAISE NOTICE '✅ Coluna tipo_acesso adicionada à tabela matriculas';
    ELSE
        RAISE NOTICE '⏭️ Coluna tipo_acesso já existe na tabela matriculas';
    END IF;
END $$;

-- Adicionar coluna adicionado_por se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'rarcursos' 
        AND table_name = 'matriculas' 
        AND column_name = 'adicionado_por'
    ) THEN
        ALTER TABLE rarcursos.matriculas 
        ADD COLUMN adicionado_por UUID REFERENCES rarcursos.users(id);
        
        RAISE NOTICE '✅ Coluna adicionado_por adicionada à tabela matriculas';
    ELSE
        RAISE NOTICE '⏭️ Coluna adicionado_por já existe na tabela matriculas';
    END IF;
END $$;

-- ============================================================
-- 3. CRIAÇÃO DA TABELA AULA_PERMISSOES
-- ============================================================

-- Criar tabela aula_permissoes se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'rarcursos' 
        AND table_name = 'aula_permissoes'
    ) THEN
        CREATE TABLE rarcursos.aula_permissoes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          aula_id UUID NOT NULL REFERENCES rarcursos.aulas(id) ON DELETE CASCADE,
          aluno_id UUID NOT NULL REFERENCES rarcursos.users(id) ON DELETE CASCADE,
          concedida_por UUID NOT NULL REFERENCES rarcursos.users(id),
          tipo_permissao VARCHAR NOT NULL CHECK (tipo_permissao IN ('convite_especifico', 'acesso_curso')),
          criado_em TIMESTAMP DEFAULT NOW(),
          
          UNIQUE(aula_id, aluno_id)
        );
        
        RAISE NOTICE '✅ Tabela aula_permissoes criada';
    ELSE
        RAISE NOTICE '⏭️ Tabela aula_permissoes já existe';
    END IF;
END $$;

-- ============================================================
-- 4. CRIAÇÃO DA TABELA CONVITES_PENDENTES
-- ============================================================

-- Criar tabela convites_pendentes se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'rarcursos' 
        AND table_name = 'convites_pendentes'
    ) THEN
        CREATE TABLE rarcursos.convites_pendentes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR NOT NULL,
          curso_id UUID NOT NULL REFERENCES rarcursos.cursos(id) ON DELETE CASCADE,
          tipo_convite VARCHAR NOT NULL CHECK (tipo_convite IN ('curso_completo', 'aulas_especificas')),
          aula_ids UUID[], -- Array de IDs para convites específicos
          enviado_por UUID NOT NULL REFERENCES rarcursos.users(id),
          mensagem TEXT,
          token VARCHAR UNIQUE NOT NULL,
          aceito BOOLEAN DEFAULT FALSE,
          criado_em TIMESTAMP DEFAULT NOW(),
          expira_em TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
        );
        
        RAISE NOTICE '✅ Tabela convites_pendentes criada';
    ELSE
        RAISE NOTICE '⏭️ Tabela convites_pendentes já existe';
    END IF;
END $$;

-- ============================================================
-- 5. CRIAÇÃO DE ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Índices para tabela matriculas
CREATE INDEX IF NOT EXISTS idx_matriculas_tipo_acesso ON rarcursos.matriculas(tipo_acesso);
CREATE INDEX IF NOT EXISTS idx_matriculas_adicionado_por ON rarcursos.matriculas(adicionado_por);

-- Índices para tabela aula_permissoes
CREATE INDEX IF NOT EXISTS idx_aula_permissoes_aula_id ON rarcursos.aula_permissoes(aula_id);
CREATE INDEX IF NOT EXISTS idx_aula_permissoes_aluno_id ON rarcursos.aula_permissoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aula_permissoes_tipo ON rarcursos.aula_permissoes(tipo_permissao);

-- Índices para tabela convites_pendentes
CREATE INDEX IF NOT EXISTS idx_convites_token ON rarcursos.convites_pendentes(token);
CREATE INDEX IF NOT EXISTS idx_convites_email ON rarcursos.convites_pendentes(email);
CREATE INDEX IF NOT EXISTS idx_convites_curso ON rarcursos.convites_pendentes(curso_id);

-- ============================================================
-- 6. VERIFICAÇÃO DA MIGRAÇÃO
-- ============================================================

-- Verificar estrutura da tabela matriculas
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_schema = 'rarcursos' 
    AND table_name = 'matriculas'
    AND column_name IN ('tipo_acesso', 'adicionado_por');
    
    RAISE NOTICE '📋 Colunas adicionadas à matriculas: %', col_count;
END $$;

-- Verificar tabelas criadas
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'rarcursos' 
    AND table_name IN ('aula_permissoes', 'convites_pendentes');
    
    RAISE NOTICE '📋 Tabelas criadas: %', table_count;
END $$;

-- Verificar índices criados
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'rarcursos' 
    AND indexname LIKE 'idx_%'
    AND (tablename = 'matriculas' OR tablename = 'aula_permissoes' OR tablename = 'convites_pendentes');
    
    RAISE NOTICE '📋 Índices criados: %', index_count;
END $$;

-- ============================================================
-- 7. COMMIT DA TRANSAÇÃO
-- ============================================================

COMMIT;

-- ============================================================
-- MIGRAÇÃO CONCLUÍDA!
-- ============================================================

-- Para verificar se tudo foi criado corretamente, execute:
/*
-- Verificar colunas da tabela matriculas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'rarcursos' AND table_name = 'matriculas'
ORDER BY ordinal_position;

-- Verificar tabelas criadas
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_schema = 'rarcursos' AND table_name = t.table_name) as num_colunas
FROM information_schema.tables t
WHERE table_schema = 'rarcursos' 
AND table_name IN ('matriculas', 'aula_permissoes', 'convites_pendentes')
ORDER BY table_name;

-- Verificar índices criados
SELECT indexname, tablename
FROM pg_indexes 
WHERE schemaname = 'rarcursos' 
AND indexname LIKE 'idx_%'
AND (tablename = 'matriculas' OR tablename = 'aula_permissoes' OR tablename = 'convites_pendentes')
ORDER BY tablename, indexname;
*/