# Google OAuth setup — Chat Overlay

Step-by-step to enable **Continue with Google** for your Appwrite project.

Your project details (public — safe to share):

| Setting | Value |
|---------|--------|
| Endpoint | `https://fra.cloud.appwrite.io/v1` |
| Project ID | `6a3fc07400274e8edf1e` |
| Appwrite OAuth callback | `https://fra.cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/6a3fc07400274e8edf1e` |

---

## Part 1 — Google Cloud Console (~5 min)

1. Open [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or pick an existing one) — e.g. `Chat Overlay`
3. **APIs & Services → OAuth consent screen**
   - User type: **External** (unless you use Google Workspace)
   - App name: `Chat Overlay`
   - User support email: yours
   - Developer contact: yours
   - Scopes: default (`email`, `profile`, `openid`) is enough
   - Add yourself as a **test user** while app is in "Testing" mode
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Chat Overlay Appwrite`
   - **Authorized JavaScript origins** — add:
     - `http://localhost:5173`
     - `https://fra.cloud.appwrite.io`
   - **Authorized redirect URIs** — add **exactly**:
     - `https://fra.cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/6a3fc07400274e8edf1e`
5. Click **Create** → copy **Client ID** and **Client secret**

> The redirect URI must match character-for-character. No trailing slash unless Appwrite shows one.

---

## Part 2 — Appwrite Console (~2 min)

1. Go to [cloud.appwrite.io](https://cloud.appwrite.io) → your **Chat Overlay** project
2. **Auth → Settings**
   - Enable **Google**
   - Paste **App ID** (Google Client ID)
   - Paste **App secret** (Google Client secret)
   - Save
3. **Settings → Platforms**
   - Ensure a **Web** platform exists with hostname `localhost` (setup script adds this)
   - For production builds, add your real domain later

---

## Part 3 — Test it

```bash
cd App
npm run dev
```

1. Click the chat bubble
2. Click **Continue with Google**
3. Browser opens → pick Google account → allow
4. Browser redirects to `http://localhost:5173/` with an active session
5. **Return to the Electron overlay window** — if session does not appear, click the bubble and try **Sign In** (session may already exist) or restart the app

### Electron quirk

Google login opens the **system browser**. The session cookie is set on `localhost:5173` in that browser context. The overlay app loads the same origin in dev, so it usually works after redirect. If not:

- Close and reopen the overlay after logging in in the browser, or
- We add a custom protocol (`chatoverlay://`) later — see `verification_email_plan.md`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `redirect_uri_mismatch` | Google redirect URI must exactly match Appwrite callback URL above |
| Google shows "app not verified" | Normal in Testing mode — add your Gmail as test user |
| Login works in browser but not overlay | Restart `npm run dev`; ensure Web platform `localhost` exists |
| `Invalid credentials` in Appwrite | Re-copy Client ID / secret; no extra spaces |
| 401 after Google redirect | Check Platforms → Web → `localhost` is listed |

---

## Production later

When you ship a real domain:

1. Google Console → add origin + redirect (Appwrite callback stays the same)
2. Appwrite → Platforms → add your domain (e.g. `app.yoursite.com`)
3. Update OAuth success URL in code if not using `window.location.origin`

---

## Related

- `verification_email_plan.md` — email verification flow (implemented)
- `SETUP_STEPS.md` — database + first run
