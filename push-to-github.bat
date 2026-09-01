@echo off
chcp 65001 >nul
title رفع المشروع إلى GitHub تلقائياً
cd /d "%~dp0"

echo ================================================================
echo        🚀 أداة رفع وتحديث المشروع على GitHub الاحترافية
echo ================================================================
echo.

:: فحص مسار Git
set "GIT_CMD=git"
where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "GIT_CMD=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
    )
)

echo [1/3] تجهيز وحفظ التعديلات...
"%GIT_CMD%" add .
"%GIT_CMD%" commit -m "تحديث لوحة التحكم" >nul 2>nul

echo.
echo [2/3] فحص رابط المستودع على GitHub...
"%GIT_CMD%" remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ================================================================
    echo  الصق رابط المستودع الخاص بك من GitHub أدناه ثم اضغط Enter:
    echo  (مثال: https://github.com/your-name/my-project.git )
    echo ================================================================
    echo.
    set /p REPO_URL="رابط المستودع: "
    "%GIT_CMD%" remote add origin !REPO_URL!
)

echo.
echo [3/3] جاري رفع الكود إلى GitHub...
"%GIT_CMD%" push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo   ✅ تم رفع المشروع إلى GitHub بنجاح تام!
    echo   الآن افتح Vercel.com واربط المستودع ليبدأ النشر التلقائي.
    echo ================================================================
) else (
    echo.
    echo [تنبيه] إذا فتح المتصفح ليطلب تسجيل الدخول إلى GitHub، وافق عليه.
)

pause
