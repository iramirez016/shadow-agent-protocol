---
trigger: model_decision
description: Keep API keys and credentials in server-side secret storage and out of source, browser assets, and logs.
---

# API Key and Secret Handling Rules

1. **Classify credentials correctly**: API keys, OAuth client secrets, access/refresh tokens, passwords, and signing keys are secrets. Public identifiers such as the Google OAuth Web Client ID are configuration, not secrets; they may be stored in Wrangler `vars` and browser metadata, but never place a Google client secret there.
2. **Use Cloudflare Worker secrets in deployed environments**: Add or update a secret with `npx wrangler secret put SECRET_NAME` and enter its value interactively. Use the correct Worker and `--env` when applicable. Cloudflare stores Worker secrets as encrypted bindings and hides their values after creation. Configure each deployed environment separately.
3. **Use `.dev.vars` only for local development**: Wrangler reads local secret values from `.dev.vars`. This file is plaintext on the developer's machine, not a Cloudflare-encrypted secret; keep it covered by `.gitignore`, never commit or share it, and use a development credential. `.dev.vars.example` may contain placeholder names and values only.
4. **Keep Wrangler `vars` non-sensitive**: `wrangler.jsonc` `vars` are plain configuration. Never put API keys, tokens, passwords, or client secrets there. Public IDs and non-sensitive settings are appropriate.
5. **Keep secrets server-side**: Worker integrations must read credentials from the `env` binding (for example, `env.LOOTLOCKER_API_KEY`) and make the upstream request from the Worker. Never include a secret in `index.html`, client-side JavaScript, URLs, browser storage, API responses, logs, or error messages.
6. **Handle exposure as a compromise**: If a credential is committed, pasted into a public issue/chat, or exposed in a log or browser bundle, remove the exposure and rotate/revoke the credential. Deleting the visible copy alone is insufficient.
