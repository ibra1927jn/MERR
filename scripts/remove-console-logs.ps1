# PowerShell script to remove debug console.log statements
# Keeps console.warn, console.error, console.info
# Only removes console.log (debug) statements

$filesToClean = @(
    "src\stores\useHarvestStore.ts",
    "src\services\sync.service.ts",
    "src\services\picker.service.ts",
    "src\services\sticker.service.ts",
    "src\services\offline.service.ts",
    "src\services\bucket-ledger.service.ts",
    "src\services\audit.service.ts",
    "src\services\attendance.service.ts",
    "src\services\analytics.service.ts",
    "src\pages\Runner.tsx",
    "src\context\MessagingContext.tsx",
    "src\context\AuthContext.tsx",
    "src\hooks\useInspectionHistory.ts",
    "src\components\SimpleChat.tsx",
    "src\components\views\runner\LogisticsView.tsx",
    "src\components\common\HarvestSyncBridge.tsx"
)

$totalRemoved = 0

foreach ($file in $filesToClean) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $originalLines = ($content -split "`n").Count
        
        # Remove lines with console.log (but not console.warn/error/info)
        # Also keeps eslint-disable comments on previous line
        $newContent = $content -replace '(?m)^\s*(\/\/\s*eslint-disable.*\r?\n)?\s*console\.log\([^)]*\);\r?\n', ''
        
        $newLines = ($newContent -split "`n").Count
        $removed = $originalLines - $newLines
        
        if ($removed -gt 0) {
            Set-Content $file -Value $newContent -NoNewline
            Write-Output "✅ Removed $removed console.log lines from $file"
            $totalRemoved += $removed
        }
    }
}

Write-Output ""
Write-Output "🎉 Total console.log statements removed: $totalRemoved"
