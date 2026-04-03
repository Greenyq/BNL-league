const express = require('express');
const { Team } = require('../models/Team');
const { checkAuth } = require('../middleware/auth');

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        res.json(await Team.find());
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ error: 'Team not found' });
        res.json(team);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Admin ─────────────────────────────────────────────────────────────────────
router.use(checkAuth);

router.post('/', async (req, res) => {
    try {
        const { name, emoji, captainId, coaches } = req.body;
        res.json(await Team.create({ name, emoji, captainId, coaches }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, emoji, captainId, coaches, logo } = req.body;
        const team = await Team.findByIdAndUpdate(
            req.params.id,
            { name, emoji, captainId, coaches, logo, updatedAt: Date.now() },
            { new: true }
        );
        if (!team) return res.status(404).json({ error: 'Team not found' });
        res.json(team);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Team.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
