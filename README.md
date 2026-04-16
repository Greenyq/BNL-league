# BNL League — Battle Newbie League | Warcraft III

Warcraft III league management system.
Stack: **Node.js + Express + MongoDB + React (CDN)**

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

## Local Development

The current runnable app is:
- `backend/` for the Express API
- `frontend/` for the UI served by Express

`frontend-new/` exists, but it is not the primary local-dev path yet.

### Recommended: Docker Compose

```bash
# 1. Copy and fill in environment variables
cp .env.example .env

# 2. Build images
npm run build

# 3. Start MongoDB + API in the background
npm run up

# 4. Open http://localhost:3000
```

With the current Compose setup, the API container bind-mounts the repo and runs `nodemon`.
That means:
- changes in `backend/` trigger an automatic server restart
- changes in `frontend/` are served immediately without rebuilding the image
- rebuild is only needed after dependency or Dockerfile changes

Useful commands:

```bash
npm run build   # docker compose build
npm run up      # docker compose up -d
npm run logs    # docker compose logs -f
npm run down    # docker compose down
```

### Alternative: Run Node on the Host

```bash
cp .env.example .env
npm ci

# Start MongoDB separately, then run:
MONGO_URL=mongodb://localhost:27017/gnl_league \
ADMIN_LOGIN=admin ADMIN_PASSWORD=secret \
node backend/server.js
```

If you want MongoDB in Docker but Node on the host:

```bash
docker run -d --name bnl-mongo -p 27017:27017 mongo:7.0
npm ci
npm run dev
```

If you change dependencies or the Docker image itself and need a refreshed image:

```bash
npm run build
npm run up
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
NODE_ENV=development
ALLOWED_ORIGINS=        # Comma-separated (empty = allow all, dev only)
```

## Notes

- The repo contains a deferred Go stats processor under `services/stats-processor/`, but it is not part of the supported local-dev flow.
- The local Docker setup now targets only MongoDB + the main Node/Express app.

---

## Legacy / v1

The original v1 source is archived under [`legacy/`](legacy/ARCHIVE.md)
and permanently tagged as `v1-legacy` in git.
