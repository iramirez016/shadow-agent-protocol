---
trigger: model_decision
description: Enforce atomic commits and automated repo synchronization for game releases.
---

# Git Repository Synchronization Rules

1. **Pre-commit Verification**: Before pushing to the `main` branch, ensure `index.html` has no syntax errors, all audio cues function without errors, and responsive view modes (`Flash HUD`, `Cloud Console`, `Split`) switch cleanly.
2. **Clean Staging**: Never stage untracked OS artifacts (`.DS_Store`, `Thumbs.db`) or zip archives. Use `.gitignore` strictly.
3. **Structured Commits**: Always format commit messages with conventional commits syntax (e.g., `feat(game): ...`, `fix(ui): ...`, `refactor(console): ...`).
4. **Mandatory In-Game Updates Section Maintenance**: Every Pull Request (PR) and release moving forward MUST update the in-game Updates / Changelog section in `index.html`:
   - Increment `CURRENT_APP_VERSION` (e.g., `v3.3` -> `v3.4`).
   - Add a new `<div class="update-card highlight">` with the `LATEST` tag at the top of `showUpdatesModal()`, detailing the newly introduced features, bug fixes, or agent integrations.
   - Demote the previous latest card by removing the `highlight` class and setting its tag to its version number.
   - Include a real-world mental model or analogy (`update-analogy-box`) to keep security and engineering concepts intuitive.
5. **Agent Architectural Planning & Codebase Alignment**: Google Antigravity Agent serves as the primary authority for system design and planning. Any architectural specifications, anti-tamper measures, and rendering directives set forth in agent planning documents MUST be directly implemented into the codebase, maintaining zero divergence between architectural plans and production code.
