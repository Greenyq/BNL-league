# BNL League v1 — Archive

This directory contains the complete source code of BNL League v1 (legacy).
Permanently preserved under git tag `v1-legacy`.

## Directory Layout

```
legacy/
├── public/                 # Frontend (React via CDN)
│   ├── index.html          # Main HTML entry point
│   ├── app.js              # Main React app (standings, teams, finals)
│   ├── admin-components.js # Admin panel UI components
│   ├── admin-cache.js      # Admin cache management UI
│   ├── i18n.js             # Russian i18n strings
│   ├── styles.css          # Global styles
│   └── images/             # Race images (human, orc, nightelf, undead, banner)
│
├── src/
│   ├── backend/
│   │   ├── server.js       # Express entry point, CORS, auth endpoints, Multer
│   │   ├── routes.js       # All API endpoints (~1946 lines)
│   │   ├── models.js       # Mongoose schemas (~281 lines)
│   │   ├── scheduler.js    # Cron-based stats engine (~611 lines)
│   │   └── middleware.js   # Session-based admin auth
│   │
│   ├── stats-processor/    # Go microservice (parallel stats computation)
│   │   ├── main.go         # HTTP server on port 3001, goroutine-based
│   │   ├── go.mod
│   │   ├── go.sum
│   │   └── Dockerfile
│   │
│   └── migrations/
│       └── fix-winner-ids.js
│
├── data/                   # JSON fallback data (teams, players, matches)
│
└── scripts/
    ├── recalculate-stats.js
    ├── recalculate-points.js
    └── reload-match-cache.js
```

---

## Archived Features

### 1. W3Champions Points System (автоматический подсчёт очков)

**Files:** `legacy/src/backend/routes.js`, `legacy/src/backend/scheduler.js`

**Scoring logic** (`scheduler.js` → `processMatches()`):

| Result | MMR Diff | Points |
|--------|----------|--------|
| Win vs stronger | opponent MMR > player MMR + 20 | +30 |
| Win vs equal | within ±20 MMR | +50 |
| Win vs weaker | opponent MMR < player MMR − 20 | +70 |
| Loss to stronger | opponent MMR > player MMR + 20 | −20 |
| Loss to equal | within ±20 MMR | −30 |
| Loss to weaker | opponent MMR < player MMR − 20 | −40 |

Minimum points per race: 0. Optional floor of 500 via site settings.

**Achievement bonuses** (`scheduler.js` → `determineAchievements()`):
- **Centurion** — 100 wins (one-time bonus)
- **Warrior** — 50 wins (one-time bonus)
- **Gold Rush** — 1000+ points reached
- Win/loss streaks: 3, 5, 10, 15 consecutive wins/losses
- MMR challenger achievements: Giant Slayer, Titan Slayer, Goliath Slayer
- BNL-specific: bnlRobber, bnlDominator
- All achievements stored in `PlayerStats.achievements[]`

**Cron schedule:** every 10 minutes (`*/10 * * * *`)

**W3Champions API integration:**
- Endpoint: `GET /api/players/with-cache` calls W3Champions match history API
- Handles case-variation in battle tags (e.g. `Player#1234` vs `player#1234`)
- Caches responses in `PlayerCache` collection with 1-hour TTL
- Stage filter: matches between `2026-02-09` and `2026-02-22` (Stage 1)

---

### 2. Custom Points System (ручной подсчёт очков)

**Files:** `legacy/src/backend/routes.js` (admin endpoints), `legacy/src/backend/models.js` (ManualPointsAdjustment schema)

- Admin creates match, selects winner and assigns points manually
- Stored in `ManualPointsAdjustment` collection with audit trail
- Separate leaderboard column from automatic W3Champions points
- Applied on top of automatic score during `recalculateAllPlayerStats()`

---

### 3. Teams Management

**Files:** `legacy/src/backend/models.js` (Team model), `legacy/src/backend/routes.js` (teams endpoints), `legacy/public/app.js` (Teams React component)

**Team schema fields:** name, emoji, logo (URL), captainId, coaches[], players[]

**Functions:**
- Create / edit / delete team
- Add/remove players via W3Champions tag search
- Team standings by combined player points
- Logo upload (stored as URL)

---

### 4. Players & Standings

**Files:** `legacy/public/app.js`, `legacy/src/backend/routes.js`

- `GET /api/players/with-cache` — full player stats with cached W3Champions data
- Standings table with columns: rank, name, race, MMR, wins, losses, points per race
- Race filter (Human / Orc / Night Elf / Undead)
- Go microservice used for parallel data loading (`POST /compute-stats`)

---

### 5. Admin Panel

**Files:** `legacy/public/admin-components.js`, `legacy/public/admin-cache.js`, `legacy/src/backend/server.js`

- Login/password via `.env` (`ADMIN_LOGIN` / `ADMIN_PASSWORD`)
- Session token stored in `AdminSession` collection, expires after 24h
- Features: add/edit/delete players and teams, create matches, adjust points, clear caches, trigger manual recalculation, upload match replays (.w3g, .w3m, .w3x, .zip, .json)
- Rate-limited auth endpoint (`express-rate-limit`)

---

### 6. Go Stats Processor

**Files:** `legacy/src/stats-processor/`

- HTTP server on port 3001
- `POST /compute-stats` — accepts array of player objects, returns computed stats per race using goroutines (100+ players in parallel)
- `GET /health` — liveness check
- Results cached in MongoDB `playerstats_cache` collection with 10-minute TTL
- Built via multi-stage Docker image (`Dockerfile`)

---

### 7. Finals / Tournament Bracket

**Files:** `legacy/src/backend/models.js` (FinalsMatch schema), `legacy/src/backend/routes.js` (finals endpoints), `legacy/public/app.js` (Finals React component)

- Bracket stages: quarterfinal, semifinal, final
- `GET /api/finals` — bracket data
- Admin can set match results per stage

---

### 8. Player Accounts

**Files:** `legacy/src/backend/models.js` (PlayerUser, PlayerSession, PasswordReset schemas), `legacy/src/backend/routes.js`

- Player self-registration with bcrypt-hashed passwords
- Persistent login sessions with expiration
- Password reset flow with tokens

---

### 9. Streamers & Portraits

**Files:** `legacy/src/backend/models.js` (Streamer, Portrait schemas), `legacy/src/backend/routes.js`

- Streamer list with Twitch links shown in frontend
- Unlockable race portraits gated by point thresholds

---

## How to Restore Any Feature

Each feature above is self-contained. To restore:

1. Copy the relevant files from `legacy/` back into `backend/` or `frontend/`
2. Wire up routes in `backend/server.js`
3. Re-add Mongoose models to `backend/models/`
4. Re-add any required npm packages from `legacy/../package.json`

Example — restore W3Champions auto-scoring:
```
cp legacy/src/backend/scheduler.js backend/services/scoring.js
cp legacy/src/backend/routes.js    backend/routes/players.js   # extract relevant sections
```

---

## Environment Variables (v1)

```env
ADMIN_LOGIN=          # Admin username
ADMIN_PASSWORD=       # Admin password
MONGO_URL=            # MongoDB connection string
PORT=3000             # API port
NODE_ENV=production
ALLOWED_ORIGINS=      # Comma-separated allowed CORS origins
GO_WORKER_URL=http://localhost:3001
```
