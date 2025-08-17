import requests
import json

def testar_api_alunos():
    """Testa a API de alunos do curso."""
    
    # IDs do cenário
    curso_id = "80374430-e883-43ea-92bf-ca0b2ebde23d"
    
    # URL da API (assumindo que está rodando na porta 3000)
    url = f"http://localhost:3000/api/cursos/{curso_id}/alunos"
    
    print("🧪 Testando API de alunos do curso...")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API funcionando!")
            print(f"📊 Dados retornados:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"❌ Erro na API: {response.status_code}")
            print(f"Resposta: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Erro de conexão - Certifique-se de que a aplicação está rodando (pnpm dev)")
    except requests.exceptions.Timeout:
        print("❌ Timeout - API demorou muito para responder")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

if __name__ == "__main__":
    testar_api_alunos()