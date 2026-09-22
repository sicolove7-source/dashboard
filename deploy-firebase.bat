@echo off
@chcp 65001 >nul
title النشر السحابي لمنصة تشطيب برو - Firebase Deploy Manager
cd /d "%~dp0"

echo ================================================================
echo   🚀 معالج النشر السحابي لمنصة تشطيب برو (Tashteeb Pro)
echo ================================================================
echo.
echo اختر نوع النشر المطلوب:
echo.
echo   [1] نشر شامل للكل (الواجهة + الدوال السحابية Functions + قواعد الأمان) [موصى به]
echo   [2] نشر الواجهة والتصميم فقط (Hosting Only) [سريع لتعديلات التصميم]
echo   [3] نشر قواعد الأمان والدوال السحابية فقط (Functions + Firestore Rules)
echo   [4] خروج
echo.
set /p choice="أدخل رقم الخيار (الافتراضي 1 واضغط Enter): "

if "%choice%"=="" set choice=1
if "%choice%"=="4" exit /b
if "%choice%"=="2" goto deploy_hosting
if "%choice%"=="3" goto deploy_backend
if "%choice%"=="1" goto deploy_all

:deploy_all
echo.
echo ================================================================
echo   [1/3] فحص تسجيل الدخول إلى Firebase...
echo ================================================================
call npx -y firebase-tools login
echo.
echo ================================================================
echo   [2/3] بناء وتجهيز حزمة الإنتاج (Vite Production Build)...
echo ================================================================
call npm run build
if %errorlevel% neq 0 (
    echo [خطأ] فشل بناء المشروع! يرجى مراجعة الأخطاء أولاً.
    pause
    exit /b
)
echo.
echo ================================================================
echo   [3/3] جاري النشر الشامل (Hosting + Functions + Firestore Rules)...
echo ================================================================
call npx -y firebase-tools deploy --only hosting,functions,firestore:rules,storage --project tashteeb-67d13
goto finish

:deploy_hosting
echo.
echo ================================================================
echo   [1/3] فحص تسجيل الدخول إلى Firebase...
echo ================================================================
call npx -y firebase-tools login
echo.
echo ================================================================
echo   [2/3] بناء النسخة النهائية للواجهة (Vite Build)...
echo ================================================================
call npm run build
if %errorlevel% neq 0 (
    echo [خطأ] فشل بناء المشروع!
    pause
    exit /b
)
echo.
echo ================================================================
echo   [3/3] جاري نشر الواجهة فقط على Firebase Hosting...
echo ================================================================
call npx -y firebase-tools deploy --only hosting --project tashteeb-67d13
goto finish

:deploy_backend
echo.
echo ================================================================
echo   [1/2] فحص تسجيل الدخول إلى Firebase...
echo ================================================================
call npx -y firebase-tools login
echo.
echo ================================================================
echo   [2/2] جاري نشر قواعد الأمان والدوال السحابية (Functions + Rules)...
echo ================================================================
call npx -y firebase-tools deploy --only functions,firestore:rules,storage --project tashteeb-67d13
goto finish

:finish
if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo   ✅ تم النشر السحابي بنجاح تام!
    echo   🌐 الرابط المباشر: https://tashteeb-67d13.web.app
    echo   🌐 النطاق الرسمي:  https://tashteebpro.com
    echo   👑 المشرف العام:  sicolove7@gmail.com
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo   ⚠️ حدث خطأ أو تنبيه أثناء النشر، يرجى مراجعة التفاصيل أعلاه.
    echo ================================================================
)
echo.
pause
