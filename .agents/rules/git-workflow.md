---
trigger: model_decision
description: Enforce atomic commits and automated repo synchronization for game releases.
---

# Git Repository Synchronization Rules

1. **Pre-commit Verification**: Before pushing to the `main` branch, ensure `index.html` has no syntax errors, all audio cues function without errors, and responsive view modes (`Flash HUD`, `Cloud Console`, `Split`) switch cleanly.
2. **Clean Staging**: Never stage untracked OS artifacts (`.DS_Store`, `Thumbs.db`) or zip archives. Use `.gitignore` strictly.
3. **Structured Commits**: Always format commit messages with conventional commits syntax (e.g., `feat(game): ...`, `fix(ui): ...`, `refactor(console): ...`).
