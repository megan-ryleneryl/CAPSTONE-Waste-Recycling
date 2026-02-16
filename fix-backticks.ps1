# fix-backticks.ps1
# Finds and replaces '${API_BASE_URL}...' (single quotes) with `${API_BASE_URL}...` (backticks)
# Run from your project root: powershell -ExecutionPolicy Bypass -File .\fix-backticks.ps1

$targetDir = "client\src"
$extensions = @("*.js", "*.jsx")
$totalFixes = 0
$fixedFiles = @()

Write-Host "`n========================================"  -ForegroundColor Cyan
Write-Host "  Backtick Fixer for API_BASE_URL"          -ForegroundColor Cyan
Write-Host "========================================`n"  -ForegroundColor Cyan

foreach ($ext in $extensions) {
    $files = Get-ChildItem -Path $targetDir -Filter $ext -Recurse -ErrorAction SilentlyContinue

    foreach ($file in $files) {
        $content = Get-Content -Path $file.FullName -Raw
        if ($null -eq $content) { continue }

        # Match single-quoted strings containing ${API_BASE_URL}
        $pattern = "'\`$\{API_BASE_URL\}([^']*)'"

        $found = [regex]::Matches($content, $pattern)

        if ($found.Count -gt 0) {
            $fixCount = $found.Count
            $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")

            Write-Host "FIXING: $relativePath ($fixCount instance(s))" -ForegroundColor Yellow

            foreach ($m in $found) {
                Write-Host "   $($m.Value)" -ForegroundColor Red -NoNewline
                Write-Host " -> " -NoNewline
                $fixed = $m.Value -replace "^'", "``" -replace "'$", "``"
                Write-Host "$fixed" -ForegroundColor Green
            }

            # Replace all single-quoted ${API_BASE_URL}... with backtick-quoted
            $newContent = [regex]::Replace($content, $pattern, '`$${API_BASE_URL}$1`')
            Set-Content -Path $file.FullName -Value $newContent -NoNewline

            $totalFixes += $fixCount
            $fixedFiles += $relativePath
        }
    }
}

Write-Host "`n========================================"  -ForegroundColor Cyan
if ($totalFixes -gt 0) {
    Write-Host "  DONE! Fixed $totalFixes instance(s) in $($fixedFiles.Count) file(s)" -ForegroundColor Green
    Write-Host "========================================`n"  -ForegroundColor Cyan
    Write-Host "Files modified:" -ForegroundColor White
    foreach ($f in $fixedFiles) {
        Write-Host "  - $f" -ForegroundColor White
    }
    Write-Host "`nRestart npm run dev:both to see changes.`n" -ForegroundColor Yellow
} else {
    Write-Host "  No instances found - everything looks good!" -ForegroundColor Green
    Write-Host "========================================`n"  -ForegroundColor Cyan
}