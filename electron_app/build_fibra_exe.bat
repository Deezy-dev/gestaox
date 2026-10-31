@echo off
chcp 65001 >nul
title OSDEL TECNOLOGIA · Compilador Fibra Desktop (.exe)
cd /d "%~dp0"

echo ========================================================
echo   OSDEL TECNOLOGIA · COMPILADOR DESKTOP FIBRA (.EXE)
echo ========================================================
echo.

echo 1. Sincronizando bundle do sistema React/Vite completo...
call node sync_dist.js
if %errorlevel% neq 0 (
  echo [ERRO] Falha ao sincronizar o bundle web. Verifique o Node.js.
  pause
  exit /b 1
)

echo.
echo 2. Verificando dependências do Electron...
if not exist "node_modules\electron" (
  echo Instalando electron e electron-builder...
  call npm install
)

echo.
echo 3. Gerando Executável .exe para Internet Fibra Óptica FTTH...
call npm run build:fibra
if %errorlevel% neq 0 (
  echo.
  echo [AVISO] Se o electron-builder falhar por falta de dependências globais, tente:
  echo npx --yes electron-builder --config electron-builder-fibra.json
  call npx --yes electron-builder --config electron-builder-fibra.json
)

echo.
echo ========================================================
echo   COMPILAÇÃO CONCLUÍDA COM SUCESSO!
echo   Executável gerado na pasta:
echo   electron_app\dist_fibra_exe\OSDEL_Fibra_Desktop_Setup_1.0.0.exe
echo ========================================================
pause
