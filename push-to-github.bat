@echo off
@chcp 65001 >nul
cd /d "%~dp0"

echo ================================================================
echo   Updating Dashboard on GitHub and Vercel...
echo ================================================================
echo.

set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"

if exist "%GIT_EXE%" (
    echo [1/3] Adding changes...
    "%GIT_EXE%" add .

    echo [2/3] Committing changes...
    "%GIT_EXE%" commit -m "Hide demo accounts and secure superadmin login"

    echo [3/3] Pushing to GitHub...
    "%GIT_EXE%" push origin main
) else (
    echo [1/3] Adding changes...
    git add .

    echo [2/3] Committing changes...
    git commit -m "Hide demo accounts and secure superadmin login"

    echo [3/3] Pushing to GitHub...
    git push origin main
)

echo.
echo ================================================================
echo   Done! Your Vercel website is updating now!
echo ================================================================
pause
