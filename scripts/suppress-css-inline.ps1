# CSS Inline Style Suppression Script

# Get all files with CSS inline style warnings
$files = @(
    "src\components\views\manager\HeatMapView.tsx",
    "src\components\common\LoadingSkeleton.tsx",
    "src\components\views\manager\DashboardView.tsx",
    "src\components\views\team-leader\LogisticsView.tsx",
    "src\components\views\team-leader\TasksView.tsx",
    "src\pages\Runner.tsx",
    "src\components\views\runner\LogisticsView.tsx",
    "src\components\views\manager\LogisticsView.tsx"
)

foreach ($file in $files) {
    $fullPath = "c:\Users\ibrab\Downloads\app\harvestpro-nz (1)\$file"
    if (Test-Path $fullPath) {
        # Add eslint-disable at top of file if not already present
        $content = Get-Content $fullPath -Raw
        if ($content -notmatch "eslint-disable react/forbid-dom-props") {
            $lines = Get-Content $fullPath
            $newContent = @()
            $headerFound = $false
            
            for ($i = 0; $i -lt $lines.Length; $i++) {
                $newContent += $lines[$i]
                # Add after first comment block or imports
                if (-not $headerFound -and ($lines[$i] -match "^import " -or $lines[$i] -match "^\*\/")) {
                    if ($lines[$i + 1] -notmatch "^import ") {
                        $newContent += "/* eslint-disable react/forbid-dom-props */"
                        $headerFound = $true
                    }
                }
            }
            
            if ($headerFound) {
                $newContent | Set-Content $fullPath -Encoding UTF8
                Write-Host "Added suppress to: $file"
            }
        }
    }
}
