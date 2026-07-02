# Dev workflow guards

Adapted from ideas in the ECC harness (GateGuard / AgentShield): never ship
code that doesn't build, and never commit a secret.

## What's in place

### 1. GitHub Actions CI — `.github/workflows/ci.yml`
Runs on every push and pull request:
- `npm ci` → `npm test` → `npm run build` (these are the **hard gates**)
- `npm run lint` (advisory — never fails the build)
- `scripts/secret-scan.sh` (hard gate — fails on hardcoded credentials)

If CI is red, the code is broken — fix it before merging to `main`.

### 2. Local pre-push guard — `.githooks/pre-push`
Runs the same checks on your machine *before* a push leaves, so you catch a
broken build in ~15s instead of finding out from a failed Vercel deploy.

Enable it once per clone:
```bash
npm run setup-hooks
```
This sets `git config core.hooksPath .githooks`. From then on, `git push`
runs: secret-scan → tests → production build, and blocks the push if any fail.

Emergency bypass (use sparingly):
```bash
git push --no-verify
```

### 3. Secret scanner — `scripts/secret-scan.sh`
Dependency-free. Flags real credential shapes (GitHub PATs, Anthropic/OpenAI
keys, AWS keys, private keys, JWTs, Slack tokens) in tracked files. Env-var
*names* (`ADMIN_PASSWORD`, `GITHUB_TOKEN`) are fine — only actual token values
are flagged. Run manually anytime:
```bash
npm run secret-scan
```

## Why this exists

We had a production deploy fail because 4 cron jobs exceeded the Vercel plan
limit — a config issue a build can't catch. But most deploy failures ARE
build/type errors, and those are now caught locally (pre-push) and in CI
before they ever reach Vercel. The secret scanner protects the tokens the
admin-upload and auto-sync features rely on.

## Not adopted from ECC (and why)

ECC is a large multi-harness dev-tooling system (67 agents, 277 skills). For a
single Next.js app most of it is overkill. We took only the high-value,
low-overhead pieces: build/test gating, secret scanning, and a pre-push hook.
Optional future adds: `.claude/agents/` for code + security review, and the
"continuous learning" idea applied to our recommendation feedback loop.
