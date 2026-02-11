# Script to fix the syntax error in useHarvestStore.ts
$filePath = "c:\Users\ibrab\Downloads\app\harvestpro-nz (1)\src\stores\useHarvestStore.ts"

# Read file content
$content = Get-Content $filePath -Raw -Encoding UTF8

# Replace the malformed arrow function
$content = $content -replace '\(payload\) =& gt;', '(payload) =>'

# Save fixed content
$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "✅ Fixed syntax error in useHarvestStore.ts"
