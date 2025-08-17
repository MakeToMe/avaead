#!/usr/bin/env python3
"""
Script para testar a API de permissões diretamente
"""

import requests
import json

def test_permissoes_api():
    print("🧪 TESTANDO API DE PERMISSÕES")
    print("=" * 50)
    
    # URL da API
    aula_id = "5d9c24b5-d08a-4251-9416-4003bee1f6e5"
    url = f"http://localhost:3000/api/aulas/{aula_id}/permissoes"
    
    print(f"📡 Fazendo requisição GET para: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ Resposta JSON válida:")
                print(json.dumps(data, indent=2, ensure_ascii=False))
            except json.JSONDecodeError as e:
                print(f"❌ Erro ao decodificar JSON: {e}")
                print(f"📄 Conteúdo da resposta: {response.text[:500]}...")
        else:
            print(f"❌ Erro na API:")
            print(f"📄 Conteúdo: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro na requisição: {e}")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    test_permissoes_api()