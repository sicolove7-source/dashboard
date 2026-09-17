@echo off
@chcp 65001 >nul
title نشر وتحديث قواعد ودوال Firebase السحابية
cd /d "%~dp0"

echo ================================================================
echo   🚀 جاري نشر وتحديث قواعد الحماية ودوال Firebase سحابياً...
echo ================================================================
echo.

echo [1/2] التحقق من تسجيل الدخول إلى Firebase...
call npx -y firebase-tools login --reauth
if %errorlevel% neq 0 (
    echo [تنبيه] يرجى إتمام تسجيل الدخول إلى Firebase في المتصفح.
)

echo.
echo [2/2] جاري نشر قواعد Firestore ودوّال Cloud Functions...
call npx -y firebase-tools deploy --only firestore:rules,functions --project tashteeb-67d13

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo   ✅ تم نشر وتحديث قواعد Firebase ودوال Cloud Functions بنجاح!
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo   ⚠️ تعذر النشر التلقائي، يمكنك مراجعة رسالة الخطأ أعلاه.
    echo ================================================================
)

echo.
pause
