@echo off
chcp 65001 >nul
title تشغيل لوحة تحكم المشاريع

:: الانتقال التلقائي إلى مسار المجلد الحالي أينما كان
cd /d "%~dp0"

echo ===================================================
echo        جاري تشغيل لوحة تحكم المشاريع...
echo ===================================================
echo.

:: التحقق من وجود Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطأ] برنامج Node.js غير مثبت على هذا الجهاز!
    echo يرجى تحميله وتثبيته أولاً من الرابط: https://nodejs.org
    echo.
    pause
    exit /b
)

:: التحقق من وجود حزم المشروع
if not exist "node_modules\" (
    echo [تنبيه] جاري تثبيت حزم ومكتبات المشروع لأول مرة...
    call npm install
)

echo يتم الآن فتح لوحة التحكم في المتصفح...
start http://localhost:5173

npm run dev
