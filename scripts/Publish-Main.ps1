# Run once from a regular PowerShell window outside Codex's restricted terminal.
# Publishes the initial hAIr checkpoint; refuses to overwrite existing history.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$repositoryUrl = 'https://github.com/JonahBreipohl/hAIr.git'
Set-Location -LiteralPath $projectPath
Get-Command git -ErrorAction Stop | Out-Null
Get-Command node -ErrorAction Stop | Out-Null

node scripts/check-repository-safety.mjs
if ($LASTEXITCODE -ne 0) { throw 'Repository safety verification failed. Nothing was committed or pushed.' }

$branchName = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $branchName -ne 'main') {
    throw 'Expected the existing local main branch. Nothing was committed or pushed.'
}
& git rev-parse --verify HEAD 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    throw 'Local history already exists. This initialization script will not alter it.'
}

$remoteReferences = @(& git ls-remote $repositoryUrl)
if ($LASTEXITCODE -ne 0) {
    throw 'Cannot read the GitHub repository. Sign in through Git credential management, then retry.'
}
if ($remoteReferences.Count -ne 0) {
    throw 'GitHub already contains history. This script will not overwrite it; ask Codex to reconcile it first.'
}

$existingOrigin = & git config --get remote.origin.url
if ($existingOrigin -and $existingOrigin.TrimEnd('/') -ne $repositoryUrl) {
    throw 'An origin remote already points elsewhere. Nothing was committed or pushed.'
}
if (-not $existingOrigin) {
    & git remote add origin $repositoryUrl
    if ($LASTEXITCODE -ne 0) { throw 'Could not configure the local origin remote.' }
}

& git add --all
if ($LASTEXITCODE -ne 0) { throw 'Could not stage the checkpoint.' }

# Preserve an existing configured author. Otherwise use the verified GitHub
# account's standard no-reply address for this commit only; no global changes.
$configuredName = & git config --get user.name
$configuredEmail = & git config --get user.email
$commitArguments = @()
if (-not $configuredName) { $commitArguments += @('-c', 'user.name=JonahBreipohl') }
if (-not $configuredEmail) {
    $commitArguments += @('-c', 'user.email=145796404+JonahBreipohl@users.noreply.github.com')
}
$commitArguments += @('commit', '-m', 'Add validated hAIr consultation prototype and evaluation foundation')
& git @commitArguments
if ($LASTEXITCODE -ne 0) { throw 'The commit failed. Nothing was pushed.' }

& git push --set-upstream origin main
if ($LASTEXITCODE -ne 0) {
    throw 'Push failed. The local commit is preserved; after resolving authentication, run: git push --set-upstream origin main'
}
$localCommit = (& git rev-parse HEAD).Trim()
$publishedReference = @(& git ls-remote origin refs/heads/main)
if ($LASTEXITCODE -ne 0 -or $publishedReference.Count -ne 1 -or ($publishedReference[0] -split '\s+')[0] -ne $localCommit) {
    throw 'Push returned successfully, but remote verification did not complete. Check GitHub before retrying.'
}
Write-Host "Verified main at $localCommit"
Write-Host 'https://github.com/JonahBreipohl/hAIr'
