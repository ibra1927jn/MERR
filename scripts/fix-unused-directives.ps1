# Fix unused eslint-disable directives
# These are error-level issues that must be fixed

$files = @{
    "src\services\picker.service.ts"                = @(84)
    "src\services\supabase.ts"                      = @(31)  
    "src\components\modals\PickerDetailsModal.tsx"  = @(46)
    "src\components\views\team-leader\TeamView.tsx" = @(31, 69)
}

foreach ($file in $files.Keys) {
    $fullPath = "c:\Users\ibrab\Downloads\app\harvestpro-nz (1)\$file"
    if (Test-Path $fullPath) {
        $lines = Get-Content $fullPath
        $linesToRemove = $files[$file]
        $newContent = @()
        
        for ($i = 0; $i -lt $lines.Length; $i++) {
            $lineNum = $i + 1
            $line = $lines[$i]
            
            # Skip if this is a line to remove and it contains eslint-disable
            if ($linesToRemove -contains $lineNum -and $line -match "eslint-disable") {
                Write-Host "Removed from $file line $lineNum: $line"
                continue
            }
            
            $newContent += $line
        }
        
        $newContent | Set-Content $fullPath -Encoding UTF8
    }
}

Write-Host "Done removing obsolete directives"
