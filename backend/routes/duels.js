const express = require('express');
const { Duel, Stage2Participant } = require('../models/Duel');
const { Player, PlayerStats, PlayerUser, PlayerSession } = require('../models/Player');
const { checkAuth, getAdminSessionResult } = require('../middleware/auth');
const { getTierFromMmr } = require('../services/scoring');
const { suggestDuelPoints } = require('../services/duelScoring');

const router = express.Router();
const tierOf = (player, stats) => player.tierOverride || stats?.tier || getTierFromMmr(stats?.mmr || player.currentMmr || 0).value;
const STAGE2_ICON_POOLS = {
    B: ['b-leaf-swirl', 'b-wolf-head', 'b-stag-head', 'b-crystal-growth', 'b-snowflake-1'],
    A: ['a-fire-punch', 'a-daemon-skull', 'a-battle-axe', 'a-horned-helm', 'a-burning-eye'],
    S: ['s-queen-crown', 's-star-swirl', 's-crossed-swords', 's-laurels', 's-hourglass']
};
const stableIconFor = participant => {
    const pool = STAGE2_ICON_POOLS[participant.tier] || STAGE2_ICON_POOLS.S;
    const seed = String(participant.playerId || participant.id || '');
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
    return pool[(hash >>> 0) % pool.length];
};

async function getStage2Viewer(req) {
    const admin = await getAdminSessionResult(req.headers['x-session-id']);
    if (admin.session) return { isAdmin: true, participant: null };
    const sessionId = req.headers['x-player-session-id'];
    if (!sessionId) return { isAdmin: false, participant: null };
    const session = await PlayerSession.findOne({ sessionId });
    if (!session || session.expiresAt < new Date()) return { isAdmin: false, participant: null };
    const user = await PlayerUser.findById(session.playerUserId);
    if (!user?.linkedBattleTag) return { isAdmin: false, participant: null };
    const participant = await Stage2Participant.findOne({ battleTag: user.linkedBattleTag });
    return { isAdmin: false, participant };
}

router.get('/', async (req, res) => {
    try {
        const [duels, viewer] = await Promise.all([
            Duel.find().sort({ playedAt: -1, createdAt: -1 }),
            getStage2Viewer(req)
        ]);
        res.json(duels.map(duel => {
            const json = duel.toJSON();
            const ownId = viewer.participant?.playerId;
            const isParticipant = ownId && [json.playerA.playerId, json.playerB.playerId].includes(ownId);
            if (viewer.isAdmin || isParticipant) return json;
            return {
                id: json.id,
                phase: json.phase,
                tierGroup: json.tierGroup,
                playerA: { tier: json.playerA.tier, points: json.playerA.points },
                playerB: { tier: json.playerB.tier, points: json.playerB.points },
                winner: json.winner,
                score: json.score,
                playedAt: json.playedAt,
                createdAt: json.createdAt
            };
        }));
    }
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

const sendOutOfCenter = participant => {
    if (participant.tier === 'S') {
        participant.status = 'eliminated';
    } else {
        participant.status = 'lower';
        participant.lowerWins = 0;
        participant.lowerLosses = 0;
    }
};

async function promotedPlayerReachedCenter() {
    return Boolean(await Duel.exists({
        phase: { $in: ['s_bracket', 'king'] },
        $or: [
            { 'playerA.tier': { $in: [2, 3] } },
            { 'playerB.tier': { $in: [2, 3] } }
        ]
    }));
}

async function repairLegacyKings() {
    const legacyKings = await Stage2Participant.find({ status: 'king', kingQualified: { $ne: true } });
    for (const king of legacyKings) {
        const decidingDuel = await Duel.findOne({
            phase: 's_bracket',
            $or: [
                { 'playerA.playerId': king.playerId, winner: 'A' },
                { 'playerB.playerId': king.playerId, winner: 'B' }
            ]
        }).sort({ playedAt: -1, createdAt: -1 });
        king.status = 's_bracket';
        if (decidingDuel) {
            const loserId = decidingDuel.winner === 'A' ? decidingDuel.playerB.playerId : decidingDuel.playerA.playerId;
            const loser = await Stage2Participant.findOne({ playerId: loserId, status: { $in: ['s_bracket', 'king'] } });
            if (loser) {
                sendOutOfCenter(loser);
                await loser.save();
            }
        }
        await king.save();
    }
    if (legacyKings.length) {
        const survivors = await Stage2Participant.find({ status: 's_bracket' });
        if (survivors.length === 1 && await promotedPlayerReachedCenter()) {
            survivors[0].status = 'king';
            survivors[0].kingQualified = true;
            await survivors[0].save();
        }
    }
}

router.get('/stage2', async (req, res) => {
    try {
        await repairLegacyUpperDemotions();
        await repairLegacyKings();
        const [participants, viewer] = await Promise.all([
            Stage2Participant.find().sort({ tier: 1, qualifierWins: -1, mapWins: -1 }),
            getStage2Viewer(req)
        ]);
        const own = viewer.participant;
        let ownWinStreak = 0;
        if (own) {
            const recentOwnDuels = await Duel.find({
                phase: { $in: ['upper', 'lower'] },
                $or: [{ 'playerA.playerId': own.playerId }, { 'playerB.playerId': own.playerId }]
            }).sort({ playedAt: -1, createdAt: -1 }).select('winner playerA.playerId playerB.playerId').limit(20);
            for (const duel of recentOwnDuels) {
                const ownSide = String(duel.playerA.playerId) === String(own.playerId) ? 'A' : 'B';
                if (duel.winner !== ownSide) break;
                ownWinStreak++;
            }
        }
        const opponentAliases = new Set((own?.opponents || []).map(value => String(value).toLowerCase()));
        const revealAll = viewer.isAdmin && req.query.revealNames === '1';
        const sanitized = participants.map(participant => {
            const isSelf = Boolean(own && String(own.id) === String(participant.id));
            const isOpponent = Boolean(own && (
                opponentAliases.has(String(participant.playerId).toLowerCase()) ||
                opponentAliases.has(String(participant.battleTag).toLowerCase())
            ));
            const isArena = ['s_bracket', 'king'].includes(participant.status);
            const maySeeName = revealAll || isSelf || isOpponent || isArena;
            return {
                id: participant.id,
                tier: participant.tier,
                status: participant.status,
                upperWins: participant.upperWins,
                upperLosses: participant.upperLosses,
                lowerWins: participant.lowerWins,
                lowerLosses: participant.lowerLosses,
                kingQualified: participant.kingQualified,
                arenaShield: Boolean(participant.arenaShield),
                winStreak: isSelf ? Math.max(Number(participant.winStreak) || 0, ownWinStreak) : undefined,
                specialMoveReady: isSelf ? Boolean(participant.specialMoveReady) : undefined,
                mysteryUsed: isSelf ? Boolean(participant.mysteryUsed) : undefined,
                specialPath: isSelf || viewer.isAdmin ? participant.specialPath : undefined,
                encounterType: isSelf || viewer.isAdmin ? participant.encounterType : undefined,
                encounterOpponentName: isSelf || viewer.isAdmin ? participant.encounterOpponentName : undefined,
                encounterStatus: isSelf || viewer.isAdmin ? participant.encounterStatus : undefined,
                iconKey: stableIconFor(participant),
                isSelf,
                isOpponent,
                showName: maySeeName,
                name: maySeeName ? participant.name : null
            };
        });
        res.json({
            participants: sanitized,
            viewer: {
                isAdmin: viewer.isAdmin,
                canRevealNames: viewer.isAdmin,
                hasPlayer: Boolean(own),
                revealNames: revealAll
            }
        });
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

// Hook for an encounter reward or an admin action. Shields never stack.
router.post('/stage2/:id/arena-shield', checkAuth, async (req, res) => {
    try {
        const participant = await Stage2Participant.findById(req.params.id);
        if (!participant) return res.status(404).json({ error: 'Stage 2 participant not found' });
        participant.arenaShield = req.body.enabled !== false;
        if (participant.arenaShield) participant.arenaShieldUsedAt = null;
        await participant.save();
        res.json({ id: participant.id, arenaShield: participant.arenaShield });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/stage2/:id/special-path', async (req, res) => {
    try {
        const viewer = await getStage2Viewer(req);
        const participant = await Stage2Participant.findById(req.params.id);
        if (!participant) return res.status(404).json({ error: 'Stage 2 participant not found' });
        const ownsParticipant = viewer.participant && String(viewer.participant.id) === String(participant.id);
        if (!viewer.isAdmin && !ownsParticipant) return res.status(403).json({ error: 'Not allowed' });
        if (!participant.specialMoveReady) return res.status(409).json({ error: 'Special move is not available' });
        const path = req.body.path;
        if (!['safe', 'mystery'].includes(path)) return res.status(400).json({ error: 'Path must be safe or mystery' });
        participant.specialMoveReady = false;
        participant.specialPath = path;
        participant.encounterType = null;
        participant.encounterOpponentId = null;
        participant.encounterOpponentName = null;
        participant.encounterStatus = null;
        if (path === 'mystery') {
            const candidates = await Stage2Participant.find({ _id: { $ne: participant._id }, status: { $ne: 'eliminated' } });
            if (!candidates.length) return res.status(409).json({ error: 'No encounter opponent is available' });
            const opponent = candidates[Math.floor(Math.random() * candidates.length)];
            participant.encounterType = Math.random() < .5 ? 'dragon' : 'dungeon';
            participant.encounterOpponentId = opponent.playerId;
            participant.encounterOpponentName = opponent.name;
            participant.encounterStatus = 'pending';
            participant.mysteryUsed = true;
        }
        participant.updatedAt = new Date();
        await participant.save();
        res.json({ path, encounterType: participant.encounterType, encounterOpponentName: participant.encounterOpponentName, encounterStatus: participant.encounterStatus });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Encounter matches are recorded separately and never change upper/lower bracket counters.
router.post('/stage2/:id/encounter-result', checkAuth, async (req, res) => {
    try {
        const challenger = await Stage2Participant.findById(req.params.id);
        if (!challenger) return res.status(404).json({ error: 'Stage 2 participant not found' });
        if (challenger.encounterStatus !== 'pending' || !challenger.encounterOpponentId)
            return res.status(409).json({ error: 'No pending encounter for this participant' });
        const opponent = await Stage2Participant.findOne({ playerId: challenger.encounterOpponentId });
        if (!opponent) return res.status(404).json({ error: 'Encounter opponent not found' });
        const challengerWon = req.body.challengerWon === true;
        const tierNumber = { B: 2, A: 3, S: 4 };
        const duel = await Duel.create({
            phase: 'encounter', tierGroup: challenger.tier,
            playerA: { playerId: challenger.playerId, battleTag: challenger.battleTag, name: challenger.name, tier: tierNumber[challenger.tier], points: 0 },
            playerB: { playerId: opponent.playerId, battleTag: opponent.battleTag, name: opponent.name, tier: tierNumber[opponent.tier], points: 0 },
            winner: challengerWon ? 'A' : 'B', score: challengerWon ? '2:0' : '0:2',
            notes: `${challenger.encounterType || 'special'} encounter`, playedAt: req.body.playedAt || new Date()
        });
        challenger.encounterStatus = challengerWon ? 'won' : 'lost';
        if (challengerWon) {
            challenger.arenaShield = true;
            challenger.arenaShieldUsedAt = null;
        }
        challenger.updatedAt = new Date();
        await challenger.save();
        res.status(201).json({ duel, encounterStatus: challenger.encounterStatus, arenaShield: challenger.arenaShield });
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
        const isCenterMatch = ['s_bracket', 'king'].includes(pa.status) && ['s_bracket', 'king'].includes(pb.status);
        if (!isCenterMatch && (pa.status !== pb.status || groupA !== groupB)) return res.status(400).json({ error: 'Players must be in the same tier and bracket' });
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
        winnerP.winStreak = (Number(winnerP.winStreak) || 0) + 1;
        loserP.winStreak = 0;
        loserP.specialMoveReady = false;
        if (['upper', 'lower'].includes(phase) && !winnerP.mysteryUsed) winnerP.specialMoveReady = true;
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
            const shieldProtected = Boolean(loserP.arenaShield);
            if (shieldProtected) {
                loserP.arenaShield = false;
                loserP.arenaShieldUsedAt = new Date();
                loserP.status = 's_bracket';
            } else {
                sendOutOfCenter(loserP);
            }
            winnerP.status = 's_bracket';
            const remainingInCenter = await Stage2Participant.countDocuments({
                _id: { $ne: loserP._id },
                status: { $in: ['s_bracket', 'king'] }
            });
            if (!shieldProtected && remainingInCenter === 1 && await promotedPlayerReachedCenter()) {
                winnerP.status = 'king';
                winnerP.kingQualified = true;
            }
        } else if (phase === 'king') {
            if (loserP.status === 'king' && loserP.arenaShield) {
                // The challenger breaks the king's shield and stays for a rematch.
                loserP.arenaShield = false;
                loserP.arenaShieldUsedAt = new Date();
                loserP.status = 'king';
                loserP.kingQualified = true;
                winnerP.status = 's_bracket';
            } else if (loserP.arenaShield) {
                // A shielded challenger remains in the arena after losing to the king.
                loserP.arenaShield = false;
                loserP.arenaShieldUsedAt = new Date();
                loserP.status = 's_bracket';
                winnerP.status = 'king';
                winnerP.kingQualified = true;
            } else {
                sendOutOfCenter(loserP);
                winnerP.status = 'king';
                winnerP.kingQualified = true;
            }
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
