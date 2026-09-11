@echo off
title J.A.R.V.I.S - Cyberpunk Assistant
cd /d "%~dp0"

echo.
echo   ============================================
echo     J.A.R.V.I.S - Cyberpunk Voice Assistant
echo   ============================================
echo.

rem ---- Python dhoondo: python -> py -3 -> python3 ----
set "PYCMD="
where python >nul 2>nul && set "PYCMD=python"
if not defined PYCMD ( where py >nul 2>nul && set "PYCMD=py -3" )
if not defined PYCMD ( where python3 >nul 2>nul && set "PYCMD=python3" )

rem ---- server.py is folder mein hona chahiye ----
if not exist "%~dp0server.py" (
    echo   [ERR] server.py is folder mein nahi mila.
    echo         Folder galat hai ya files incomplete hain.
    echo         Folder: %~dp0
    echo.
    pause
    exit /b 1
)

if defined PYCMD goto :runserver

goto :nopython

:runserver
echo   [OK] Python mila: %PYCMD%
echo   [OK] Local server start ho raha hai...
echo   [OK] App window khud khulegi. Server band karne ke liye is window ko close karo.
echo.
echo   ------------------------------------------------------------
echo     Server messages neeche aayengi:
echo     "[OK] Server running on http://127.0.0.1:8000" dikhna chahiye
echo   ------------------------------------------------------------
echo.
%PYCMD% server.py
echo.
if errorlevel 1 (
    echo   [!!] Server ERROR ke saath band hua (code %ERRORLEVEL%).
    echo        Upar wali red/error text padho - wahi asli problem hai.
    echo        Screenshot le kar dikhao agar samajh na aaye.
) else (
    echo   [OK] Server clean band hua (window close ki gayi).
)
goto :end

:nopython
echo   [!] Python nahi mila - bas browser mein file khol rahe hain.
echo       Koi server nahi chalega.
echo.
echo   [FIX] 1. python.org se Python install karo
echo        2. Installer mein "Add Python to PATH" tick karna (zaroori!)
echo        3. Phir is file ko dobara double-click karo
echo.
echo   [NOTE] Server ke bina:
echo         - config.json ki API keys (Google/DeepSeek/AccuWeather) kaam NAHI karti
echo         - CPU/MEM '--' dikhega, LINK 'BROWSER' mode mein chalega
echo.
start "" "%~dp0index.html"
goto :end

:end
echo.
pause
