@echo off
chcp 65001 >nul
title لوحة تحكم المشاريع - ويندوز 7
cd /d "%~dp0"

echo =========================================================
echo      جاري تشغيل لوحة تحكم المشاريع على ويندوز 7...
echo =========================================================
echo.
echo [تنبيه] يرجى ترك هذه النافذة مفتوحة أثناء استخدام البرنامج.
echo يمكنك تصغيرها (Minimize) لتبقى تعمل في الخلفية.
echo.

echo جاري فتح المتصفح...
start http://localhost:8080

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$listener = New-Object System.Net.HttpListener; ^
$listener.Prefixes.Add('http://localhost:8080/'); ^
$listener.Prefixes.Add('http://127.0.0.1:8080/'); ^
$listener.Start(); ^
$basePath = (Join-Path (Get-Location) 'dist'); ^
while ($listener.IsListening) { ^
    try { ^
        $context = $listener.GetContext(); ^
        $request = $context.Request; ^
        $response = $context.Response; ^
        $path = $request.Url.LocalPath.TrimStart('/'); ^
        if ([string]::IsNullOrEmpty($path) -or $path -eq '/') { $path = 'index.html'; } ^
        $filePath = Join-Path $basePath $path; ^
        if (-not (Test-Path $filePath)) { $filePath = Join-Path $basePath 'index.html'; } ^
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower(); ^
        $types = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.svg'='image/svg+xml'; '.ico'='image/x-icon' }; ^
        if ($types.ContainsKey($ext)) { $response.ContentType = $types[$ext]; } else { $response.ContentType = 'application/octet-stream'; } ^
        $bytes = [System.IO.File]::ReadAllBytes($filePath); ^
        $response.ContentLength64 = $bytes.Length; ^
        $response.OutputStream.Write($bytes, 0, $bytes.Length); ^
        $response.OutputStream.Close(); ^
    } catch {} ^
}"
