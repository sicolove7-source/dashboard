@echo off
chcp 65001 >nul
title Tashteeb Pro - Deploy
cd /d "%~dp0"

echo ============================================
echo   Building the project...
echo ============================================
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed. Check the messages above.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Logging in to Firebase (browser will open)...
echo ============================================
call npx firebase-tools login

echo.
echo ============================================
echo   Deploying: Hosting + Firestore Rules (no Functions needed)...
echo ============================================
call npx firebase-tools deploy --only hosting,firestore:rules --project tashteeb-67d13

echo.
echo ============================================
echo   DONE. Check the messages above for errors.
echo   Live site: https://tashteeb-67d13.web.app
echo ============================================
pause
