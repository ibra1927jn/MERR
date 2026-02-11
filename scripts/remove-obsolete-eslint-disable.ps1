$ErrorActionPreference = "Stop"

# Remove obsolete eslint-disable-next-line no-console comments
# These are from Batch 0 when we suppressed console.logs
# Later batches removed the console.logs themselves, making these comments obsolete

$projectRoot = "c:\Users\ibrab\Downloads\app\harvestpro-nz (1)"

Write-Host "Removing obsolete eslint-disable comments..." -ForegroundColor Cyan

$filesProcessed = 0
$linesRemoved = 0

# Find all TypeScript/TSX files in src directory
Get-ChildItem -Path "$projectRoot\src" -Recurse -Include *.ts, *.tsx | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Remove standalone eslint-disable-next-line no-console comments
    # Pattern: line with only whitespace + comment
    $content = $content -replace '(?m)^\s*//\s*eslint-disable-next-line\s+no-console\s*[\r\n]+', ''
    
    if ($content -ne $originalContent) {
        $diff = ($originalContent.Length - $content.Length)
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesProcessed++
        $linesRemoved += [Math]::Ceiling($diff / 50) # Approximate line count
        Write-Host "  OK $($file.Name) - removed obsolete comments" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Complete!" -ForegroundColor Green
Write-Host "   Files processed: $filesProcessed" -ForegroundColor White
Write-Host "   Comments removed: $linesRemoved" -ForegroundColor White
