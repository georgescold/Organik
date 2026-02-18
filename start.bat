@echo off
cd /d "%~dp0"

echo ==========================================
echo      Lancement de Viralithe...
echo ==========================================

:: Install dependencies if needed
if not exist "node_modules\" (
    echo Installation des dependances...
    call npm install
    if errorlevel 1 (
        echo ERREUR: npm install a echoue.
        pause
        exit /b 1
    )
)

:: Generate Prisma Client
echo Generation du client Prisma...
call npx prisma generate
if errorlevel 1 (
    echo ERREUR: prisma generate a echoue.
    pause
    exit /b 1
)

:: Open browser (will need a refresh if server is slow to start)
start "" "http://localhost:3000"

:: Run the development server
echo Demarrage du serveur...
npm run dev

pause
