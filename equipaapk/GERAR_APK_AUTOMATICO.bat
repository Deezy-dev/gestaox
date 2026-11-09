@echo off
chcp 65001 >nul
title Compilador de APK - OSDEL Cliente
cd /d "%~dp0"

echo ========================================================
echo   OSDEL TECNOLOGIA - Gerador de APK Android Cliente
echo ========================================================
echo.

if not exist "dist\index.html" (
  echo [1/3] Compilando arquivos Web...
  call npm run build
)

echo [2/3] Sincronizando com Android...
call npx cap sync android

echo [3/3] Gerando APK Android...
cd android
call gradlew.bat assembleDebug

if exist "app\build\outputs\apk\debug\app-debug.apk" (
  copy /Y "app\build\outputs\apk\debug\app-debug.apk" "..\OSDEL_Cliente.apk"
  echo.
  echo ========================================================
  echo   SUCESSO! APK gerado com sucesso:
  echo   %~dp0OSDEL_Cliente.apk
  echo ========================================================
) else (
  echo.
  echo Se o Gradle pedir configuracao de SDK:
  echo 1. Abra o Android Studio
  echo 2. Abra a pasta "%~dp0android"
  echo 3. Va ao menu Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
)

pause
