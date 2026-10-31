@echo off
chcp 65001 >nul
title OSDEL TECNOLOGIA - TV Cabo Desktop
cd /d "%~dp0"

echo ========================================================
echo   OSDEL TECNOLOGIA - Gestao de TV Cabo Comunitaria
echo ========================================================
echo.

if exist "dist_tv_exe\win-unpacked\OSDEL Gestão - TV Cabo Desktop.exe" (
  echo [1/1] A iniciar aplicativo executavel OSDEL TV Cabo...
  start "" "dist_tv_exe\win-unpacked\OSDEL Gestão - TV Cabo Desktop.exe"
  exit /b 0
)

if exist "OSDEL Gestão - TV Cabo Desktop.exe" (
  start "" "OSDEL Gestão - TV Cabo Desktop.exe"
  exit /b 0
)

if not exist "dist\index.html" (
  echo [1/2] Sincronizando sistema web oficial...
  call node sync_dist.js
)

echo [2/2] Iniciando TV Cabo Desktop via Electron...
call npx --yes electron main_tv.js
if %errorlevel% neq 0 (
  echo.
  echo Instalando electron localmente...
  call npm install
  call npx --yes electron main_tv.js
)
