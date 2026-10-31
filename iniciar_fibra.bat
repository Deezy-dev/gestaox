@echo off
chcp 65001 >nul
title OSDEL TECNOLOGIA - Internet Fibra Desktop
cd /d "%~dp0"

echo ========================================================
echo   OSDEL TECNOLOGIA - Gestao de Internet Fibra Optica FTTH
echo ========================================================
echo.

if exist "electron_app\dist_fibra_exe\win-unpacked\OSDEL Gestão - Fibra Óptica Desktop.exe" (
  echo [1/1] A iniciar executavel OSDEL Fibra Optica...
  start "" "electron_app\dist_fibra_exe\win-unpacked\OSDEL Gestão - Fibra Óptica Desktop.exe"
  exit /b 0
)

if not exist "electron_app\dist\index.html" (
  echo [1/2] Compilando sistema web oficial...
  call npm run build
  if exist "dist" (
    xcopy /E /I /Y "dist" "electron_app\dist" >nul
  )
)

echo [2/2] Iniciando Fibra Desktop...
call npx --yes electron electron_app\main_fibra.js
if %errorlevel% neq 0 (
  echo.
  echo Caso o comando acima falhe, instalando electron...
  cd /d "%~dp0\electron_app" && call npm install && call npx --yes electron main_fibra.js
)
