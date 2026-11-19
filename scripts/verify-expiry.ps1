$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $repo 'backend/.env'
$original = [IO.File]::ReadAllText($envPath)
if ($original -notmatch '(?m)^SESSION_LIFETIME=120\r?$') {
    throw 'Expected local SESSION_LIFETIME=120. Check configuration before the expiry test.'
}
if (Test-Path (Join-Path $repo 'backend/bootstrap/cache/config.php')) {
    throw 'Run php artisan config:clear before this check.'
}
Push-Location (Join-Path $repo 'frontend')
try {
    [IO.File]::WriteAllText($envPath, $original.Replace('SESSION_LIFETIME=120', 'SESSION_LIFETIME=1'))
    $env:VERIFY_SHORT_EXPIRY = '1'
    npx.cmd playwright test tests/expiry.spec.ts
    $result = $LASTEXITCODE
} finally {
    [IO.File]::WriteAllText($envPath, $original)
    Remove-Item Env:VERIFY_SHORT_EXPIRY -ErrorAction SilentlyContinue
    Pop-Location
}
exit $result
