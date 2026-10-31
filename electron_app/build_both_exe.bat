@echo off
chcp 65001 >nul
title OSDEL TECNOLOGIA · Compilador Ambos os Executáveis (.exe)
cd /d "%~dp0"

echo ========================================================
echo   OSDEL TECNOLOGIA · COMPILAR AMBOS OS EXECUTÁVEIS (.EXE)
echo   1) OSDEL Fibra Óptica Desktop (.exe)
echo   2) OSDEL TV por Cabo Desktop (.exe)
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
echo 3. Compilando Executável de Fibra Óptica...
call npm run build:fibra
if %errorlevel% neq 0 (
  call npx --yes electron-builder --config electron-builder-fibra.json
)

echo.
echo 4. Compilando Executável de TV por Cabo...
call npm run build:tv
if %errorlevel% neq 0 (
  call npx --yes electron-builder --config electron-builder-tv.json
)

echo.
echo ========================================================
echo   AMBAS AS COMPILAÇÕES FORAM CONCLUÍDAS COM SUCESSO!
echo   1. Fibra:   electron_app\dist_fibra_exe\OSDEL_Fibra_Desktop_Setup_1.0.0.exe
echo   2. TV Cabo: electron_app\dist_tv_exe\OSDEL_TV_Cabo_Desktop_Setup_1.0.0.exe
echo ========================================================
pause
