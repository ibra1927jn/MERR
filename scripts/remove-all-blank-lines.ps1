# FINAL FIX: Remove ALL completely blank lines from useHarvestStore.ts
# These blank lines are causing "Empty block statement" lint errors

$file = "src\stores\useHarvestStore.ts"
$lines = @(Get-Content $file -Encoding UTF8)

Write-Output "Original file: $($lines.Count) lines"

# Count blank lines before removal
$blankCount = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Length -eq 0) {
        $blankCount++
    }
}

Write-Output "Completely blank lines found: $blankCount"

# Filter out all completely blank lines
$nonBlankLines = $lines | Where-Object { $_.Length -gt 0 }

Write-Output "After removal: $($nonBlankLines.Count) lines"
Write-Output "Removed: $($lines.Count - $nonBlankLines.Count) blank lines"

# Save the cleaned file
$nonBlankLines | Set-Content $file -Encoding UTF8

Write-Output "`n✅ All blank lines removed!"
Write-Output "Please verify with: npm run lint"
