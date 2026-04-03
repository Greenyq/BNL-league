const express = require('express');
const { TeamMatch, FinalsMatch } = require('../models/Match');
const { checkAuth } = require('../middleware/auth');

const router = express.Router();

// ── Team Matches (public) ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.status)  filter.status  = req.query.status;
        if (req.query.team1Id) filter.team1Id = req.query.team1Id;
        if (req.query.team2Id) filter.team2Id = req.query.team2Id;
        res.json(await TeamMatch.find(filter).sort({ scheduledDate: 1 }));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const match = await TeamMatch.findById(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });
        res.json(match);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Finals (public) ───────────────────────────────────────────────────────────
router.get('/finals/bracket', async (req, res) => {
    try {
        res.json(await FinalsMatch.find().sort({ round: 1, matchIndex: 1 }));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch bracket' });
    }
});

// ── Admin ─────────────────────────────────────────────────────────────────────
router.use(checkAuth);

router.post('/', async (req, res) => {
    try {
        res.json(await TeamMatch.create(req.body));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const match = await TeamMatch.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );
        if (!match) return res.status(404).json({ error: 'Match not found' });
        res.json(match);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await TeamMatch.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Finals bracket admin
router.put('/finals/:id', async (req, res) => {
    try {
        const match = await FinalsMatch.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true, upsert: true }
        );
        res.json(match);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
