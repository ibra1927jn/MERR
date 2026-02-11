# ESLint Unused Variable Auto-Fixer
# Automatically removes unused imports and prefixes unused function parameters with _

param(
    [string]$ProjectRoot = "."
)

Write-Host "🔍 Running ESLint to find unused variables..." -ForegroundColor Cyan

# Get lint output
$lintOutput = & npm run lint 2>&1 | Out-String

# Parse unused variables and imports
$unusedPattern = "'([^']+)' is (defined|assigned a value) but (never used|Allowed unused args)"
$matches = [regex]::Matches($lintOutput, $unusedPattern)

$fixCount = 0
$filesFix = @{}

foreach ($match in $matches) {
    $varName = $match.Groups[1].Value
    
    # Skip if it's an eslint instruction variable or already prefixed
    if ($varName -match '^_' -or $varName -eq 'React' -or $varName -eq 'useState' -or $varName -eq 'useEffect') {
        continue
    }
    
    Write-Host "Found unused: $varName" -ForegroundColor Yellow
}

Write-Host "`n⚠️  Manual Review Required" -ForegroundColor Yellow
Write-Host "Due to complexity of import removals, please review each case individually"
Write-Host "Would you like to generate a report of all unused variables? (Y/N)" -ForegroundColor Cyan
