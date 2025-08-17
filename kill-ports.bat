@echo off
echo 🔄 Matando processos Node.js...
taskkill /IM node.exe /F 2>nul
if %errorlevel% == 0 (
    echo ✅ Processos Node.js finalizados
) else (
    echo ℹ️ Nenhum processo Node.js encontrado
)

echo 🔄 Matando processos na porta 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 2^>nul') do (
    taskkill /f /pid %%a 2>nul
    if !errorlevel! == 0 echo ✅ Processo na porta 3000 finalizado
)

echo 🔄 Matando processos na porta 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 2^>nul') do (
    taskkill /f /pid %%a 2>nul
    if !errorlevel! == 0 echo ✅ Processo na porta 3001 finalizado
)

echo ✨ Limpeza concluída! Agora você pode executar: pnpm dev
pause