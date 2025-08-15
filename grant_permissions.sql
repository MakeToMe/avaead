-- SQL para conceder permissões completas ao usuário postgres no schema rarcursos

-- Conceder todas as permissões no schema rarcursos
GRANT ALL PRIVILEGES ON SCHEMA rarcursos TO postgres;

-- Conceder todas as permissões em todas as tabelas existentes no schema rarcursos
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA rarcursos TO postgres;

-- Conceder todas as permissões em todas as sequências no schema rarcursos
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA rarcursos TO postgres;

-- Conceder permissões para tabelas futuras (caso sejam criadas)
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA rarcursos GRANT ALL PRIVILEGES ON TABLES TO postgres;

-- Conceder permissões para sequências futuras
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA rarcursos GRANT ALL PRIVILEGES ON SEQUENCES TO postgres;

-- Permitir criar tabelas no schema
GRANT CREATE ON SCHEMA rarcursos TO postgres;

-- Verificar as permissões concedidas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'rarcursos'
ORDER BY tablename;