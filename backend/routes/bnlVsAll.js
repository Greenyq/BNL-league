const express = require('express');
const { BnlVsAllMatch } = require('../models/BnlVsAllMatch');
const { checkAuth } = require('../middleware/auth');

const router = express.Router();

function parsePlayers(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item || '').trim()).filter(Boolean);
    }
    return String(value || '')
        .split(/[\n,]+/)
        .map(item => item.trim())
        .filter(Boolean);
}

function normalizePayload(body) {
    const scoreBnl = Number.parseInt(body?.score?.bnl ?? body?.scoreBnl ?? 0, 10) || 0;
    const scoreOpponent = Number.parseInt(body?.score?.opponent ?? body?.scoreOpponent ?? 0, 10) || 0;
    const winner = body?.winner || (scoreBnl > scoreOpponent ? 'bnl' : scoreOpponent > scoreBnl ? 'opponent' : null);

    return {
        date: body.date || undefined,
        season: body.season || '',
        status: body.status || 'completed',
        bnlTeamName: body.bnlTeamName || 'BNL',
        opponentName: String(body.opponentName || '').trim(),
        score: {
            bnl: Math.max(0, scoreBnl),
            opponent: Math.max(0, scoreOpponent),
        },
        winner: ['bnl', 'opponent', null].includes(winner) ? winner : null,
        bnlPlayers: parsePlayers(body.bnlPlayers),
        opponentPlayers: parsePlayers(body.opponentPlayers),
        note: body.note || '',
    };
}

router.get('/', async (req, res) => {
    try {
        res.json(await BnlVsAllMatch.find().sort({ date: -1, createdAt: -1 }));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch BNL vs All matches' });
    }
});

router.use(checkAuth);

router.post('/', async (req, res) => {
    try {
        const payload = normalizePayload(req.body);
        if (!payload.opponentName) return res.status(400).json({ error: 'opponentName is required' });
        const match = await BnlVsAllMatch.create(payload);
        res.status(201).json(match);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const payload = normalizePayload(req.body);
        if (!payload.opponentName) return res.status(400).json({ error: 'opponentName is required' });
        const match = await BnlVsAllMatch.findByIdAndUpdate(req.params.id, payload, { new: true });
        if (!match) return res.status(404).json({ error: 'Match not found' });
        res.json(match);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await BnlVsAllMatch.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
