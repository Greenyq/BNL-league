# BNL League — Battle Newbie League | Warcraft III

Warcraft III league management system.
Stack: **Node.js + Express + MongoDB + React (CDN) + Go microservice**

---

## Project Structure

```
BNL-league/
├── backend/
│   ├── models/         Mongoose schemas (Player, Team, Match, ClanWar)
│   ├── routes/         Express routers  (players, teams, matches, clanWars)
│   ├── services/       Business logic   (w3champions.js, scoring.js)
│   ├── middleware/     auth.js, cors.js
│   └── server.js       Entry point
│
├── frontend/           React via CDN (no build tools)
│   ├── components/     Standings, Teams, ClanWar, Admin
│   ├── pages/          index.html, standings.html, clan-war.html
│   ├── styles/         main.css
│   └── app.js          Hash-router + root render
│
├── services/
│   └── stats-processor/  Go microservice — parallel stats (port 3001)
│
├── docs/
│   ├── api.md             All API endpoints
│   └── clan-war-rules.md  Clan war format rules
│
├── legacy/             v1 archive — see legacy/ARCHIVE.md
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start

```bash
# 1. Copy and fill in environment variables
cp .env.example .env

# 2. Start all services
docker-compose up -d

# 3. Open http://localhost:3000
```

Or run locally without Docker:

```bash
npm install
MONGO_URL=mongodb://localhost:27017/gnl_league \
ADMIN_LOGIN=admin ADMIN_PASSWORD=secret \
node backend/server.js
```

Go stats processor (optional, for parallel computation):

```bash
cd services/stats-processor
go mod download
MONGO_URL=mongodb://localhost:27017/gnl_league go run main.go
```

---

## Scoring System

Points are calculated automatically every 10 minutes from W3Champions match data.

| Result | MMR diff | Points |
|--------|----------|--------|
| Win vs stronger | opp MMR > +20 | +30 |
| Win vs equal | ±20 MMR | +50 |
| Win vs weaker | opp MMR < −20 | +70 |
| Loss to stronger | opp MMR > +20 | −20 |
| Loss to equal | ±20 MMR | −30 |
| Loss to weaker | opp MMR < −20 | −40 |

Minimum points per race: 0 (or 500 once reached).
Achievement bonuses stack on top (see `backend/services/scoring.js`).

---

## Clan Wars

Team vs team, first to **3 wins**. Each internal match is BO3.
See [`docs/clan-war-rules.md`](docs/clan-war-rules.md) for full format.

---

## API

See [`docs/api.md`](docs/api.md) for the full endpoint reference.

---

## Environment Variables

```bash
ADMIN_LOGIN=            # Required
ADMIN_PASSWORD=         # Required
MONGO_URL=mongodb://localhost:27017/gnl_league
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=        # Comma-separated (empty = allow all, dev only)
GO_WORKER_URL=http://localhost:3001
```

---

## Legacy / v1

The original v1 source is archived under [`legacy/`](legacy/ARCHIVE.md)
and permanently tagged as `v1-legacy` in git.
