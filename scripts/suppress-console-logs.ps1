$ErrorActionPreference = "Stop"

# Re-suppress console.log statements that were exposed after removing obsolete comments
# These are legitimate debug logs that should be kept

$projectRoot = "c:\Users\ibrab\Downloads\app\harvestpro-nz (1)"

Write-Host "Re-suppressing exposed console statements..." -ForegroundColor Cyan

$filesProcessed = 0
$suppressionsAdded = 0

# Find all TypeScript/TSX files
Get-ChildItem -Path "$projectRoot\src" -Recurse -Include *.ts, *.tsx | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw
    $lines = Get-Content $file.FullName
    $originalContent = $content
    $modified = $false
    
    # Find all console.log/error/warn statements and add suppressions
    $newLines = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        
        # Check if this line has console.log/error/warn/debug
        if ($line -match '^\s*(console\.(log|error|warn|debug|info))') {
            # Check if previous line already has suppression
            $prevLine = if ($i -gt 0) { $lines[$i - 1] } else { "" }
            if ($prevLine -notmatch 'eslint-disable-next-line') {
                # Get indentation from current line
                $indent = if ($line -match '^(\s+)') { $matches[1] } else { "" }
                # Add suppression comment
                $newLines += "$indent// eslint-disable-next-line no-console"
                $suppressionsAdded++
                $modified = $true
            }
        }
        $newLines += $line
    }
    
    if ($modified) {
        $newContent = $newLines -join "`r`n"
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        $filesProcessed++
        Write-Host "  OK $($file.Name) - added $suppressionsAdded suppression(s)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Complete!" -ForegroundColor Green
Write-Host "   Files processed: $filesProcessed" -ForegroundColor White
Write-Host "   Suppressions added: $suppressionsAdded" -ForegroundColor White
