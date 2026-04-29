const express = require('express');
const { ClanWar } = require('../models/ClanWar');
const { Player, PlayerStats } = require('../models/Player');
const { Team } = require('../models/Team');
const { checkAuth } = require('../middleware/auth');
const {
    getCachedSeasonProgress,
    setCachedSeasonProgress,
} = require('../services/seasonProgressCache');

const router = express.Router();

const DEFAULT_MATCHES = [
    { order: 1, format: '1v1', label: 'Дуэль I',                     playerA: '', playerB: '', score: { a: 0, b: 0 }, winner: null, games: [] },
    { order: 2, format: '1v1', label: 'Дуэль II',                    playerA: '', playerB: '', score: { a: 0, b: 0 }, winner: null, games: [] },
    { order: 3, format: '2v2', label: '2 на 2',                      playerA: '', playerB: '', score: { a: 0, b: 0 }, winner: null, games: [] },
    { order: 4, format: '1v1', label: 'Тайм-брейк',                  playerA: '', playerB: '', score: { a: 0, b: 0 }, winner: null, games: [] },
    { order: 5, format: '3v3', label: '3 на 3',                      playerA: '', playerB: '', score: { a: 0, b: 0 }, winner: null, games: [] },
];

function calculateSeasonProgress(wars) {
    return wars.reduce((progress, war) => {
        const matches = Array.isArray(war.matches) ? war.matches : [];
        progress.total += matches.length;
        progress.finished += matches.filter(match => match?.winner === 'a' || match?.winner === 'b').length;
        return progress;
    }, { finished: 0, total: 0 });
}

// ── Shared helper: assign players to all match formats in one clan war ────────
// Tier S = 1700+, Tier A = 1400–1699, Tier B = 1000–1399
// 1v1: S vs S, A vs A, B vs B (in match order)
// 2v2: S + A from each team
// 3v3: all 3 players from each team
function assignMatchPlayers(cw, allPlayers, statsMap) {
    const teamANames = cw.teamA?.players || [];
    const teamBNames = cw.teamB?.players || [];
    if (!teamANames.length || !teamBNames.length) return [];

    function getPlayerTier(name) {
        const p = allPlayers.find(p => p.name === name || p.battleTag?.split('#')[0] === name);
        if (!p) return null;
        if (p.tierOverride) return p.tierOverride;
        const mmr = statsMap[p.battleTag]?.mmr || p.currentMmr || 0;
        if (mmr >= 1700) return 3;
        if (mmr >= 1400) return 2;
        if (mmr >= 1000) return 1;
        return null;
    }

    const tierA = { 3: [], 2: [], 1: [] };
    const tierB = { 3: [], 2: [], 1: [] };
    for (const name of teamANames) { const t = getPlayerTier(name); if (t) tierA[t].push(name); }
    for (const name of teamBNames) { const t = getPlayerTier(name); if (t) tierB[t].push(name); }
    if (cw.teamA?.captain) { const t = getPlayerTier(cw.teamA.captain); if (t && !tierA[t].includes(cw.teamA.captain)) tierA[t].push(cw.teamA.captain); }
    if (cw.teamB?.captain) { const t = getPlayerTier(cw.teamB.captain); if (t && !tierB[t].includes(cw.teamB.captain)) tierB[t].push(cw.teamB.captain); }

    // Build 1v1 pairs: S→S, A→A, B→B
    const pairs = [];
    for (const tier of [3, 2, 1]) {
        const count = Math.min(tierA[tier].length, tierB[tier].length);
        for (let i = 0; i < count; i++) pairs.push({ tier, playerA: tierA[tier][i], playerB: tierB[tier][i] });
    }

    let pairIdx = 0;
    for (const match of cw.matches) {
        if (match.format === '1v1' && pairIdx < pairs.length) {
            const p = pairs[pairIdx++];
            match.playerA = p.playerA;
            match.playerB = p.playerB;
            match.label = match.label || `Тир ${{ 3: 'S', 2: 'A', 1: 'B' }[p.tier]}`;
        } else if (match.format === '2v2') {
            const a2 = [tierA[3][0], tierA[2][0]].filter(Boolean);
            const b2 = [tierB[3][0], tierB[2][0]].filter(Boolean);
            if (a2.length) match.playerA = a2.join(' + ');
            if (b2.length) match.playerB = b2.join(' + ');
        } else if (match.format === '3v3') {
            const allA = [...new Set([...teamANames, cw.teamA?.captain].filter(Boolean))];
            const allB = [...new Set([...teamBNames, cw.teamB?.captain].filter(Boolean))];
            match.playerA = allA.slice(0, 3).join(' + ');
            match.playerB = allB.slice(0, 3).join(' + ');
        }
    }
    return pairs;
}

// GET /api/clan-wars — list all clan wars
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.season) filter.season = req.query.season;
        res.json(await ClanWar.find(filter).sort({ date: -1 }));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch clan wars' });
    }
});

// GET /api/clan-wars/progress — cached season progress summary
router.get('/progress', async (req, res) => {
    try {
        const cached = getCachedSeasonProgress();
        if (cached) return res.json(cached);

        const wars = await ClanWar.find({}, { 'matches.winner': 1 }).lean();
        const progress = calculateSeasonProgress(wars);
        setCachedSeasonProgress(progress);
        res.json(progress);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch season progress' });
    }
});

// GET /api/clan-wars/:id — one clan war with all matches
router.get('/:id', async (req, res) => {
    try {
        const cw = await ClanWar.findById(req.params.id);
        if (!cw) return res.status(404).json({ error: 'Clan war not found' });
        res.json(cw);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Admin ─────────────────────────────────────────────────────────────────────
router.use(checkAuth);

// POST /api/clan-wars/schedule — generate full round-robin for a season
router.post('/schedule', async (req, res) => {
    try {
        const { season, startDate, daysBetweenRounds = 7 } = req.body;
        if (!season) return res.status(400).json({ error: 'season is required' });

        const teams = await Team.find().sort({ createdAt: 1 });
        if (teams.length < 2) return res.status(400).json({ error: 'Need at least 2 teams' });

        // Circle-method round-robin
        function buildRoundRobin(ts) {
            const arr = ts.length % 2 === 0 ? [...ts] : [...ts, null];
            const half = arr.length / 2;
            const rounds = [];
            for (let r = 0; r < arr.length - 1; r++) {
                const pairs = [];
                for (let i = 0; i < half; i++) {
                    const a = arr[i], b = arr[arr.length - 1 - i];
                    if (a && b) pairs.push([a, b]);
                }
                if (pairs.length) rounds.push(pairs);
                arr.splice(1, 0, arr.pop());
            }
            return rounds;
        }

        const rounds = buildRoundRobin(teams);

        // Skip pairs already scheduled in this season
        const existing = await ClanWar.find({ season });
        const existingSet = new Set(existing.map(cw => [cw.teamA.name, cw.teamB.name].sort().join('|')));

        const allPlayers = await Player.find();
        const start = startDate ? new Date(startDate) : new Date();

        const created = [];
        let skipped = 0;

        for (let ri = 0; ri < rounds.length; ri++) {
            const roundDate = new Date(start.getTime() + ri * Number(daysBetweenRounds) * 24 * 60 * 60 * 1000);
            for (const [teamA, teamB] of rounds[ri]) {
                const pairKey = [teamA.name, teamB.name].sort().join('|');
                if (existingSet.has(pairKey)) { skipped++; continue; }

                const capA = teamA.captainId ? allPlayers.find(p => p.id === teamA.captainId) : null;
                const capB = teamB.captainId ? allPlayers.find(p => p.id === teamB.captainId) : null;
                const plA  = allPlayers.filter(p => p.teamId === teamA.id);
                const plB  = allPlayers.filter(p => p.teamId === teamB.id);

                const cw = await ClanWar.create({
                    season,
                    date: roundDate,
                    status: 'upcoming',
                    teamA: {
                        name:    teamA.name,
                        captain: capA?.name || capA?.battleTag?.split('#')[0] || '',
                        players: plA.map(p => p.name || p.battleTag?.split('#')[0]),
                    },
                    teamB: {
                        name:    teamB.name,
                        captain: capB?.name || capB?.battleTag?.split('#')[0] || '',
                        players: plB.map(p => p.name || p.battleTag?.split('#')[0]),
                    },
                    matches: DEFAULT_MATCHES,
                });
                created.push(cw);
                existingSet.add(pairKey);
            }
        }

        res.json({ success: true, created: created.length, skipped, totalRounds: rounds.length, clanWars: created });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/clan-wars/auto-assign-all — auto-assign players in ALL clan wars at once
router.post('/auto-assign-all', async (req, res) => {
    try {
        const allClanWars = await ClanWar.find();
        const allPlayers  = await Player.find();
        const allStats    = await PlayerStats.find();
        const statsMap    = Object.fromEntries(allStats.map(s => [s.battleTag, s]));

        let totalAssigned = 0;
        let totalWars = 0;

        for (const cw of allClanWars) {
            const pairs = assignMatchPlayers(cw, allPlayers, statsMap);
            if (pairs.length > 0 || cw.matches.some(m => m.format === '2v2' || m.format === '3v3')) {
                await cw.save();
                totalAssigned += pairs.length;
                totalWars++;
            }
        }

        res.json({ success: true, totalWars, totalAssigned });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/clan-wars — create a new clan war
router.post('/', async (req, res) => {
    try {
        const cw = await ClanWar.create(req.body);
        res.status(201).json(cw);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/clan-wars/:id/matches/:matchId — update result of one internal match
router.put('/:id/matches/:matchId', async (req, res) => {
    try {
        const cw = await ClanWar.findById(req.params.id);
        if (!cw) return res.status(404).json({ error: 'Clan war not found' });

        const match = cw.matches.id(req.params.matchId);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        const { score, winner, games, playerA, playerB, label, format } = req.body;
        if (score   !== undefined) match.score  = score;
        if (winner  !== undefined) match.winner = winner;
        if (games   !== undefined) match.games  = games;
        if (playerA !== undefined) match.playerA = playerA;
        if (playerB !== undefined) match.playerB = playerB;
        if (label   !== undefined) match.label   = label;
        if (format  !== undefined) match.format  = format;

        cw.clanWarScore.a = cw.matches.filter(m => m.winner === 'a').length;
        cw.clanWarScore.b = cw.matches.filter(m => m.winner === 'b').length;

        if (cw.clanWarScore.a >= 3) { cw.winner = 'a'; cw.status = 'completed'; }
        else if (cw.clanWarScore.b >= 3) { cw.winner = 'b'; cw.status = 'completed'; }

        await cw.save();
        res.json(cw);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/clan-wars — delete ALL clan wars
router.delete('/', async (req, res) => {
    try {
        const result = await ClanWar.deleteMany({});
        res.json({ success: true, deleted: result.deletedCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/clan-wars/:id — delete one clan war
router.delete('/:id', async (req, res) => {
    try {
        await ClanWar.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/clan-wars/:id — update top-level fields (status, date, teams, etc.)
router.put('/:id', async (req, res) => {
    try {
        const cw = await ClanWar.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!cw) return res.status(404).json({ error: 'Clan war not found' });
        res.json(cw);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/clan-wars/:id/auto-assign — auto-assign players in one clan war
router.post('/:id/auto-assign', async (req, res) => {
    try {
        const cw = await ClanWar.findById(req.params.id);
        if (!cw) return res.status(404).json({ error: 'Clan war not found' });

        const teamANames = cw.teamA?.players || [];
        const teamBNames = cw.teamB?.players || [];
        if (!teamANames.length || !teamBNames.length)
            return res.status(400).json({ error: 'Both teams must have players' });

        const allPlayers = await Player.find();
        const allStats   = await PlayerStats.find();
        const statsMap   = Object.fromEntries(allStats.map(s => [s.battleTag, s]));

        const assignments = assignMatchPlayers(cw, allPlayers, statsMap);
        await cw.save();
        res.json({ success: true, clanWar: cw, assignments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
