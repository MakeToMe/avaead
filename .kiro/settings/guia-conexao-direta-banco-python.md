# Guia: Conexão Direta com Banco de Dados usando Python

Este guia mostra como criar um serviço Python para conectar diretamente ao banco de dados e inserir dados de arquivos, baseado na implementação realizada neste projeto.

## 📋 Visão Geral

O serviço Python permite:
- Conectar diretamente ao PostgreSQL/Supabase
- Ler dados de arquivos JSON
- Inserir dados em lote no banco
- Gerenciar transações e rollbacks
- Validar e normalizar dados antes da inserção

## 🛠️ Dependências Necessárias

### 1. Instalar Dependências Python

```bash
pip install psycopg2-binary python-dotenv supabase
```

### 2. Arquivo requirements.txt
```txt
psycopg2-binary==2.9.7
python-dotenv==1.0.0
supabase==1.0.4
```

## 🔧 Estrutura do Projeto

```
projeto/
├── .env                          # Variáveis de ambiente
├── scripts/
│   ├── inserir_dados_postgres.py # Conexão direta PostgreSQL
│   ├── inserir_dados_supabase.py # Conexão via SDK Supabase
│   └── requirements.txt          # Dependências Python
└── dados/
    └── dados.json               # Arquivo com dados para inserir
```

## 🔐 Configuração de Ambiente (.env)

```env
# PostgreSQL/Supabase - Conexão Direta
POSTGRES_URL="postgres://user:password@host:port/database"
POSTGRES_HOST="db.projeto.supabase.co"
POSTGRES_DATABASE="postgres"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="sua_senha_aqui"

# Supabase - SDK
NEXT_PUBLIC_SUPABASE_URL="https://projeto.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sua_service_role_key_aqui"
```

## 📝 Implementação - Conexão PostgreSQL Direta

### 1. Script Base (inserir_dados_postgres.py)

```python
import os
import sys
from pathlib import Path
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
import json
from urllib.parse import urlparse

# Carrega variáveis de ambiente
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path, override=True)

def get_db_config():
    """Extrai configuração do banco de dados das variáveis de ambiente."""
    postgres_url = os.getenv('POSTGRES_URL')
    
    if postgres_url:
        # Extrai parâmetros da URL de conexão
        result = urlparse(postgres_url)
        return {
            'host': result.hostname,
            'database': result.path[1:],  # Remove a barra inicial
            'user': result.username,
            'password': result.password,
            'port': result.port or 5432
        }
    else:
        # Usa parâmetros individuais
        return {
            'host': os.getenv('POSTGRES_HOST'),
            'database': os.getenv('POSTGRES_DATABASE'),
            'user': os.getenv('POSTGRES_USER'),
            'password': os.getenv('POSTGRES_PASSWORD'),
            'port': '5432'
        }

def get_connection():
    """Estabelece conexão com o banco de dados PostgreSQL."""
    try:
        db_config = get_db_config()
        conn = psycopg2.connect(**db_config)
        conn.autocommit = False
        print(f"✅ Conectado ao banco: {db_config['host']}/{db_config['database']}")
        return conn
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {str(e)}")
        sys.exit(1)

def verificar_conexao(conn):
    """Verifica se a conexão está ativa."""
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()[0]
            print(f"📊 Versão do PostgreSQL: {version}")
            return True
    except Exception as e:
        print(f"❌ Erro ao verificar conexão: {e}")
        return False

def carregar_dados_json(arquivo_path):
    """Carrega dados do arquivo JSON."""
    try:
        with open(arquivo_path, 'r', encoding='utf-8') as f:
            dados = json.load(f)
        print(f"📁 Carregados {len(dados)} registros do arquivo {arquivo_path}")
        return dados
    except Exception as e:
        print(f"❌ Erro ao carregar JSON: {e}")
        return None

def inserir_dados(conn, dados, tabela, campos):
    """
    Insere dados na tabela especificada.
    
    Args:
        conn: Conexão com o banco
        dados: Lista de dicionários com os dados
        tabela: Nome da tabela
        campos: Lista de campos da tabela
    """
    if not dados:
        print("⚠️ Nenhum dado para inserir")
        return False

    # Monta a query de inserção
    placeholders = ', '.join([f'%({campo})s' for campo in campos])
    campos_str = ', '.join(campos)
    
    insert_sql = f"""
        INSERT INTO {tabela} ({campos_str})
        VALUES ({placeholders})
    """

    total = len(dados)
    inseridos = 0
    erros = 0

    try:
        with conn.cursor() as cur:
            for i, registro in enumerate(dados, 1):
                try:
                    # Valida se todos os campos obrigatórios estão presentes
                    registro_limpo = {campo: registro.get(campo) for campo in campos}
                    
                    cur.execute(insert_sql, registro_limpo)
                    inseridos += 1
                    
                    # Progress feedback
                    if i % 10 == 0:
                        print(f"📝 Processados {i}/{total} registros...")
                        
                except Exception as e:
                    erros += 1
                    print(f"❌ Erro no registro {i}: {e}")
                    # Continue com os próximos registros
                    
            # Commit da transação
            conn.commit()
            print(f"✅ Inserção concluída: {inseridos}/{total} registros inseridos")
            if erros > 0:
                print(f"⚠️ {erros} registros com erro")
                
        return inseridos > 0
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Erro geral na inserção: {e}")
        return False

def main():
    """Função principal."""
    print("=" * 60)
    print("🚀 INÍCIO DO PROCESSO DE INSERÇÃO DE DADOS")
    print("=" * 60)

    # 1. Conectar ao banco
    print("\n1️⃣ Conectando ao banco de dados...")
    conn = get_connection()

    # 2. Verificar conexão
    print("\n2️⃣ Verificando conexão...")
    if not verificar_conexao(conn):
        print("❌ Falha na verificação da conexão")
        conn.close()
        sys.exit(1)

    # 3. Carregar dados
    print("\n3️⃣ Carregando dados do arquivo...")
    dados_path = Path(__file__).parent / 'dados.json'
    dados = carregar_dados_json(dados_path)
    
    if not dados:
        print("❌ Não foi possível carregar os dados")
        conn.close()
        sys.exit(1)

    # 4. Inserir dados
    print("\n4️⃣ Inserindo dados na tabela...")
    
    # CONFIGURE AQUI: Nome da tabela e campos
    TABELA = 'sua_tabela'
    CAMPOS = ['campo1', 'campo2', 'campo3']  # Ajuste conforme sua tabela
    
    if inserir_dados(conn, dados, TABELA, CAMPOS):
        print("\n✅ Processo concluído com SUCESSO!")
    else:
        print("\n❌ Processo concluído com ERROS!")

    # 5. Fechar conexão
    conn.close()
    print("\n" + "=" * 60)
    print("🏁 FIM DO PROCESSO")
    print("=" * 60)

if __name__ == "__main__":
    main()
```

## 📝 Implementação - SDK Supabase

### 2. Script com SDK Supabase (inserir_dados_supabase.py)

```python
import os
import sys
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv
import json

# Carrega variáveis de ambiente
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path, override=True)

def get_supabase_client():
    """Cria cliente Supabase."""
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("❌ Variáveis de ambiente do Supabase não encontradas")
        sys.exit(1)

    try:
        supabase = create_client(url, key)
        print("✅ Conexão com Supabase estabelecida")
        return supabase
    except Exception as e:
        print(f"❌ Erro ao conectar ao Supabase: {str(e)}")
        sys.exit(1)

def verificar_conexao_supabase(supabase, tabela):
    """Verifica conexão com Supabase."""
    try:
        response = supabase.table(tabela).select('*', count='exact').limit(1).execute()
        count = response.count if hasattr(response, 'count') else 0
        print(f"📊 Tabela '{tabela}' acessível. Total de registros: {count}")
        return True
    except Exception as e:
        print(f"❌ Erro ao verificar tabela: {str(e)}")
        return False

def inserir_dados_supabase(supabase, dados, tabela, batch_size=10):
    """
    Insere dados usando o SDK do Supabase.
    
    Args:
        supabase: Cliente Supabase
        dados: Lista de dicionários com os dados
        tabela: Nome da tabela
        batch_size: Tamanho do lote para inserção
    """
    if not dados:
        print("⚠️ Nenhum dado para inserir")
        return False

    total = len(dados)
    inseridos = 0
    
    try:
        # Inserir em lotes
        for i in range(0, total, batch_size):
            batch = dados[i:i + batch_size]
            print(f"📝 Inserindo lote {i//batch_size + 1}: {len(batch)} registros...")
            
            try:
                response = supabase.table(tabela).insert(batch).execute()
                
                if hasattr(response, 'error') and response.error:
                    print(f"❌ Erro no lote: {response.error}")
                    continue
                
                if response.data:
                    inseridos += len(response.data)
                    print(f"✅ Lote inserido: {len(response.data)} registros")
                    
            except Exception as e:
                print(f"❌ Erro no lote {i//batch_size + 1}: {str(e)}")
                continue
        
        print(f"✅ Inserção concluída: {inseridos}/{total} registros")
        return inseridos > 0
        
    except Exception as e:
        print(f"❌ Erro geral na inserção: {str(e)}")
        return False

def main():
    """Função principal para Supabase."""
    print("=" * 60)
    print("🚀 INSERÇÃO DE DADOS - SUPABASE SDK")
    print("=" * 60)

    # 1. Conectar ao Supabase
    print("\n1️⃣ Conectando ao Supabase...")
    supabase = get_supabase_client()

    # 2. Configurar tabela
    TABELA = 'sua_tabela'  # CONFIGURE AQUI
    
    print(f"\n2️⃣ Verificando tabela '{TABELA}'...")
    if not verificar_conexao_supabase(supabase, TABELA):
        print("❌ Falha ao acessar a tabela")
        sys.exit(1)

    # 3. Carregar dados
    print("\n3️⃣ Carregando dados...")
    dados_path = Path(__file__).parent / 'dados.json'
    
    try:
        with open(dados_path, 'r', encoding='utf-8') as f:
            dados = json.load(f)
        print(f"📁 Carregados {len(dados)} registros")
    except Exception as e:
        print(f"❌ Erro ao carregar dados: {e}")
        sys.exit(1)

    # 4. Inserir dados
    print("\n4️⃣ Inserindo dados...")
    if inserir_dados_supabase(supabase, dados, TABELA):
        print("\n✅ Processo concluído com SUCESSO!")
    else:
        print("\n❌ Processo concluído com ERROS!")

    print("\n" + "=" * 60)
    print("🏁 FIM DO PROCESSO")
    print("=" * 60)

if __name__ == "__main__":
    main()
```

## 📊 Exemplo de Arquivo JSON (dados.json)

```json
[
  {
    "campo1": "valor1",
    "campo2": "valor2",
    "campo3": "valor3"
  },
  {
    "campo1": "valor4",
    "campo2": "valor5",
    "campo3": "valor6"
  }
]
```

## 🚀 Como Usar

### 1. Preparação
```bash
# Instalar dependências
pip install -r requirements.txt

# Configurar .env com credenciais do banco
cp .env.example .env
# Editar .env com suas credenciais
```

### 2. Execução
```bash
# Usando conexão direta PostgreSQL
python scripts/inserir_dados_postgres.py

# Usando SDK Supabase
python scripts/inserir_dados_supabase.py
```

## 🔧 Personalização

### 1. Adaptar para sua tabela
- Altere a variável `TABELA` com o nome da sua tabela
- Altere a lista `CAMPOS` com os campos da sua tabela
- Ajuste o arquivo JSON com a estrutura dos seus dados

### 2. Validação de dados
```python
def validar_registro(registro):
    """Valida um registro antes da inserção."""
    # Campos obrigatórios
    campos_obrigatorios = ['campo1', 'campo2']
    
    for campo in campos_obrigatorios:
        if not registro.get(campo):
            raise ValueError(f"Campo obrigatório '{campo}' não encontrado")
    
    # Validações específicas
    if len(registro.get('campo1', '')) > 100:
        raise ValueError("Campo1 muito longo")
    
    return True
```

### 3. Tratamento de erros específicos
```python
def tratar_erro_especifico(erro):
    """Trata erros específicos do banco."""
    if 'duplicate key' in str(erro):
        return "Registro duplicado - ignorando"
    elif 'foreign key' in str(erro):
        return "Referência inválida - verificar dados"
    else:
        return f"Erro desconhecido: {erro}"
```

## 🛡️ Boas Práticas

### 1. Segurança
- ✅ Use variáveis de ambiente para credenciais
- ✅ Use Service Role Key do Supabase (não a chave anônima)
- ✅ Valide dados antes da inserção
- ✅ Use transações para operações em lote

### 2. Performance
- ✅ Insira dados em lotes (10-100 registros por vez)
- ✅ Use prepared statements
- ✅ Faça commit periódico em operações grandes
- ✅ Monitore o progresso com logs

### 3. Confiabilidade
- ✅ Implemente retry para erros transientes
- ✅ Faça backup antes de operações grandes
- ✅ Registre logs detalhados
- ✅ Teste com dados pequenos primeiro

## 🔍 Troubleshooting

### Erro de Conexão
```
❌ Erro ao conectar ao banco: connection refused
```
**Solução**: Verificar credenciais e conectividade de rede

### Erro de Permissão
```
❌ Erro: permission denied for table
```
**Solução**: Usar Service Role Key ou verificar permissões RLS

### Erro de Schema
```
❌ Erro: column "campo" does not exist
```
**Solução**: Verificar estrutura da tabela e nomes dos campos

Este guia fornece uma base sólida para implementar conexões diretas com banco de dados usando Python em qualquer projeto!