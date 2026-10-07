@echo off
chcp 65001 >nul
title Tashteeb Pro - Full Deploy to tashteebpro.com
cd /d "%~dp0"

echo.
echo  ====================================================
echo    TASHTEEB PRO - Full Deployment Script
echo    Target: https://tashteebpro.com
echo  ====================================================
echo.

REM Step 1: Build
echo [1/4] Building the frontend...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed! Fix errors above and try again.
    pause
    exit /b 1
)
echo [OK] Build complete.
echo.

REM Step 2: Login
echo [2/4] Logging in to Firebase...
call npx firebase-tools login --no-localhost
echo.

REM Step 3: Deploy Functions (using quotes for PowerShell compatibility)
echo [3/4] Deploying Cloud Functions...
call npx firebase-tools deploy "--only" "functions" "--project" "tashteeb-67d13"
if errorlevel 1 (
    echo.
    echo [WARNING] Functions deploy failed. Continuing with Hosting + Rules...
    echo           You can re-run just functions later with:
    echo           npx firebase-tools deploy "--only" "functions"
    echo.
)

REM Step 4: Deploy Hosting + Firestore Rules
echo [4/4] Deploying Hosting + Firestore Rules...
call npx firebase-tools deploy "--only" "hosting,firestore:rules" "--project" "tashteeb-67d13"
if errorlevel 1 (
    echo.
    echo [ERROR] Hosting deploy failed. Check messages above.
    pause
    exit /b 1
)

echo.
echo  ====================================================
echo    DEPLOYMENT COMPLETE!
echo.
echo    Firebase URL : https://tashteeb-67d13.web.app
echo    Custom Domain: https://tashteebpro.com (after DNS setup)
echo.
echo    Next step: Add tashteebpro.com in Firebase Console
echo    -> Hosting -> Add custom domain
echo  ====================================================
echo.
pause
