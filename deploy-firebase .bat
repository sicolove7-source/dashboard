@echo off
chcp 65001 >nul
title Tashteeb Pro - Deploy
cd /d "%~dp0"

set LOGFILE=%~dp0deploy-log.txt

echo Starting deploy... this may take a minute or two.
echo Everything will be saved to: %LOGFILE%
echo.

call :main > "%LOGFILE%" 2>&1

echo.
echo ============================================
echo   FINISHED. A file called deploy-log.txt was
echo   created in this same folder. Open it (double
echo   click, opens in Notepad) to read everything,
echo   including any errors, at your own pace.
echo ============================================
echo.
pause
exit /b

:main
echo ============================================
echo   Step 1/3: Building the frontend...
echo ============================================
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend build failed. See messages above.
    exit /b 1
)

echo.
echo ============================================
echo   Step 2/3: Logging in to Firebase...
echo ============================================
call npx firebase-tools login

echo.
echo ============================================
echo   Step 3/3: Deploying Functions FIRST (separately)...
echo ============================================
call npx firebase-tools deploy --only functions --project tashteeb-67d13
if errorlevel 1 (
    echo.
    echo ============================================
    echo   [ERROR] Functions deploy FAILED. This is the
    echo   real problem - copy this whole log file and
    echo   send it over so we can fix the actual cause.
    echo   Hosting/Rules will still deploy below, but Cloud
    echo   Functions will stay OLD/BROKEN until this is fixed.
    echo ============================================
)

echo.
echo ============================================
echo   Deploying Hosting + Firestore Rules + Storage Rules...
echo ============================================
call npx firebase-tools deploy --only hosting,firestore:rules,storage --project tashteeb-67d13

echo.
echo ============================================
echo   DONE. Live site: https://tashteeb-67d13.web.app
echo ============================================
goto :eof
