@echo off
@chcp 65001 >nul
title النشر السحابي لمنصة تشطيب برو - Vercel / GitHub Deployer
cd /d "%~dp0"

echo ================================================================
echo   🚀 معالج النشر السحابي التلقائي لمنصة تشطيب برو (Tashteeb Pro)
echo   🌐 الموقع المباشر: https://tashteebpro.com
echo ================================================================
echo.

set "GIT_EXE=git"
where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
    )
)

echo [1/3] فحص وبناء المشروع للتأكد من خلوه من الأخطاء (Vite Build)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ [خطأ] فشل بناء المشروع! يرجى مراجعة الأخطاء أعلاه قبل النشر.
    pause
    exit /b
)

echo.
echo [2/3] تجهيز وحفظ التعديلات في مستودع GitHub...
set /p commit_msg="أدخل وصف التعديل (أو اضغط Enter للافتراضي): "
if "%commit_msg%"=="" set commit_msg=تحديثات الأمان وتطوير النظام

"%GIT_EXE%" add .
"%GIT_EXE%" commit -m "%commit_msg%"

echo.
echo [3/3] جاري الرفع السحابي إلى GitHub Main (Vercel Auto-Deploy)...
echo.
"%GIT_EXE%" push origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo   ✅ تم رفع التحديثات السحابية بنجاح تام!
    echo   ⚡ Vercel يقوم الآن بتحديث كافة النطاقات خلال 30 ثانية:
    echo   🌐 https://tashteebpro.com
    echo   🌐 https://aa1.tashteebpro.com
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo   ⚠️ حدث تنبيه أثناء الرفع إلى GitHub، يرجى مراجعة الرسائل أعلاه.
    echo ================================================================
)

echo.
pause
