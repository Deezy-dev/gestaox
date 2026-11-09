@echo off
chcp 65001 >nul
title OSDEL TECNOLOGIA - TV Cabo Desktop
cd /d "%~dp0"

echo ========================================================
echo   OSDEL TECNOLOGIA - Gestao de TV Cabo Comunitaria
echo ========================================================
echo.

if exist "electron_app\dist_tv_exe\win-unpacked\OSDEL Gestão - TV Cabo Desktop.exe" (
  echo [1/1] A iniciar executavel OSDEL TV Cabo...
  start "" "electron_app\dist_tv_exe\win-unpacked\OSDEL Gestão - TV Cabo Desktop.exe"
  exit /b 0
)

if not exist "electron_app\dist\index.html" (
  echo [1/2] Compilando sistema web oficial...
  call npm run build
  if exist "dist" (
    xcopy /E /I /Y "dist" "electron_app\dist" >nul
  )
)

echo [2/2] Iniciando TV Cabo Desktop...
call npx --yes electron electron_app\main_tv.js
if %errorlevel% neq 0 (
  echo.
  echo Caso o comando acima falhe, instalando electron...
  cd /d "%~dp0\electron_app" && call npm install && call npx --yes electron main_tv.js
)
