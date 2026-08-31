# InterviewAI — Adaptive Mock Interview Coach

A small full-stack app built around a detailed interviewer system prompt. It runs realistic,
adaptive mock interviews (technical, behavioral, coding, or system design), asks follow-up
questions, probes your resume projects for bluffing, and ends with a structured feedback
report — all powered by the Claude API.

```
interview-ai-coach/
├── server.js               Express server + /api/chat endpoint
├── prompts/
│   └── system-prompt.md    The full interviewer behavior spec (edit this to tune the coach)
├── public/                 Static frontend (setup form + chat room)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── package.json
├── .env.example
├── render.yaml              One-click Render deploy config
└── .gitignore
```

## How it works

- `prompts/system-prompt.md` holds the full interviewer behavior spec (setup rules, adaptive
  difficulty, follow-up strategy, anti-bluff detection, final report format, etc).
- The browser never talks to Anthropic directly. It posts the conversation history to
  `POST /api/chat` on your own server, which attaches the system prompt (plus your setup-form
  answers) and calls the Anthropic Messages API.
- Conversation state lives in the browser tab (a simple array of `{role, content}` messages) and
  is resent in full on every turn — there's no database to run.

## 1. Run it locally

Requires Node.js 18+.

```bash
git clone <your-repo-url>
cd interview-ai-coach
npm install
cp .env.example .env
# then edit .env and paste your Anthropic API key
npm start
```

Open **http://localhost:3000**, fill out the setup screen, and start the interview.

Get an API key at https://console.anthropic.com/settings/keys.

> No key on the server? You can also paste one directly into the "Anthropic API key" field on the
> setup screen — it's sent with each request from that browser tab only and never stored.

## 2. Deploy it

Any Node host works. Two easy options:

### Render (recommended, has a free tier)

1. Push this repo to GitHub.
2. On [Render](https://render.com), choose **New → Blueprint** and point it at your repo — it
   will pick up `render.yaml` automatically. (Or choose **New → Web Service** manually: build
   command `npm install`, start command `npm start`.)
3. Add the `ANTHROPIC_API_KEY` environment variable when prompted.
4. Deploy. Render gives you a public URL.

### Railway

1. Push this repo to GitHub.
2. On [Railway](https://railway.app), choose **New Project → Deploy from GitHub repo**.
3. Add an `ANTHROPIC_API_KEY` variable in the service's **Variables** tab.
4. Railway detects the Node app automatically (`npm install` / `npm start`).

Any other platform that runs a plain Node/Express app (Fly.io, a VPS, Heroku-style PaaS, your own
Docker setup) will work the same way — just set `ANTHROPIC_API_KEY` and run `npm start`.

## 3. Push it to GitHub

```bash
cd interview-ai-coach
git init
git add .
git commit -m "Initial commit: InterviewAI mock interview coach"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.env` is already git-ignored, so your API key never gets committed — double-check before your
first push if you're unsure.

## Configuration

Environment variables (see `.env.example`):

| Variable             | Required | Default          | Notes                                   |
| --------------------- | -------- | ---------------- | ---------------------------------------- |
| `ANTHROPIC_API_KEY`  | Yes*     | —                 | *Not required if users supply their own key in the UI |
| `CLAUDE_MODEL`       | No       | `claude-sonnet-5`| Any current Claude model string          |
| `CLAUDE_MAX_TOKENS`  | No       | `1200`           | Raise for longer final reports           |
| `PORT`               | No       | `3000`           | Set automatically by most hosts          |

## Customizing the interviewer

Everything about how the AI interviewer behaves — question style, difficulty ramp, anti-bluff
follow-ups, the final report format — lives in `prompts/system-prompt.md` as plain markdown. Edit
that file and restart the server; no code changes needed.

## Notes & limitations

- Responses are non-streaming (the full answer arrives at once) to keep the deployment simple.
  For a chattier feel, swap `anthropic.messages.create` in `server.js` for a streaming call and
  wire up server-sent events on the frontend.
- There's no auth or rate limiting — fine for personal use or a demo, but add both before sharing
  a public link widely, since every message costs API credits.
- Conversation history is kept only in the browser tab; refreshing the page starts a new session.
