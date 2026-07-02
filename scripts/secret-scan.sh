#!/usr/bin/env bash
#
# Lightweight secret scanner (ECC AgentShield-inspired). Fails if it finds
# what looks like a real credential VALUE committed to the repo. Env-var
# NAMES (ADMIN_PASSWORD, GITHUB_TOKEN) are fine — we only flag actual token
# shapes. Zero dependencies; runs in CI and locally.
#
# Usage: bash scripts/secret-scan.sh
set -uo pipefail

# Only scan tracked, text source/config files. Skip deps, lockfile, build
# output, and this script itself (which contains the patterns).
FILES=$(git ls-files \
  | grep -vE '(^|/)node_modules/' \
  | grep -vE 'package-lock\.json$' \
  | grep -vE '(^|/)\.next/' \
  | grep -vE 'scripts/secret-scan\.sh$' \
  | grep -vE '\.(png|jpg|jpeg|gif|ico|woff2?|ttf|pdf)$' )

# Regexes for real credential shapes (not variable names).
declare -a PATTERNS=(
  'github_pat_[A-Za-z0-9_]{20,}'          # GitHub fine-grained PAT
  'ghp_[A-Za-z0-9]{36,}'                  # GitHub classic PAT
  'sk-ant-[A-Za-z0-9_-]{20,}'             # Anthropic API key
  'sk-[A-Za-z0-9]{32,}'                   # OpenAI-style key
  'AKIA[0-9A-Z]{16}'                      # AWS access key id
  'AIza[0-9A-Za-z_-]{35}'                 # Google API key
  'xox[baprs]-[0-9A-Za-z-]{10,}'          # Slack token
  '-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----'  # private keys
  'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'  # JWT
)

found=0
for f in $FILES; do
  [ -f "$f" ] || continue
  for pat in "${PATTERNS[@]}"; do
    if grep -nEI "$pat" "$f" >/dev/null 2>&1; then
      echo "::error file=$f::Potential secret matching /$pat/ found in $f"
      grep -nEI "$pat" "$f" | sed 's/^/    /'
      found=1
    fi
  done
done

if [ "$found" -ne 0 ]; then
  echo ""
  echo "❌ Secret scan failed. Remove the credential(s) above and use env vars instead."
  exit 1
fi

echo "✅ Secret scan clean — no hardcoded credentials found."
