const express = require('express');
const { Team } = require('../models/Team');
const { checkAuth } = require('../middleware/auth');

const router = express.Router();

function publicTeam(team) {
    if (!team) return team;
    const plain = typeof team.toJSON === 'function' ? team.toJSON() : team;
    return {
        ...plain,
        id: plain.id || plain._id?.toString(),
        logo: plain.logo ? `/api/teams/${plain.id || plain._id}/logo` : plain.logo,
    };
}

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const teams = await Team.aggregate([
            {
                $project: {
                    _id: 0,
                    id: { $toString: '$_id' },
                    name: 1,
                    emoji: 1,
                    captainId: 1,
                    coaches: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    logo: {
                        $cond: [
                            { $gt: [{ $strLenCP: { $ifNull: ['$logo', ''] } }, 0] },
                            { $concat: ['/api/teams/', { $toString: '$_id' }, '/logo'] },
                            null,
                        ],
                    },
                },
            },
        ]);
        res.json(teams);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
});

router.get('/:id/logo', async (req, res) => {
    try {
        const team = await Team.findById(req.params.id).select('logo').lean();
        if (!team?.logo) return res.status(404).json({ error: 'Team logo not found' });

        const logo = String(team.logo);
        const match = logo.match(/^data:([^;]+);base64,(.*)$/);
        if (!match) return res.redirect(logo);

        res.set('Content-Type', match[1]);
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(Buffer.from(match[2], 'base64'));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ error: 'Team not found' });
        res.json(publicTeam(team));
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
