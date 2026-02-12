# Fix blank lines causing "Empty block statement" errors
# Line 466 is empty (length 0) - needs to be removed

$file = "src\stores\useHarvestStore.ts"
$lines = @(Get-Content $file -Encoding UTF8)

Write-Output "Original file: $($lines.Count) lines"
Write-Output "Line 466 content: '$($lines[465])' (length: $($lines[465].Length))"

# Find all completely blank lines to understand context
$blankLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Length -eq 0) {
        $blankLines += $i + 1
    }
}

Write-Output "`nTotal completely blank lines: $($blankLines.Count)"
Write-Output "Blank lines near 466: $($blankLines | Where-Object { $_ -ge 460 -and $_ -le 475 })"

# Remove line 466 if it's blank
if ($lines[465].Length -eq 0) {
    Write-Output "`n✅ Removing blank line 466..."
    $newLines = @()
    $newLines += $lines[0..464]
    if ($lines.Count -gt 466) {
        $newLines += $lines[466..($lines.Count - 1)]
    }
    
    $newLines | Set-Content $file -Encoding UTF8
    Write-Output "✅ Fixed! New line count: $($newLines.Count)"
}
else {
    Write-Output "`n⚠️ Line 466 is not blank (length: $($lines[465].Length))"
}
