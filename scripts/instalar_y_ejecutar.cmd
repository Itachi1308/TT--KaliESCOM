@echo off
setlocal

cd /d "%~dp0\.."

echo ===============================================
echo  ESCOM EVENTOS - Instalacion y Ejecucion

echo ===============================================

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado o no esta en el PATH.
  pause
  exit /b 1
)

echo [1/3] Instalando dependencias...
call npm install
if errorlevel 1 (
  echo [ERROR] Fallo npm install.
  pause
  exit /b 1
)

echo [2/3] Inicializando base de datos...
call npm run db:init
if errorlevel 1 (
  echo [ERROR] Fallo inicializacion de base de datos.
  pause
  exit /b 1
)

echo [3/3] Iniciando servidor en http://localhost:3000 ...
call npm start

endlocal
