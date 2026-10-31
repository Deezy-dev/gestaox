@echo off
chcp 65001 >nul
title OSDEL TECNOLOGIA - Internet Fibra Desktop
cd /d "%~dp0"

echo ========================================================
echo   OSDEL TECNOLOGIA - Gestao de Internet Fibra Optica FTTH
echo ========================================================
echo.

if exist "dist_fibra_exe\win-unpacked\OSDEL Gestão - Fibra Óptica Desktop.exe" (
  echo [1/1] A iniciar aplicativo executavel OSDEL Fibra Optica...
  start "" "dist_fibra_exe\win-unpacked\OSDEL Gestão - Fibra Óptica Desktop.exe"
  exit /b 0
)

if exist "OSDEL Gestão - Fibra Óptica Desktop.exe" (
  start "" "OSDEL Gestão - Fibra Óptica Desktop.exe"
  exit /b 0
)

if not exist "dist\index.html" (
  echo [1/2] Sincronizando sistema web oficial...
  call node sync_dist.js
)

echo [2/2] Iniciando Fibra Desktop via Electron...
call npx --yes electron main_fibra.js
if %errorlevel% neq 0 (
  echo.
  echo Instalando electron localmente...
  call npm install
  call npx --yes electron main_fibra.js
)
