const express  = require('express');
const router   = express.Router();
const { Portrait } = require('../models/Portrait');
const { checkAuth } = require('../middleware/auth');

// GET /api/portraits — public list, sorted by race then pointsRequired
router.get('/', async (req, res) => {
    try {
        const portraits = await Portrait.find().sort({ race: 1, pointsRequired: 1 });
        res.json(portraits);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch portraits' });
    }
});

// POST /api/portraits — admin: create portrait
router.post('/', checkAuth, async (req, res) => {
    try {
        const { name, race, pointsRequired, imageUrl } = req.body;
        if (!name || !imageUrl) return res.status(400).json({ error: 'name and imageUrl required' });
        const portrait = await Portrait.create({
            name,
            race: parseInt(race) || 0,
            pointsRequired: parseInt(pointsRequired) || 0,
            imageUrl,
        });
        res.json(portrait);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/portraits/:id — admin: update portrait
router.put('/:id', checkAuth, async (req, res) => {
    try {
        const { name, race, pointsRequired, imageUrl } = req.body;
        const portrait = await Portrait.findByIdAndUpdate(
            req.params.id,
            { name, race: parseInt(race), pointsRequired: parseInt(pointsRequired), imageUrl, updatedAt: Date.now() },
            { new: true }
        );
        if (!portrait) return res.status(404).json({ error: 'Portrait not found' });
        res.json(portrait);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/portraits/:id — admin: delete portrait
router.delete('/:id', checkAuth, async (req, res) => {
    try {
        await Portrait.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
