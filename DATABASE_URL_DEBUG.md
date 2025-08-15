# 🔍 Debug: URL não sendo salva no banco

**Data:** 14/08/2025  
**Status:** 🔍 **INVESTIGANDO COM LOGS**

## 🎯 **Problema Identificado:**

A aula está sendo criada no banco, mas a coluna `media_url` não está sendo preenchida.

## 🔧 **Logs Adicionados para Debug:**

### **1. Frontend (página):**
```typescript
console.log("🔍 DEBUG - Dados da aula antes de criar:", {
  titulo: aulaData.titulo,
  tipo: aulaData.tipo,
  media_url: aulaData.media_url,  // ← Verificar se tem valor
  hasFile: !!selectedFile
})
```

### **2. Backend (actions):**
```typescript
console.log("🔍 DEBUG - Inserindo aula no banco:", {
  titulo: aulaData.titulo,
  tipo: aulaData.tipo,
  media_url: aulaData.media_url,  // ← Verificar se chegou
  curso_id: aulaData.curso_id,
  modulo_id: aulaData.modulo_id
})

console.log("🔍 DEBUG - Resultado da inserção:", {
  success: !error,
  data: data,  // ← Ver dados salvos
  error: error
})
```

## 🧪 **Como Testar:**

1. **Abra o DevTools** (F12)
2. **Vá para Console**
3. **Acesse** `/minhas-aulas/adicionar`
4. **Preencha formulário** e selecione arquivo
5. **Clique "Criar Aula"**
6. **Observe os logs:**

### **Logs Esperados:**
```
🔍 DEBUG - Dados da aula antes de criar: {
  titulo: "Minha Aula",
  tipo: "video", 
  media_url: "https://rars3.rardevops.com/rarcursos/[userId]/videos/[timestamp]-[arquivo].mp4",
  hasFile: true
}

🔍 DEBUG - Inserindo aula no banco: {
  titulo: "Minha Aula",
  tipo: "video",
  media_url: "https://rars3.rardevops.com/rarcursos/[userId]/videos/[timestamp]-[arquivo].mp4",
  curso_id: "...",
  modulo_id: "..."
}

🔍 DEBUG - Resultado da inserção: {
  success: true,
  data: { id: "...", titulo: "...", media_url: "..." },
  error: null
}
```

## 🔍 **Possíveis Problemas:**

### **1. URL não está sendo gerada:**
- `media_url` aparece como `null` ou `undefined` no primeiro log

### **2. URL não está chegando no backend:**
- `media_url` tem valor no primeiro log, mas não no segundo

### **3. Banco não está salvando:**
- `media_url` tem valor nos dois logs, mas `data.media_url` é null

### **4. Coluna não existe:**
- Erro no insert sobre coluna `media_url`

## 📋 **Checklist de Verificação:**

- [ ] Upload completa com sucesso
- [ ] `uploadedUrl` tem valor no frontend
- [ ] `media_url` tem valor antes de criar aula
- [ ] `media_url` chega no backend
- [ ] Insert no banco não dá erro
- [ ] `data.media_url` tem valor após insert

## 🎯 **Próximos Passos:**

1. **Execute o teste** e copie os logs
2. **Identifique** onde a URL se perde
3. **Corrija** o problema específico

**Me envie os logs do console para identificarmos exatamente onde está o problema!** 🔍