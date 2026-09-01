using System;
using System.IO;
using System.Net;
using System.Diagnostics;
using System.Threading;
using System.Collections.Generic;

class WebServer
{
    static readonly Dictionary<string, string> MimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        { ".html", "text/html; charset=utf-8" },
        { ".js", "application/javascript; charset=utf-8" },
        { ".css", "text/css; charset=utf-8" },
        { ".json", "application/json; charset=utf-8" },
        { ".png", "image/png" },
        { ".jpg", "image/jpeg" },
        { ".jpeg", "image/jpeg" },
        { ".gif", "image/gif" },
        { ".svg", "image/svg+xml" },
        { ".ico", "image/x-icon" },
        { ".woff", "font/woff" },
        { ".woff2", "font/woff2" },
        { ".ttf", "font/ttf" }
    };

    static void Main(string[] args)
    {
        Console.Title = "لوحة تحكم المشاريع - سيرفر محلي";
        Console.OutputEncoding = System.Text.Encoding.UTF8;

        string currentDir = AppDomain.CurrentDomain.BaseDirectory;
        string distPath = Path.Combine(currentDir, "dist");

        if (!Directory.Exists(distPath))
        {
            distPath = currentDir;
        }

        int port = 5173;
        HttpListener listener = null;

        for (int p = 5173; p <= 5185; p++)
        {
            try
            {
                listener = new HttpListener();
                listener.Prefixes.Add("http://localhost:" + p + "/");
                listener.Prefixes.Add("http://127.0.0.1:" + p + "/");
                listener.Start();
                port = p;
                break;
            }
            catch
            {
                if (listener != null)
                {
                    try { listener.Close(); } catch { }
                }
            }
        }

        if (listener == null || !listener.IsListening)
        {
            Console.WriteLine("تعذر تشغيل الخادم على المنافذ المتاحة.");
            Console.WriteLine("اضغط أي مفتاح للخروج...");
            Console.ReadKey();
            return;
        }

        string url = "http://localhost:" + port + "/";
        Console.WriteLine("=================================================");
        Console.WriteLine("       تم تشغيل لوحة تحكم المشاريع بنجاح!");
        Console.WriteLine("=================================================");
        Console.WriteLine();
        Console.WriteLine("الرابط: " + url);
        Console.WriteLine("المسار: " + distPath);
        Console.WriteLine();
        Console.WriteLine("يرجى إبقاء هذه النافذة مفتوحة أثناء استخدام الموقع.");
        Console.WriteLine("يمكنك تصغيرها (Minimize) للأسفل.");
        Console.WriteLine();

        try
        {
            Process.Start(url);
        }
        catch { }

        ThreadPool.QueueUserWorkItem((o) =>
        {
            while (listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem((c) => ProcessRequest((HttpListenerContext)c, distPath), context);
                }
                catch { }
            }
        });

        // Keep running until user closes or presses Enter
        Console.WriteLine("اضغط Enter لإيقاف الخادم...");
        Console.ReadLine();
        try { listener.Stop(); } catch { }
    }

    static void ProcessRequest(HttpListenerContext context, string distPath)
    {
        try
        {
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;

            string rawPath = request.Url.LocalPath.TrimStart('/');
            if (string.IsNullOrEmpty(rawPath))
            {
                rawPath = "index.html";
            }

            rawPath = rawPath.Replace('/', Path.DirectorySeparatorChar);
            string fullPath = Path.Combine(distPath, rawPath);

            // SPA fallback: If file doesn't exist, serve index.html
            if (!File.Exists(fullPath))
            {
                fullPath = Path.Combine(distPath, "index.html");
            }

            if (!File.Exists(fullPath))
            {
                response.StatusCode = 404;
                response.Close();
                return;
            }

            string ext = Path.GetExtension(fullPath);
            string mime;
            if (!MimeTypes.TryGetValue(ext, out mime))
            {
                mime = "application/octet-stream";
            }

            response.ContentType = mime;
            response.AddHeader("Cache-Control", "no-cache");

            byte[] buffer = File.ReadAllBytes(fullPath);
            response.ContentLength64 = buffer.Length;
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.OutputStream.Close();
        }
        catch { }
    }
}
