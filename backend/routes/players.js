const express = require('express');
const { Player, PlayerStats, PlayerCache, ManualPointsAdjustment, PlayerUser, PlayerSession, PasswordReset } = require('../models/Player');
const { checkAuth } = require('../middleware/auth');
const { recalculateAllPlayerStats } = require('../services/scoring');
const { searchPlayer } = require('../services/w3champions');

const router = express.Router();

// ── Public endpoints ──────────────────────────────────────────────────────────

// All players with pre-calculated stats (used by Standings page)
router.get('/', async (req, res) => {
    try {
        const players = await Player.find();
        const stats   = await PlayerStats.find();
        const statsMap = Object.fromEntries(stats.map(s => [s.battleTag, s]));
        res.json(players.map(p => ({ ...p.toJSON(), stats: statsMap[p.battleTag] || null })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

// W3Champions player lookup — must be before /:battleTag to avoid shadowing
router.get('/w3c/search/:battleTag', async (req, res) => {
    try {
        const data = await searchPlayer(decodeURIComponent(req.params.battleTag));
        if (!data) return res.status(404).json({ error: 'Not found on W3Champions' });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'W3Champions lookup failed' });
    }
});

// Single player by battleTag
router.get('/:battleTag', async (req, res) => {
    try {
        const player = await Player.findOne({ battleTag: decodeURIComponent(req.params.battleTag) });
        if (!player) return res.status(404).json({ error: 'Player not found' });
        const stats = await PlayerStats.findOne({ battleTag: player.battleTag });
        res.json({ ...player.toJSON(), stats: stats || null });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch player' });
    }
});

// Portrait selection — public (any player can set their own portrait by id)
router.put('/:id/portrait', async (req, res) => {
    try {
        const { portrait } = req.body;
        if (!portrait) return res.status(400).json({ error: 'portrait is required' });
        const player = await Player.findByIdAndUpdate(
            req.params.id,
            { selectedPortrait: portrait, updatedAt: Date.now() },
            { new: true }
        );
        if (!player) return res.status(404).json({ error: 'Player not found' });
        res.json({ success: true, selectedPortrait: player.selectedPortrait });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Admin endpoints ───────────────────────────────────────────────────────────
router.use(checkAuth);

router.post('/', async (req, res) => {
    try {
        const player = await Player.create(req.body);
        res.json(player);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const player = await Player.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: Date.now() }, { new: true });
        if (!player) return res.status(404).json({ error: 'Player not found' });
        res.json(player);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Player.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manual points adjustment
router.post('/:battleTag/points', async (req, res) => {
    try {
        const { amount, reason } = req.body;
        const player = await Player.findOne({ battleTag: req.params.battleTag });
        if (!player) return res.status(404).json({ error: 'Player not found' });
        const adj = await ManualPointsAdjustment.create({ playerId: player._id.toString(), battleTag: player.battleTag, amount, reason });
        res.json(adj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Trigger full stats recalculation
router.post('/admin/recalculate', async (req, res) => {
    try {
        const result = await recalculateAllPlayerStats();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear cache for one player (or all if no tag given)
router.delete('/admin/cache/:battleTag?', async (req, res) => {
    try {
        const query = req.params.battleTag ? { battleTag: decodeURIComponent(req.params.battleTag) } : {};
        const { deletedCount } = await PlayerCache.deleteMany(query);
        res.json({ success: true, deletedCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
