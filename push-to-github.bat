@echo off
chcp 65001 >nul
title رفع المشروع إلى GitHub تلقائياً
cd /d "%~dp0"

echo ================================================================
echo        🚀 أداة رفع وتحديث المشروع على GitHub الاحترافية
echo ================================================================
echo.

:: 1. فحص وجود Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "PATH=%PATH%;C:\Program Files\Git\cmd"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Git\cmd"
    ) else (
        echo [!] Git غير مثبت على جهازك بعد.
        echo جاري فتح صفحة تحميل Git الرسمية...
        start https://git-scm.com/download/win
        echo بعد تثبيت Git، أعد تشغيل هذا الملف فقط.
        pause
        exit /b
    )
)

echo [1/4] تجهيز مستودع Git المحلي...
if not exist ".git" (
    git init
    git branch -M main
)

echo [2/4] إضافة وتجهيز جميع ملفات المشروع (مع استبعاد الملفات الزائدة)...
git add .

echo [3/4] حفظ التعديلات (Commit)...
git commit -m "تحديث لوحة التحكم والمشاريع" >nul 2>nul

:: 4. فحص الرابط السحابي
git remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ================================================================
    echo  يرجى لصق رابط المستودع الجديد من GitHub الخاص بك أدناه:
    echo  (مثال: https://github.com/your-username/dashboard.git )
    echo ================================================================
    set /p REPO_URL="رابط المستودع: "
    if "!REPO_URL!"=="" (
        echo [خطأ] لم يتم إدخال الرابط!
        pause
        exit /b
    )
    git remote add origin !REPO_URL!
)

echo.
echo [4/4] جاري رفع الكود سحابياً إلى GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo   ✅ تم رفع المشروع بالكامل إلى GitHub بنجاح!
    echo   الآن يمكنك ربطه بـ Vercel ليتم التحديث التلقائي دوماً.
    echo ================================================================
) else (
    echo.
    echo [ملاحظة] إذا طلب منك GitHub تسجيل الدخول، وافق في المتصفح ثم أعد المحاولة.
)

pause
