@echo off
setlocal EnableDelayedExpansion
REM ============================================================================
REM  RAPTOR X SUT Client Restarter
REM  Called after updates to restart the SUT client service
REM ============================================================================

title RPX Restarter
color 0A

set "SCRIPT_DIR=%~dp0"
set "LOG_FILE=%SCRIPT_DIR%restarter.log"

REM Start fresh log
echo ============================================ > "%LOG_FILE%"
echo  Restarter started at %date% %time% >> "%LOG_FILE%"
echo ============================================ >> "%LOG_FILE%"

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║              RAPTOR X SUT CLIENT RESTARTER                   ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║  This script will restart the SUT client after updates.     ║
echo  ║  Please wait...                                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

REM Step 1: Wait 5 seconds for calling process to exit
echo [1/6] Waiting 5 seconds for processes to cleanup...
echo [1/6] Waiting 5 seconds... >> "%LOG_FILE%"
timeout /t 5 /nobreak > nul
echo      Done.
echo.

REM Step 2: Kill any existing sut-client processes
echo [2/6] Stopping existing SUT client processes...
echo [2/6] Killing processes... >> "%LOG_FILE%"

taskkill /F /IM "sut-client.exe" 2>nul
if !ERRORLEVEL! EQU 0 (
    echo      Killed sut-client.exe
    echo      Killed sut-client.exe >> "%LOG_FILE%"
) else (
    echo      No sut-client.exe found
    echo      No sut-client.exe found >> "%LOG_FILE%"
)

REM Also try to kill Python processes running sut_client
for /f "tokens=2" %%i in ('wmic process where "commandline like '%%sut_client%%' and name='python.exe'" get processid 2^>nul ^| findstr /r "[0-9]"') do (
    taskkill /F /PID %%i 2>nul
    echo      Killed Python process %%i
    echo      Killed Python process %%i >> "%LOG_FILE%"
)

echo      Process cleanup done >> "%LOG_FILE%"
echo      Done.
echo.

REM Step 3: Reinstall package (pip install -e .)
echo [3/6] Reinstalling sut_client package...
echo [3/6] Running pip install -e . >> "%LOG_FILE%"

pip install -e "%SCRIPT_DIR%." >nul 2>&1
echo      pip install exit code: !ERRORLEVEL! >> "%LOG_FILE%"
echo      pip install done.
echo.

REM Step 4: Clear Python cache
echo [4/6] Clearing Python cache...
echo [4/6] Clearing cache... >> "%LOG_FILE%"

set "SUT_CLIENT_DIR=%SCRIPT_DIR%src\sut_client"

if exist "%SUT_CLIENT_DIR%" (
    for /d /r "%SUT_CLIENT_DIR%" %%d in (__pycache__) do (
        if exist "%%d" (
            rd /s /q "%%d" 2>nul
            echo      Cleared: %%d
        )
    )
)

del /s /q "%SUT_CLIENT_DIR%\*.pyc" 2>nul

echo      Cache cleared.
echo      Cache cleared >> "%LOG_FILE%"
echo.

REM Step 5: Start SUT client (read saved launch mode)
echo [5/6] Starting SUT client...
echo [5/6] Starting SUT client... >> "%LOG_FILE%"

REM Read launch command from plain text file (written by sut-client on startup)
set "LAUNCH_CMD="
if exist "%SCRIPT_DIR%launch_cmd.txt" (
    set /p LAUNCH_CMD=<"%SCRIPT_DIR%launch_cmd.txt"
    echo      Read from launch_cmd.txt: !LAUNCH_CMD! >> "%LOG_FILE%"
)
if not defined LAUNCH_CMD set "LAUNCH_CMD=sut-client"

echo      Launch command: !LAUNCH_CMD!
echo      Launch command: !LAUNCH_CMD! >> "%LOG_FILE%"

where sut-client >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo      Found sut-client in PATH
    echo      Found sut-client in PATH >> "%LOG_FILE%"
    start "SUT Client" cmd /c "!LAUNCH_CMD!"
) else (
    echo      Running as Python module...
    echo      sut-client NOT in PATH, falling back to python -m >> "%LOG_FILE%"
    start "SUT Client" cmd /c "python -m sut_client"
)

echo.

REM Step 6: Wait for new SUT client to become healthy
echo [6/6] Waiting for SUT client to come online...
echo [6/6] Waiting for health... >> "%LOG_FILE%"

set "HEALTHY=0"
for /L %%i in (1,1,24) do (
    if !HEALTHY! EQU 0 (
        timeout /t 5 /nobreak > nul
        curl -s -o nul -w "%%{http_code}" http://127.0.0.1:8080/health 2>nul | findstr "200" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            set "HEALTHY=1"
            echo      SUT client is healthy!
            echo      Healthy after attempt %%i >> "%LOG_FILE%"
        ) else (
            echo      Attempt %%i/24 - not ready yet...
        )
    )
)

echo.
if !HEALTHY! EQU 1 (
    echo  ╔══════════════════════════════════════════════════════════════╗
    echo  ║                    RESTART COMPLETE!                         ║
    echo  ╚══════════════════════════════════════════════════════════════╝
    echo RESTART COMPLETE at %date% %time% >> "%LOG_FILE%"
) else (
    echo  ╔══════════════════════════════════════════════════════════════╗
    echo  ║              RESTART FAILED - SUT NOT HEALTHY                ║
    echo  ╚══════════════════════════════════════════════════════════════╝
    echo.
    echo  SUT client did not respond to health checks within 120 seconds.
    echo RESTART FAILED at %date% %time% >> "%LOG_FILE%"
)
echo.

REM Auto-close after 5 seconds
echo This window will close in 5 seconds...
timeout /t 5 /nobreak > nul
exit
