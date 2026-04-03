const express = require('express');
const { ClanWar } = require('../models/ClanWar');
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
        const { score, winner, games, playerA, playerB, label } = req.body;
        if (score   !== undefined) match.score  = score;
        if (winner  !== undefined) match.winner = winner;
        if (games   !== undefined) match.games  = games;
        if (playerA !== undefined) match.playerA = playerA;
        if (playerB !== undefined) match.playerB = playerB;
        if (label   !== undefined) match.label   = label;

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

module.exports = router;
