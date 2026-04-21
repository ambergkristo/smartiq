param(
  [string]$BaseBranch = "main",
  [string]$TeamABranch = "wl/platform/bootstrap",
  [string]$TeamBBranch = "wl/commercial/bootstrap",
  [string]$RootDir = "worktrees"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Worktree {
  param(
    [string]$WorktreePath,
    [string]$BranchName
  )

  if (Test-Path $WorktreePath) {
    Write-Host "Worktree already exists: $WorktreePath"
    return
  }

  $branchExists = git show-ref --verify --quiet "refs/heads/$BranchName"
  if ($LASTEXITCODE -eq 0) {
    git worktree add $WorktreePath $BranchName | Out-Host
    return
  }

  git worktree add -b $BranchName $WorktreePath $BaseBranch | Out-Host
}

if (-not (Test-Path $RootDir)) {
  New-Item -ItemType Directory -Path $RootDir | Out-Null
}

git fetch --all --prune | Out-Host

$teamAPath = Join-Path $RootDir "ai-team-a"
$teamBPath = Join-Path $RootDir "ai-team-b"

Ensure-Worktree -WorktreePath $teamAPath -BranchName $TeamABranch
Ensure-Worktree -WorktreePath $teamBPath -BranchName $TeamBBranch

Write-Host ""
Write-Host "Dual-AI worktrees ready:"
Write-Host "- Team A: $teamAPath ($TeamABranch)"
Write-Host "- Team B: $teamBPath ($TeamBBranch)"
Write-Host ""
Write-Host "Run 'git worktree list' to verify."
