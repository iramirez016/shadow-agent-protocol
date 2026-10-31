#!/usr/bin/env bash
# ==============================================================================
# sync_game.sh — Automated Git Push & Release Tool for Shadow Agent Protocol
# ==============================================================================
set -e

# Change directory to project root
cd "$(dirname "$0")"

echo "========================================================"
echo " 🕹️  SHADOW AGENT PROTOCOL // GIT REPOSITORY SYNC"
echo "========================================================"

# Check git status
CHANGES=$(git status --porcelain)

if [ -z "$CHANGES" ]; then
  echo "✓ Workspace is already up to date. No changes to commit."
  exit 0
fi

echo "Detected changes in workspace:"
git status -s
echo "--------------------------------------------------------"

# Read optional commit message from argument
COMMIT_MSG="$*"

# Fallback default commit message if not passed
if [ -z "$COMMIT_MSG" ]; then
  TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
  COMMIT_MSG="feat(game): update game assets and platform logic [$TIMESTAMP]"
fi

echo "Staging files..."
git add index.html README.md .gitignore sync_game.sh .agents/ 2>/dev/null || git add -A

echo "Committing with message: '$COMMIT_MSG'"
git commit -m "$COMMIT_MSG"

echo "Pushing to remote 'origin main'..."
git push origin main

echo "========================================================"
echo "🚀 SUCCESS! Repository updated:"
echo "   Repo: https://github.com/iramirez016/shadow-agent-protocol"
echo "   Live: https://iramirez016.github.io/shadow-agent-protocol/ (if Pages is enabled)"
echo "========================================================"
