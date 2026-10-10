# Keeps the local dev server (vercel dev, http://localhost:3000) running.
#
# - Uses a portable Node 22 from %LOCALAPPDATA%\node22 when there is one:
#   on Node 24 for Windows, vercel dev crashes with a libuv assertion
#   ("!(handle->flags & UV_HANDLE_CLOSING)"), taking its console with it.
# - Each run is in its own hidden window, so a crash can't take this
#   watcher down; it starts a new one a few seconds later.
# - If a server is already answering on port 3000 (e.g. another copy of
#   this script), it just keeps watch instead of starting a second one.
#
# Run from VS Code (Terminal > Run Task > "Curator: dev server", which also
# starts automatically when the folder opens) or directly:
#   powershell -ExecutionPolicy Bypass -File scripts\dev-server.ps1
# Output goes to %LOCALAPPDATA%\curator-dev\vercel-dev.log.

$repo = Split-Path -Parent $PSScriptRoot
$node22 = Join-Path $env:LOCALAPPDATA "node22"
$logDir = Join-Path $env:LOCALAPPDATA "curator-dev"
$log = Join-Path $logDir "vercel-dev.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (Test-Path (Join-Path $node22 "node.exe")) {
    $env:Path = "$node22;$env:Path"
    $npx = Join-Path $node22 "npx.cmd"
} else {
    Write-Host "No portable Node 22 at $node22 - using the installed Node, which may crash on Node 24."
    $npx = "npx.cmd"
}

$host.UI.RawUI.WindowTitle = "Curator dev server (auto-restarts) - leave open"

function Test-ServerUp {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

$watching = $false

while ($true) {
    if (Test-ServerUp) {
        if (-not $watching) {
            Write-Host "[$(Get-Date -Format T)] already running on http://localhost:3000 - watching it"
            $watching = $true
        }

        Start-Sleep -Seconds 5
        continue
    }

    $watching = $false

    # A crashed run can leave a process holding the port; free it so the
    # next run gets 3000 rather than drifting to 3001.
    Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

    Add-Content $log "[$(Get-Date -Format s)] starting vercel dev"
    Write-Host "[$(Get-Date -Format T)] starting vercel dev on http://localhost:3000 (log: $log)"

    # cmd /c strips one pair of outer quotes, hence the doubled ones.
    $run = Start-Process -FilePath "cmd.exe" -WorkingDirectory $repo -WindowStyle Hidden -PassThru `
        -ArgumentList "/c", "`"`"$npx`" --yes vercel dev >> `"$log`" 2>&1`""
    $run.WaitForExit()

    Add-Content $log "[$(Get-Date -Format s)] vercel dev exited (code $($run.ExitCode)); restarting in 3s"
    Write-Host "[$(Get-Date -Format T)] vercel dev stopped (code $($run.ExitCode)) - restarting in 3s"
    Start-Sleep -Seconds 3
}
