@echo off
@chcp 65001 >nul
title نشر لوحة التحكم على Firebase Hosting
cd /d "%~dp0"

echo ================================================================
echo   🚀 جاري بناء ونشر لوحة التحكم على Firebase Hosting...
echo ================================================================
echo.

echo [1/3] بناء النسخة النهائية للإنتاج...
call npm run build
if %errorlevel% neq 0 (
    echo [خطأ] فشل بناء المشروع! يرجى مراجعة الأخطاء أولاً.
    pause
    exit /b
)

echo.
echo [2/3] تسجيل الدخول إلى Firebase (سيفتح المتصفح تلقائياً)...
call npx -y firebase-tools login --no-localhost
if %errorlevel% neq 0 (
    echo [تنبيه] يرجى إتمام تسجيل الدخول في المتصفح أولاً.
)

echo.
echo [3/3] جاري نشر لوحة التحكم على Firebase Hosting...
call npx firebase-tools deploy --only hosting --project tashteeb-67d13

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo   ✅ تم النشر بنجاح! الموقع متاح على:
    echo   🌐 https://tashteeb-67d13.web.app
    echo   🌐 https://tashteeb-67d13.firebaseapp.com
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo   ⚠️ تعذر النشر، يمكنك مراجعة رسالة الخطأ أعلاه.
    echo ================================================================
)

echo.
pause
