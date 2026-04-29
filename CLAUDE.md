# BNL League — Claude Code Project Guide

## Project Overview

Warcraft III league management system. Node.js/Express backend + React (CDN, no build) frontend. MongoDB database.

## Architecture

```
BNL-league/
├── backend/
│   ├── server.js          # Entry point (Express app, static serving)
│   ├── models/            # Mongoose schemas: Player, Team, Match, ClanWar, Portrait
│   ├── routes/            # Express routers: players, teams, matches, clanWars, draft, portraits
│   ├── services/          # scoring.js (auto-scheduler), w3champions.js (API proxy)
│   └── middleware/        # auth.js (session check), cors.js
├── frontend/
│   ├── pages/index.html   # SPA entry — hash routing (/#teams, /#clanwar, etc.)
│   ├── app.js             # Root React component (no bundler, Babel CDN)
│   ├── components/        # Draft.js, Teams.js, ClanWar.js, Admin.js, Profile.js, ...
│   ├── i18n.js            # RU/EN translations
│   └── styles/            # CSS
├── docker-compose.yml
├── .env.example
└── package.json
```

## Running Locally on Windows

### Option 1 — Docker (recommended, no MongoDB install needed)

Prerequisites: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)

```powershell
# 1. Copy env file
copy .env.example .env
# Edit .env — set ADMIN_LOGIN and ADMIN_PASSWORD

# 2. Start everything (MongoDB + backend)
npm run up

# 3. Open http://localhost:3000
```

Other Docker commands:
```powershell
npm run logs     # Stream logs
npm run down     # Stop containers
npm run build    # Rebuild Docker images after dependency changes
```

### Option 2 — Local Node.js (MongoDB must be running separately)

Prerequisites: Node.js 18+, MongoDB Community Server

```powershell
# 1. Install dependencies
npm install

# 2. Copy and configure .env
copy .env.example .env
# Edit .env — set ADMIN_LOGIN, ADMIN_PASSWORD
# Set MONGO_URL=mongodb://localhost:27017/gnl_league

# 3. Start backend with auto-reload
npm run dev

# 4. Open http://localhost:3000
```

The **current production frontend** (`frontend/`) requires **no build step** — it's plain React via Babel CDN, served directly by Express as static files.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ADMIN_LOGIN` | Yes | — | Admin panel username |
| `ADMIN_PASSWORD` | Yes | — | Admin panel password |
| `MONGO_URL` | No | `mongodb://localhost:27017/gnl_league` | MongoDB connection string |
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `ALLOWED_ORIGINS` | No | `""` (allow all) | Comma-separated CORS origins for production |

## Key API Routes

```
GET  /api/players              All players with stats
GET  /api/teams                All teams
GET  /api/clan-wars            Clan wars list (?status=upcoming|ongoing|completed)
GET  /api/draft/:clanWarId     Draft state for a clan war
POST /api/draft/create         Create draft clan war from two teams (admin)
POST /api/draft/:id/start      Start draft with tier order config (admin)
POST /api/draft/:id/pick       Captain picks a player
POST /api/admin/login          Admin login → sessionId
```

Admin endpoints require header: `x-session-id: <sessionId>`
Captain pick endpoints require header: `x-player-session-id: <sessionId>`

## Frontend Architecture

- **No bundler** — React loaded via CDN in `index.html`, JSX transformed by Babel CDN
- **Hash routing**: `/#home`, `/#standings`, `/#teams`, `/#clanwar`, `/#profile`, `/#admin`
- **State management**: plain React useState/useEffect, no Redux
- **i18n**: `t('key')` function, `useLang()` hook for re-render on language switch
- Components are loaded as `<script>` tags in `index.html` — **order matters**

When editing frontend files, changes are **immediately visible** on page refresh — no build step needed.

## Draft System

The draft assigns players to teams via a turn-based pick system:

1. Admin clicks **"Начать драфт"** in the Teams tab → selects Team A and Team B
2. System auto-creates a ClanWar document to store picks
3. Admin configures tier order (who picks first in each tier)
4. Draft proceeds: Tier B → Tier A → Tier S (snake draft)
5. Each captain picks one player per tier (captain fills their own tier automatically)
6. On completion, players are **auto-assigned** to teams (`teamId` updated)

Captains authenticate via player sessions (`bnl_player_session` in localStorage).

## Database Models (key fields)

**Player**: `name`, `battleTag`, `teamId`, `captainId`, `draftAvailable`, `tierOverride`, `mainRace`, `currentMmr`  
**Team**: `name`, `emoji`, `logo` (base64), `captainId`  
**ClanWar**: `teamA/B.{name,captain}`, `status`, `draft.{status,picks,tierOrder}`, `matches[]`  
**Match**: W3Champions match data + league points  

## Common Tasks

### Add a new API route
1. Create or edit a file in `backend/routes/`
2. If new file: register it in `backend/server.js` with `app.use('/api/...', router)`

### Edit frontend UI
1. Edit the relevant file in `frontend/components/` or `frontend/app.js`
2. Refresh browser — no build needed

### Add a translation key
Edit `frontend/i18n.js` — add the key to both `ru` and `en` objects.

### Check backend logs (Docker)
```powershell
npm run logs
```

### Reset/inspect the database
Connect to MongoDB at `localhost:27017`, database `gnl_league`.  
With Docker, MongoDB port is exposed on the host.

## Windows-Specific Notes

- Use `copy` instead of `cp` in Command Prompt, or use PowerShell `Copy-Item`
- Path separators: Node.js handles `/` correctly on Windows, but shell scripts may need adjustment
- Docker Desktop must be running before `npm run up`
- If port 3000 is busy: set `PORT=3001` in `.env`
- Line endings: the repo uses LF. If Git converts to CRLF, set `git config core.autocrlf false`
