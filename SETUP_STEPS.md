# Chat Overlay — Appwrite setup (simple steps)

**Do not paste your API key in Discord/ChatGPT.** Keep it in `.env.setup` on your machine only.

---

## Part A — Appwrite Console (5 minutes)

### Step 1: Create project
1. Go to [cloud.appwrite.io](https://cloud.appwrite.io) → log in
2. Click **Create project**
3. Name: `Chat Overlay`
4. Copy the **Project ID** (Settings → General)

### Step 2: Create API key (for the setup script)
1. Left sidebar → **API Keys** (under your project)
2. **Create API key**
3. Name: `setup-script`
4. Expiration: never (or 1 year — your choice)
5. Scopes — enable ALL of these:
   - `databases.read` `databases.write`
   - `collections.read` `collections.write`
   - `attributes.read` `attributes.write`
   - `indexes.read` `indexes.write`
   - `buckets.read` `buckets.write`
   - `projects.read` `projects.write` (adds localhost platform)
6. Click **Create** → copy the **secret** immediately (shown once)

### Step 3: Enable email login
1. **Auth** → **Settings**
2. Turn on **Email/Password**
3. Turn **ON** email verification (users must click link before chat works)
4. (Optional) Configure SMTP for custom sender — Appwrite Cloud has built-in mail

For **Google login**, follow `google_oauth_setup.md`.

---

## Part B — Run the automated script (2 minutes)

Open a terminal:

```bash
cd App
cp .env.setup.example .env.setup
```

Edit `.env.setup` with your editor:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id_from_step_1
APPWRITE_API_KEY=your_secret_key_from_step_2
```

Install deps and run setup:

```bash
npm install
npm run setup:appwrite
```

The script creates:
- Database `chatapp`
- Collections: `users`, `friendships`, `chats`, `messages`
- Bucket: `chat-images` (used for message images and profile photos)
- Indexes (search, chat list, messages)
- File `.env` for the app

### Step 4: Enable Realtime (manual — 30 seconds)
1. **Databases** → `chatapp` → **Settings**
2. Enable **Realtime**
3. Make sure `messages` and `chats` collections can broadcast events

---

## Part C — Run the app

```bash
npm run dev
```

1. Click the chat **bubble**
2. **Sign up** with email + password + username
3. Open Appwrite Console → **Databases** → `messages` — you should see your first message after sending

---

## Two-account test

1. Sign up **Account A** in normal browser
2. Sign up **Account B** in **incognito**
3. A: Friends → search B's username → send request
4. B: accept request → message each other

---

## If something breaks

| Error | Fix |
|-------|-----|
| `Missing APPWRITE_API_KEY` | Fill `.env.setup` |
| `401` / `unauthorized` | API key wrong or missing scopes |
| `Collection not found` | Re-run `npm run setup:appwrite` |
| CORS / network error | Console → Settings → Platforms → add **Web** hostname `localhost` |
| Login works but no messages | Enable Realtime on database |

---

## Security reminder

- `.env.setup` = server admin key → **never commit to git**
- `.env` = project id only (safe-ish for frontend) — still don't commit if paranoid
- Rotate API key if you accidentally leaked it

Full schema docs: `APPWRITE_SETUP.md` and `db_task.md`

## Temp groups

Temporary groups auto-delete **1 hour after the last message** (timer resets on each new message). The app checks every 60 seconds while you're logged in.

## Auth docs

- `verification_email_plan.md` — email verification (implemented in app)
- `google_oauth_setup.md` — Google OAuth Console steps
