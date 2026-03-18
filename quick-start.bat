@echo off

REM Quick Start Script for Device Authorization Grant & CIBA Demo
REM Windows batch file version

cls
echo ============================================================
echo   Device Auth ^& CIBA Demo - Quick Start
echo ============================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed
    echo Please install from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i

echo ✓ Node.js found: %NODE_VERSION%
echo ✓ npm found: %NPM_VERSION%
echo.

REM Step 1: Install dependencies
echo → Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo ✓ Dependencies installed
echo.

REM Step 2: Create .env file if it doesn't exist
if not exist ".env" (
    echo → Creating .env file from example...
    if exist ".env.example" (
        type .env.example > .env
        echo ✓ .env file created
        echo   Edit .env to configure Ping Federate URL and credentials
        echo.
    )
)

REM Step 3: Display next steps
echo ============================================================
echo   Setup Complete!
echo ============================================================
echo.
echo Next Steps:
echo.
echo 1. Edit .env file with your configuration:
echo    notepad .env
echo.
echo 2. Start both applications (Option A):
echo    npm run dev
echo.
echo    Or start them separately (Option B):
echo    Terminal 1: npm run start:tv
echo    Terminal 2: npm run start:identity
echo.
echo 3. Open in browser:
echo    TV App:       http://localhost:3000
echo    Identity App: http://localhost:3001
echo.
echo 4. Default credentials for Identity App:
echo    Username: admin
echo    Password: admin123
echo.
echo For more information, see README.md
echo.
pause
