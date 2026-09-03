const express = require('express');
const { Duel, Stage2Participant } = require('../models/Duel');
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

async function repairLegacyUpperDemotions() {
    const legacyPlayers = await Stage2Participant.find({ status: 'lower', upperLosses: { $exists: false } });
    for (const participant of legacyPlayers) {
        const duels = await Duel.find({
            $or: [
                { 'playerA.playerId': participant.playerId },
                { 'playerB.playerId': participant.playerId }
            ]
        }).select('phase winner playerA.playerId playerB.playerId');
        const upperLosses = duels.filter(duel => {
            if (duel.phase !== 'upper') return false;
            const side = duel.playerA.playerId === participant.playerId ? 'A' : 'B';
            return duel.winner !== side;
        }).length;
        const playedLower = duels.some(duel => duel.phase === 'lower');
        participant.upperLosses = upperLosses;
        if (!playedLower && upperLosses < 2) participant.status = 'upper';
        await participant.save();
    }
}

router.get('/stage2', async (req, res) => {
    try {
        await repairLegacyUpperDemotions();
        res.json(await Stage2Participant.find().sort({ tier: 1, qualifierWins: -1, mapWins: -1 }));
    }
    catch (err) { res.status(500).json({ error: 'Failed to fetch stage 2' }); }
});

router.post('/stage2/initialize', checkAuth, async (req, res) => {
    try {
        const players = await Player.find({});
        const stats = await PlayerStats.find({});
        const statsByTag = Object.fromEntries(stats.map(s => [s.battleTag.toLowerCase(), s]));
        let initialized = 0;
        for (const player of players) {
            const numericTier = tierOf(player, statsByTag[player.battleTag.toLowerCase()]);
            const tier = ({ 2: 'B', 3: 'A', 4: 'S' })[numericTier];
            if (!tier) continue;
            const participant = await Stage2Participant.findOneAndUpdate(
                { playerId: player.id },
                {
                    $set: { battleTag: player.battleTag, name: player.name, tier },
                    $setOnInsert: { playerId: player.id, status: tier === 'S' ? 's_bracket' : 'upper' }
                },
                { upsert: true, new: true }
            );
            // Migrate participants created by the previous five-match qualifier draft.
            if (participant.status === 'qualifier') {
                participant.status = tier === 'S' ? 's_bracket' : 'upper';
                participant.upperWins = 0;
                participant.upperLosses = 0;
                participant.lowerWins = 0;
                participant.lowerLosses = 0;
                await participant.save();
            }
            initialized++;
        }
        res.json({ initialized });
    } catch (err) { res.status(500).json({ error: err.message }); }
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
        const { playerAId, playerBId, winner, score, notes, playedAt } = req.body;
        if (!playerAId || !playerBId || playerAId === playerBId) return res.status(400).json({ error: 'Select two different players' });
        if (!['A', 'B'].includes(winner)) return res.status(400).json({ error: 'Winner must be A or B' });
        const [a, b] = await Promise.all([Player.findById(playerAId), Player.findById(playerBId)]);
        if (!a || !b) return res.status(404).json({ error: 'Player not found' });
        const [sa, sb] = await Promise.all([PlayerStats.findOne({ battleTag: a.battleTag }), PlayerStats.findOne({ battleTag: b.battleTag })]);
        const tierA = tierOf(a, sa), tierB = tierOf(b, sb);
        const groupA = ({ 2: 'B', 3: 'A', 4: 'S' })[tierA], groupB = ({ 2: 'B', 3: 'A', 4: 'S' })[tierB];
        if (!groupA || !groupB) return res.status(400).json({ error: 'Both players must belong to B, A, or S tier' });
        const [pa, pb] = await Promise.all([Stage2Participant.findOne({ playerId: a.id }), Stage2Participant.findOne({ playerId: b.id })]);
        if (!pa || !pb) return res.status(400).json({ error: 'Initialize Stage 2 first' });
        const isKingMatch = pa.status === 'king' || pb.status === 'king';
        if (!isKingMatch && (pa.status !== pb.status || groupA !== groupB)) return res.status(400).json({ error: 'Players must be in the same tier and bracket' });
        const phase = isKingMatch ? 'king' : pa.status;
        const scoreMatch = String(score || '').trim().match(/^(\d+)\s*[:\-]\s*(\d+)$/);
        if (!scoreMatch) return res.status(400).json({ error: 'Enter a BO3 score such as 2:0 or 2:1' });
        const mapsA = Number(scoreMatch[1]), mapsB = Number(scoreMatch[2]);
        if (!((mapsA === 2 && mapsB <= 1) || (mapsB === 2 && mapsA <= 1)) || (winner === 'A') !== (mapsA > mapsB))
            return res.status(400).json({ error: 'Winner and BO3 score do not match' });

        const duel = await Duel.create({
            phase, tierGroup: phase === 'king' ? 'S' : groupA,
            playerA: { playerId: a.id, battleTag: a.battleTag, name: a.name, tier: tierA, points: 0 },
            playerB: { playerId: b.id, battleTag: b.battleTag, name: b.name, tier: tierB, points: 0 },
            winner, score: `${mapsA}:${mapsB}`, notes, playedAt: playedAt || new Date()
        });
        const winnerP = winner === 'A' ? pa : pb, loserP = winner === 'A' ? pb : pa;
        pa.mapWins += mapsA; pa.mapLosses += mapsB; pb.mapWins += mapsB; pb.mapLosses += mapsA;
        if (phase === 'upper') {
            winnerP.upperWins++;
            if (winnerP.upperWins >= 3) winnerP.status = 's_bracket';
            loserP.upperLosses = (Number(loserP.upperLosses) || 0) + 1;
            if (loserP.upperLosses >= 2) loserP.status = 'lower';
        } else if (phase === 'lower') {
            winnerP.lowerWins++;
            if (winnerP.lowerWins >= 3) winnerP.status = 's_bracket';
            loserP.lowerLosses = (Number(loserP.lowerLosses) || 0) + 1;
            loserP.status = 'eliminated';
        } else if (phase === 's_bracket') {
            loserP.status = 's_bracket'; winnerP.status = 'king';
        } else if (phase === 'king') {
            loserP.status = loserP.tier === 'S' ? 's_bracket' : 'lower';
            winnerP.status = 'king';
        }
        pa.updatedAt = pb.updatedAt = new Date();
        await Promise.all([pa.save(), pb.save()]);
        res.status(201).json(duel);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', checkAuth, async (req, res) => {
    try {
        const duel = await Duel.findByIdAndDelete(req.params.id);
        if (!duel) return res.status(404).json({ error: 'Duel not found' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
