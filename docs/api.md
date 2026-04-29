# BNL League — API Reference

Base URL: `http://localhost:3000/api`

All write endpoints (POST / PUT / DELETE) under `/admin/*` paths require the header:
```
x-session-id: <token>
```
Obtain the token via `POST /api/admin/login`.

---

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/login` | Login — returns `{ sessionId }` |
| POST | `/admin/logout` | Logout — invalidates session |
| GET  | `/admin/verify` | Check session validity |

---

## Players

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/players` | — | All players with pre-calculated stats |
| GET    | `/players/:battleTag` | — | Single player + stats |
| GET    | `/players/w3c/search/:battleTag` | — | W3Champions lookup |
| POST   | `/players` | ✓ | Create player |
| PUT    | `/players/:id` | ✓ | Update player |
| DELETE | `/players/:id` | ✓ | Delete player |
| POST   | `/players/:battleTag/points` | ✓ | Add manual points adjustment |
| POST   | `/players/admin/recalculate` | ✓ | Trigger full stats recalculation |
| DELETE | `/players/admin/cache/:battleTag?` | ✓ | Clear match cache (one player or all) |

---

## Teams

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/teams` | — | All teams |
| GET    | `/teams/:id` | — | Single team |
| POST   | `/teams` | ✓ | Create team |
| PUT    | `/teams/:id` | ✓ | Update team |
| DELETE | `/teams/:id` | ✓ | Delete team |
| POST   | `/admin/teams/:id/upload-logo` | ✓ | Upload team logo (JPEG/PNG/WebP, max 5 MB) |

---

## Matches (team league matches)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/matches` | — | All matches (`?status=upcoming\|completed`, `?team1Id=`, `?team2Id=`) |
| GET    | `/matches/:id` | — | Single match |
| GET    | `/matches/finals/bracket` | — | Full finals bracket |
| POST   | `/matches` | ✓ | Create match |
| PUT    | `/matches/:id` | ✓ | Update match (set result, winnerId, etc.) |
| DELETE | `/matches/:id` | ✓ | Delete match |
| PUT    | `/matches/finals/:id` | ✓ | Update bracket match |

---

## Clan Wars

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/clan-wars` | — | All clan wars (`?status=`, `?season=`) |
| GET    | `/clan-wars/progress` | — | Cached season progress summary (`finished` / `total`) |
| GET    | `/clan-wars/:id` | — | One clan war with all internal matches |
| POST   | `/clan-wars` | ✓ | Create clan war |
| PUT    | `/clan-wars/:id` | ✓ | Update top-level fields (status, date, teams) |
| PUT    | `/clan-wars/:id/matches/:matchId` | ✓ | Update result of one internal match |

### PUT `/clan-wars/:id/matches/:matchId` — body fields

```json
{
  "score":   { "a": 2, "b": 1 },
  "winner":  "a",
  "playerA": "МистерЧенс / MisterChance",
  "playerB": "Иллидан / Illidan",
  "label":   "Дуэль I / Duel I",
  "games": [
    { "gameNumber": 1, "map": "Turtle Rock", "winner": "a" },
    { "gameNumber": 2, "map": "Amazonia",    "winner": "b" },
    { "gameNumber": 3, "map": "Echo Isles",  "winner": "a" }
  ]
}
```

The clanWarScore (`a` / `b`) and overall `winner` are recalculated automatically
on every match update.

---

## W3Champions proxy

| Method | Path | Description |
|--------|------|-------------|
| GET | `/matches/:battleTag` | Proxy to W3Champions match history (`?gateway=20&season=24&pageSize=100&offset=0`) |

---

## Go Stats Processor (port 3001)

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/health` | Liveness check |
| POST | `/compute-stats` | Parallel stats computation for an array of players |

See `services/stats-processor/main.go` for request/response schema.
