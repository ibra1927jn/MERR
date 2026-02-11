# PowerShell script to remove phantom ESLint rules
# Removes all instances of /* eslint-disable react/forbid-dom-props */

$files = @(
    "src\pages\Runner.tsx",
    "src\components\views\team-leader\TasksView.tsx",
    "src\components\views\team-leader\LogisticsView.tsx",
    "src\components\views\runner\LogisticsView.tsx",
    "src\components\views\manager\LogisticsView.tsx",
    "src\components\views\manager\DashboardView.tsx",
    "src\components\views\manager\HeatMapView.tsx"
)

$removed = 0
foreach ($file in $files) {
    $fullPath = Join-Path (Get-Location) $file
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        $newContent = $content -replace "/\* eslint-disable react/forbid-dom-props \*/\r?\n?", ""
        
        if ($content -ne $newContent) {
            Set-Content -Path $fullPath -Value $newContent -NoNewline
            Write-Host "✅ Removed phantom rule from: $file" -ForegroundColor Green
            $removed++
        }
    }
    else {
        Write-Host "⚠️  File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "`n🎯 Removed phantom rules from $removed files" -ForegroundColor Cyan
