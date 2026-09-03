const express = require('express');
const { Duel } = require('../models/Duel');
const { Player, PlayerStats } = require('../models/Player');
const { checkAuth } = require('../middleware/auth');
const { getTierFromMmr } = require('../services/scoring');
const { suggestDuelPoints } = require('../services/duelScoring');

const router = express.Router();
const tierOf = (player, stats) => player.tierOverride || stats?.tier || getTierFromMmr(stats?.mmr || player.currentMmr || 0).value;

router.get('/', async (req, res) => {
    try { res.json(await Duel.find().sort({ playedAt: -1, createdAt: -1 })); }
    catch (err) { res.status(500).json({ error: 'Failed to fetch duels' }); }
});

router.get('/suggestion', checkAuth, (req, res) => {
    const tierA = Number(req.query.tierA);
    const tierB = Number(req.query.tierB);
    const winner = req.query.winner;
    if (![1,2,3,4].includes(tierA) || ![1,2,3,4].includes(tierB) || !['A','B'].includes(winner))
        return res.status(400).json({ error: 'Valid tiers and winner are required' });
    res.json({
        pointsA: suggestDuelPoints(tierA, tierB, winner === 'A'),
        pointsB: suggestDuelPoints(tierB, tierA, winner === 'B')
    });
});

router.post('/', checkAuth, async (req, res) => {
    try {
        const { playerAId, playerBId, winner, pointsA, pointsB, score, notes, playedAt } = req.body;
        if (!playerAId || !playerBId || playerAId === playerBId) return res.status(400).json({ error: 'Select two different players' });
        if (!['A', 'B'].includes(winner)) return res.status(400).json({ error: 'Winner must be A or B' });
        if (![pointsA, pointsB].every(Number.isFinite) || ![pointsA, pointsB].every(v => Number.isInteger(v) && Math.abs(v) <= 1000))
            return res.status(400).json({ error: 'Points must be whole numbers between -1000 and 1000' });

        const [a, b] = await Promise.all([Player.findById(playerAId), Player.findById(playerBId)]);
        if (!a || !b) return res.status(404).json({ error: 'Player not found' });
        const [sa, sb] = await Promise.all([PlayerStats.findOne({ battleTag: a.battleTag }), PlayerStats.findOne({ battleTag: b.battleTag })]);
        const tierA = tierOf(a, sa), tierB = tierOf(b, sb);
        if (!tierA || !tierB) return res.status(400).json({ error: 'Both players need a tier before a duel can be recorded' });

        const duel = await Duel.create({
            playerA: { playerId: a.id, battleTag: a.battleTag, name: a.name, tier: tierA, points: pointsA },
            playerB: { playerId: b.id, battleTag: b.battleTag, name: b.name, tier: tierB, points: pointsB },
            winner, score, notes, playedAt: playedAt || new Date()
        });
        await Promise.all([
            PlayerStats.findOneAndUpdate({ battleTag: a.battleTag }, { $inc: { points: pointsA, duelPoints: pointsA } }, { upsert: true }),
            PlayerStats.findOneAndUpdate({ battleTag: b.battleTag }, { $inc: { points: pointsB, duelPoints: pointsB } }, { upsert: true })
        ]);
        res.status(201).json(duel);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', checkAuth, async (req, res) => {
    try {
        const duel = await Duel.findByIdAndDelete(req.params.id);
        if (!duel) return res.status(404).json({ error: 'Duel not found' });
        await Promise.all([
            PlayerStats.findOneAndUpdate({ battleTag: duel.playerA.battleTag }, { $inc: { points: -duel.playerA.points, duelPoints: -duel.playerA.points } }),
            PlayerStats.findOneAndUpdate({ battleTag: duel.playerB.battleTag }, { $inc: { points: -duel.playerB.points, duelPoints: -duel.playerB.points } })
        ]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
