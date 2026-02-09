@echo off
setlocal

:: RPX Setup Launcher - Thin wrapper that calls setup.py
:: Usage: setup.bat [--skip-clone | --install-only | -s]

:: Check Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.10+ and add to PATH.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Node.js not found. npm install steps will fail.
    echo Download from: https://nodejs.org/
    echo.
)

:: Run the Python setup script, passing all arguments through
python "%~dp0setup.py" %*

pause
