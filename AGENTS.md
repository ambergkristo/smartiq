# SmartIQ Agent Guide

This file defines repo-level instructions for Codex in `C:\Users\Kasutaja\smartiq`.

## Gitea mirror command

When the user asks to sync or mirror the school repo, use this command:

```powershell
powershell -ExecutionPolicy Bypass -File tools/sync_gitea_main.ps1
```

Expected behavior:
- Mirror only `origin/main` to `gitea.kood.tech/kristoamberg/info-screens.git` branch `main`.
- Never push the current feature branch directly to Gitea.
- Do not rewrite GitHub remotes or permanent git config for this task.
- Use environment variables `GITEA_MIRROR_USERNAME` and `GITEA_MIRROR_TOKEN` for authentication.

For a non-destructive check, use:

```powershell
powershell -ExecutionPolicy Bypass -File tools/sync_gitea_main.ps1 -DryRun
```
