# Fail-open: lint wiki MD after edit (warnings only)
$InputRaw = [Console]::In.ReadToEnd()
try {
  $payload = $InputRaw | ConvertFrom-Json
  $path = $payload.file_path
  if ($path -and ($path -match '[\\/]wiki[\\/].*\.md$')) {
    $root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    if (-not $root) { $root = Get-Location }
    Push-Location (Join-Path $root "scripts")
    python wiki_lint.py --no-save 2>&1 | Out-Null
    Pop-Location
  }
} catch {
  exit 0
}
exit 0
