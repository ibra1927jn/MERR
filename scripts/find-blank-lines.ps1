# Find ALL blank lines in useHarvestStore.ts
# The 2 lint errors are caused by blank lines

$file = "src\stores\useHarvestStore.ts"
$lines = @(Get-Content $file -Encoding UTF8)

Write-Output "Total lines in file: $($lines.Count)"
Write-Output "`nSearching for ALL completely blank lines (length = 0)...`n"

$blankLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Length -eq 0) {
        $lineNum = $i + 1
        $blankLines += $lineNum
        
        # Show context
        $before = if ($i -gt 0) { $lines[$i - 1] } else { "(start of file)" }
        $after = if ($i -lt $lines.Count - 1) { $lines[$i + 1] } else { "(end of file)" }
        
        Write-Output "Blank line $lineNum"
        Write-Output "  Before: $before"
        Write-Output "  After: $after"
        Write-Output ""
    }
}

Write-Output "`n========================================="
Write-Output "SUMMARY: Found $($blankLines.Count) completely blank lines"
Write-Output "Blank line numbers: $($blankLines -join ', ')"
Write-Output "=========================================`n"

# Ask user which to remove
Write-Output "The 2 lint errors are likely 2 of these blank lines."
Write-Output "Run lint to identify exact line numbers, then remove them."
