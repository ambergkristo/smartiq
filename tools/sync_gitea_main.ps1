param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$giteaRepo = "https://gitea.kood.tech/kristoamberg/info-screens.git"
$sourceRef = "refs/remotes/origin/main"
$targetRef = "refs/heads/main"

Set-Location $repoRoot

if (-not (Test-Path ".git")) {
  throw "This script must run from inside the repository."
}

Write-Host "Fetching latest origin/main..."
git fetch origin main
if ($LASTEXITCODE -ne 0) {
  throw "git fetch origin main failed."
}

$sourceSha = (git rev-parse $sourceRef).Trim()
if (-not $sourceSha) {
  throw "Unable to resolve $sourceRef."
}

Write-Host "Resolved $sourceRef to $sourceSha"

if ($DryRun) {
  Write-Host "Dry run only. Would push $sourceRef to $giteaRepo as $targetRef."
  exit 0
}

if (-not $env:GITEA_MIRROR_USERNAME) {
  throw "Missing environment variable GITEA_MIRROR_USERNAME."
}

if (-not $env:GITEA_MIRROR_TOKEN) {
  throw "Missing environment variable GITEA_MIRROR_TOKEN."
}

$escapedUser = [System.Uri]::EscapeDataString($env:GITEA_MIRROR_USERNAME)
$escapedToken = [System.Uri]::EscapeDataString($env:GITEA_MIRROR_TOKEN)
$giteaPushUrl = "https://${escapedUser}:${escapedToken}@gitea.kood.tech/kristoamberg/info-screens.git"

Write-Host "Pushing origin/main to Gitea main..."
git push --force $giteaPushUrl "${sourceRef}:${targetRef}"
if ($LASTEXITCODE -ne 0) {
  throw "git push to Gitea failed."
}

Write-Host "Gitea main is now aligned with origin/main at $sourceSha"
