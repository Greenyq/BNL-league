const express = require('express');
const { ClanWar } = require('../models/ClanWar');
const { Player, PlayerStats } = require('../models/Player');
const { checkAuth } = require('../middleware/auth');

const router = express.Router();

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

        // Merge update fields into the embedded document
        const { score, winner, games, playerA, playerB, label, format } = req.body;
        if (score   !== undefined) match.score  = score;
        if (winner  !== undefined) match.winner = winner;
        if (games   !== undefined) match.games  = games;
        if (playerA !== undefined) match.playerA = playerA;
        if (playerB !== undefined) match.playerB = playerB;
        if (label   !== undefined) match.label   = label;
        if (format  !== undefined) match.format  = format;

        // Recalculate clan-war score (count match winners)
        cw.clanWarScore.a = cw.matches.filter(m => m.winner === 'a').length;
        cw.clanWarScore.b = cw.matches.filter(m => m.winner === 'b').length;

        // Determine overall winner (first to 3)
        if (cw.clanWarScore.a >= 3) { cw.winner = 'a'; cw.status = 'completed'; }
        else if (cw.clanWarScore.b >= 3) { cw.winner = 'b'; cw.status = 'completed'; }

        await cw.save();
        res.json(cw);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/clan-wars/:id — delete clan war
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

// ── POST /api/clan-wars/:id/auto-assign — auto-assign 1v1 matches by tier ────
// Looks at players in each team, determines their tier, and pairs them for
// 1v1 matches. Does NOT touch 2v2 matches.
// Tier S = 1700+, Tier A = 1400–1700, Tier B = 1000–1400
router.post('/:id/auto-assign', async (req, res) => {
    try {
        const cw = await ClanWar.findById(req.params.id);
        if (!cw) return res.status(404).json({ error: 'Clan war not found' });

        // Get player names from both teams
        const teamANames = cw.teamA?.players || [];
        const teamBNames = cw.teamB?.players || [];
        if (teamANames.length === 0 || teamBNames.length === 0)
            return res.status(400).json({ error: 'Both teams must have players' });

        // Load all players and their stats
        const allPlayers = await Player.find();
        const allStats   = await PlayerStats.find();
        const statsMap   = Object.fromEntries(allStats.map(s => [s.battleTag, s]));

        // Helper: get tier for a player name
        function getPlayerTier(playerName) {
            const player = allPlayers.find(p => p.name === playerName || p.battleTag?.split('#')[0] === playerName);
            if (!player) return null;
            if (player.tierOverride) return player.tierOverride;
            const stats = statsMap[player.battleTag];
            const mmr = stats?.mmr || player.currentMmr || 0;
            if (mmr >= 1700) return 3; // S
            if (mmr >= 1400) return 2; // A
            if (mmr >= 1000) return 1; // B
            return null;
        }

        // Build tier → players mapping for each team
        const teamATiers = { 3: [], 2: [], 1: [] }; // S, A, B
        const teamBTiers = { 3: [], 2: [], 1: [] };
        for (const name of teamANames) {
            const tier = getPlayerTier(name);
            if (tier && teamATiers[tier]) teamATiers[tier].push(name);
        }
        for (const name of teamBNames) {
            const tier = getPlayerTier(name);
            if (tier && teamBTiers[tier]) teamBTiers[tier].push(name);
        }

        // Also check captains
        if (cw.teamA?.captain) {
            const capTier = getPlayerTier(cw.teamA.captain);
            if (capTier && teamATiers[capTier] && !teamATiers[capTier].includes(cw.teamA.captain)) {
                teamATiers[capTier].push(cw.teamA.captain);
            }
        }
        if (cw.teamB?.captain) {
            const capTier = getPlayerTier(cw.teamB.captain);
            if (capTier && teamBTiers[capTier] && !teamBTiers[capTier].includes(cw.teamB.captain)) {
                teamBTiers[capTier].push(cw.teamB.captain);
            }
        }

        // Assign 1v1 matches by tier (skip 2v2)
        const tierOrder = [3, 2, 1]; // S first, then A, then B
        let matchIdx = 0;
        const assignments = [];

        for (const tier of tierOrder) {
            const playersA = teamATiers[tier];
            const playersB = teamBTiers[tier];
            const pairCount = Math.min(playersA.length, playersB.length);
            for (let i = 0; i < pairCount; i++) {
                assignments.push({ tier, playerA: playersA[i], playerB: playersB[i] });
            }
        }

        // Apply assignments to 1v1 matches only
        for (const match of cw.matches) {
            if (match.format === '2v2' || match.format === '3v3') continue;
            if (matchIdx < assignments.length) {
                const a = assignments[matchIdx];
                match.playerA = a.playerA;
                match.playerB = a.playerB;
                const tierName = { 3: 'S', 2: 'A', 1: 'B' }[a.tier] || '?';
                match.label = match.label || `Тир ${tierName}`;
                matchIdx++;
            }
        }

        await cw.save();
        res.json({ success: true, clanWar: cw, assignments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
