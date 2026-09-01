@echo off
@chcp 65001 >nul
title رفع وتحديث لوحة التحكم سحابياً على GitHub و Vercel
cd /d "%~dp0"

echo ================================================================
echo   🚀 جاري رفع وتحديث المنصة السحابية على GitHub و Vercel...
echo ================================================================
echo.

set "GIT_EXE=git"
where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
    )
)

echo [1/3] تجهيز الملفات والتعديلات...
"%GIT_EXE%" add .

echo [2/3] حفظ التعديلات...
"%GIT_EXE%" commit -m "تأمين المنصة وقفل الحسابات الفرعية وتحديث لوحة المالك" >nul 2>nul

echo [3/3] جاري الرفع السحابي إلى GitHub (origin main)...
echo.
"%GIT_EXE%" push origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo   ✅ تم رفع التحديثات السحابية بنجاح تام!
    echo   🌐 موقعك على Vercel يتم تحديثه الآن تلقائياً بالنسخة المؤمنة.
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo   ⚠️ حدث تنبيه أثناء الرفع إلى GitHub:
    echo ================================================================
    echo   1. إذا فتح لك المتصفح أو نافذة تسجيل الدخول إلى GitHub:
    echo      اضغط على "Sign in with your browser" للموافقة.
    echo.
    echo   2. إذا كان حساب GitHub يطلب Personal Access Token:
    echo      أنشئ رمزاً من: GitHub -> Settings -> Developer settings -> Tokens
    echo.
    echo   3. أعد تشغيل هذا الملف بعد إتمام تسجيل الدخول.
    echo ================================================================
)

echo.
pause
