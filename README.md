# BNL League

A Warcraft III league management system for running Battle Newbie League events, player standings, teams, matches, and clan wars.

## Overview

BNL League is a full-stack web application built around community Warcraft III competition management. It provides an Express API, MongoDB-backed data models, and a lightweight React frontend served by the backend.

The project is designed for league administrators who need a practical way to manage players, teams, match results, standings, and clan-war style events.

## Features

- Player, team, match, and clan war management
- Standings and scoring logic for competitive events
- Admin-oriented workflows for maintaining league data
- W3Champions-related service integration points
- Docker Compose setup for local development
- Lightweight frontend served directly by the Express app

## Tech Stack

- Node.js 20+
- Express
- MongoDB and Mongoose
- React via CDN
- Docker Compose
- esbuild for frontend bundling

## Project Structure

```text
BNL-league/
├── backend/          Express API, routes, models, services, middleware
├── frontend/         React UI, components, styles, app entry point
├── docs/             API and league format documentation
├── scripts/          Build and data utility scripts
├── legacy/           Archived earlier implementation notes
├── docker-compose.yml
├── .env.example
└── package.json
```

## Local Development

### Docker Compose

```bash
cp .env.example .env
npm run build
npm run up
```

Then open:

```text
http://localhost:3000
```

Useful commands:

```bash
npm run logs
npm run down
```

### Run Node Locally

```bash
cp .env.example .env
npm ci
npm run dev
```

MongoDB must be available separately when running outside Docker.

## Documentation

- `docs/api.md` - API endpoint reference
- `docs/clan-war-rules.md` - clan war format notes

## Status

Active personal project. The current focus is improving the league workflow, admin tools, and public-facing documentation.

## License

No license has been selected yet.