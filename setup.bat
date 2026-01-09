@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   RPX - Raptor X Setup Script
echo ============================================
echo.

:: Configuration
set REPO_URL=https://github.com/ShreyX24/RP-X-temp.git
set REPO_NAME=RPX

:: Check if we're already inside RPX directory
if exist ".git" (
    for %%I in (.) do set CURRENT_DIR=%%~nxI
    echo Current directory: %CD%
    echo.
    goto :update_existing
)

:: Check if RPX folder exists in current directory
if exist "%REPO_NAME%" (
    echo Found existing %REPO_NAME% folder, updating...
    cd "%REPO_NAME%"
    goto :update_existing
)

:: Clone fresh
echo Cloning RPX repository...
git clone %REPO_URL% %REPO_NAME%
if errorlevel 1 (
    echo [ERROR] Failed to clone repository
    pause
    exit /b 1
)
cd "%REPO_NAME%"

:update_existing
echo.
echo [1/4] Pulling latest changes...
git pull origin master
if errorlevel 1 (
    echo [WARNING] Failed to pull, continuing anyway...
)

echo.
echo [2/4] Initializing and updating submodules...
git submodule init
git submodule update --recursive

:: Check if submodules exist, if not clone them
if not exist "Omniparser server\.git" (
    echo Cloning Omniparser server...
    git clone https://github.com/YpS-YpS/OmniLocal.git "Omniparser server"
)

if not exist "preset-manager\.git" (
    echo Cloning preset-manager...
    git clone https://github.com/ShreyX24/preset-manager.git preset-manager
)

echo.
echo [3/4] Installing Gemma Admin dependencies...
if exist "Gemma\admin\package.json" (
    cd Gemma\admin
    call npm install
    if errorlevel 1 (
        echo [WARNING] npm install failed for Gemma admin
    ) else (
        echo [OK] Gemma admin dependencies installed
    )
    cd ..\..
) else (
    echo [WARNING] Gemma/admin/package.json not found
)

echo.
echo [4/4] Installing Preset Manager Admin dependencies...
if exist "preset-manager\admin\package.json" (
    cd preset-manager\admin
    call npm install
    if errorlevel 1 (
        echo [WARNING] npm install failed for preset-manager admin
    ) else (
        echo [OK] Preset Manager admin dependencies installed
    )
    cd ..\..
) else (
    echo [WARNING] preset-manager/admin/package.json not found
)

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Next steps:
echo   1. Install Python dependencies: pip install -e Gemma/backend
echo   2. Install SUT Discovery: pip install -e sut_discovery_service
echo   3. Install Queue Service: pip install -e queue_service
echo   4. Run Service Manager: gemma-manager
echo.
pause
