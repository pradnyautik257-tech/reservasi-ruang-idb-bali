# Server statis sederhana untuk prototipe (tanpa Node/Python)
param(
    [int]$Port = 8080,
    [string]$Root = $PSScriptRoot
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path $Root).Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host ""
Write-Host "  Sistem Reservasi Ruang - IDB Bali"
Write-Host "  http://localhost:$Port"
Write-Host "  Folder: $Root"
Write-Host "  Tekan Ctrl+C untuk berhenti."
Write-Host ""

$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".ttf"  = "font/ttf"
    ".woff" = "font/woff"
    ".woff2" = "font/woff2"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $relative = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath).TrimStart("/")
        if ([string]::IsNullOrWhiteSpace($relative)) { $relative = "index.html" }

        $path = Join-Path $Root $relative
        $resolved = [System.IO.Path]::GetFullPath($path)

        if (-not $resolved.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
            $response.StatusCode = 403
            $response.Close()
            continue
        }
        if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
            $response.StatusCode = 404
            $body = [System.Text.Encoding]::UTF8.GetBytes("404 - Berkas tidak ditemukan")
            $response.ContentType = "text/plain; charset=utf-8"
            $response.OutputStream.Write($body, 0, $body.Length)
            $response.Close()
            continue
        }

        $bytes = [System.IO.File]::ReadAllBytes($resolved)
        $ext = [System.IO.Path]::GetExtension($resolved).ToLowerInvariant()
        $response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
        $response.Headers.Add("Cache-Control", "no-store")
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()
    }
}
finally {
    $listener.Stop()
    $listener.Close()
}
