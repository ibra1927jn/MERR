# ESLint Console Statement Auto-Fixer
# This script adds `// eslint-disable-next-line no-console` above all console statements

param(
    [string]$Directory = ".\src"
)

$files = Get-ChildItem -Path $Directory -Recurse -Include *.ts, *.tsx -File

$totalFixed = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $lines = Get-Content $file.FullName
    $newLines = [System.Collections.ArrayList]::new()
    $modified = $false

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        
        # Check if line contains console statement
        if ($line -match '\s*console\.(log|warn|error|info|debug|table|time|trace)\(') {
            # Check if previous line already has eslint-disable comment
            $prevLine = if ($i -gt 0) { $lines[$i - 1] } else { "" }
            
            if ($prevLine -notmatch '//\s*eslint-disable(-next-line)?\s+no-console') {
                # Add eslint-disable comment
                $indent = if ($line -match '^(\s*)') { $matches[1] } else { "" }
                [void]$newLines.Add("$indent// eslint-disable-next-line no-console")
                $modified = $true
                $totalFixed++
            }
        }
        
        [void]$newLines.Add($line)
    }

    if ($modified) {
        Write-Host "Fixed $($file.Name)" -ForegroundColor Green
        $newLines | Set-Content $file.FullName -Encoding UTF8
    }
}

Write-Host "`nTotal console statements fixed: $totalFixed" -ForegroundColor Cyan
