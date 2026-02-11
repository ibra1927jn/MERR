# Remove all unused eslint-disable no-console directives
# These are lines that say "// eslint-disable-next-line no-console" but have no console statement after

$filesToFix = @(
    "src\components\modals\BucketLedgerModal.tsx",
    "src\components\modals\PickerDetailsModal.tsx",
    "src\components\views\team-leader\TeamView.tsx",
    "src\services\audit.service.ts",
    "src\services\authHardening.service.ts",
    "src\services\bucket-ledger.service.ts",
    "src\services\config.service.ts",
    "src\services\i18n.service.ts",
    "src\services\offline.service.ts",
    "src\services\picker.service.ts",
    "src\services\sticker.service.ts",
    "src\services\sync.service.ts",
    "src\services\user.service.ts",
    "src\stores\useHarvestStore.ts"
)

$removed = 0

foreach ($file in $filesToFix) {
    $fullPath = "c:\Users\ibrab\Downloads\app\harvestpro-nz (1)\$file"
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        $originalLength = $content.Length
        
        # Remove lines that are ONLY the eslint-disable comment (with optional whitespace)
        $newContent = $content -replace '(?m)^\s*//\s*eslint-disable-next-line\s+no-console\s*\r?\n', ''
        
        if ($newContent.Length -ne $originalLength) {
            $newContent | Set-Content $fullPath -NoNewline -Encoding UTF8
            Write-Host "Fixed: $file"
            $removed++
        }
    }
}

Write-Host "`nRemoved $removed files with unused directives"
