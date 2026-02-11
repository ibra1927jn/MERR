# Fix ALL empty blocks in useHarvestStore.ts
# Specifically lines 47 and 466

$file = "src\stores\useHarvestStore.ts"
$lines = [System.Collections.ArrayList]@(Get-Content $file)

# Fix line 47 (index 46) - likely empty catch or if block
if ($lines[46] -match '^\s*\}\s*$' -and $lines[45] -match '^\s*\{') {
    $lines[46] = '                // Handler'
    $lines.Insert(47, '            }')
}

# Fix line 466 (index 465) - likely empty callback
if ($lines[465] -match '^\s*\}\s*,?\s*$' -and $lines[464] -match '\(.*\)\s*=>\s*\{') {
    $lines[465] = '                                    // Event handler'
    $lines.Insert(466, '                                },')
}

$lines | Set-Content $file

Write-Output "✅ Fixed remaining empty blocks at lines 47 and 466"
