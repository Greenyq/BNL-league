const express    = require('express');
const { ClanWar }  = require('../models/ClanWar');
const { Player, PlayerStats, PlayerSession, PlayerUser } = require('../models/Player');
const { checkAuth } = require('../middleware/auth');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getPlayerSession(req) {
    const sessionId = req.headers['x-player-session-id'];
    if (!sessionId) return null;
    const session = await PlayerSession.findOne({ sessionId });
    if (!session || session.expiresAt < new Date()) return null;
    return session;
}

// Tier S = 1700+, Tier A = 1400–1700, Tier B = 1000–1400
function getPlayerTier(mmr) {
    if (mmr >= 1700) return 3; // S
    if (mmr >= 1400) return 2; // A
    if (mmr >= 1000) return 1; // B
    return null;
}

// Resolve effective tier: tierOverride takes priority over MMR-based tier
function getEffectiveTier(player) {
    if (player.tierOverride) return player.tierOverride;
    const mmr = player.stats?.mmr || player.currentMmr || player.mmr || 0;
    return getPlayerTier(mmr);
}

// Determine whose turn it is and which tier based on draft.picks
function getCurrentPickState(draft) {
    if (!draft || draft.status !== 'drafting') return null;

    const tierOrder = draft.tierOrder || {
        tier1: ['a', 'b'],
        tier2: ['b', 'a'],
        tier3: ['a', 'b']
    };

    const picks   = draft.picks || [];
    const t1Picks = picks.filter(p => p.tier === 1);
    const t2Picks = picks.filter(p => p.tier === 2);
    const t3Picks = picks.filter(p => p.tier === 3);

    // Each tier: 2 picks (one per team, snake order)
    if (t1Picks.length < 2) {
        return { tier: 1, team: tierOrder.tier1[t1Picks.length] };
    }
    if (t2Picks.length < 2) {
        return { tier: 2, team: tierOrder.tier2[t2Picks.length] };
    }
    if (t3Picks.length < 2) {
        return { tier: 3, team: tierOrder.tier3[t3Picks.length] };
    }
    return null; // Draft complete
}

// ── GET /api/draft/:clanWarId ─────────────────────────────────────────────────
router.get('/:clanWarId', async (req, res) => {
    try {
        const cw = await ClanWar.findById(req.params.clanWarId);
        if (!cw) return res.status(404).json({ error: 'Clan war not found' });

        // All draft-available players
        const players  = await Player.find({ draftAvailable: true });
        const allPlayers = await Player.find(); // for captain lookup
        const statsArr = await PlayerStats.find();
        const statsMap = Object.fromEntries(statsArr.map(s => [s.battleTag, s.toJSON()]));

        // Resolve captains: stored as names, need to match to Player objects
        const captainNames = [cw.teamA?.captain, cw.teamB?.captain].filter(Boolean);
        const captainIds = new Set();
        const captainsData = { a: null, b: null };

        for (const capName of captainNames) {
            const capPlayer = allPlayers.find(p =>
                p.name === capName || p.battleTag?.split('#')[0] === capName || p.battleTag === capName
            );
            if (capPlayer) {
                captainIds.add(capPlayer._id.toString());
                const capStats = statsMap[capPlayer.battleTag] || null;
                const capData = {
                    ...capPlayer.toJSON(),
                    stats: capStats,
                    mmr: capStats?.mmr || capPlayer.currentMmr || 0,
                    tier: getEffectiveTier({ ...capPlayer.toJSON(), stats: capStats, mmr: capStats?.mmr || capPlayer.currentMmr || 0 }),
                };
                if (capName === cw.teamA?.captain) captainsData.a = capData;
                if (capName === cw.teamB?.captain) captainsData.b = capData;
            }
        }

        // Already-picked IDs
        const pickedIds = new Set((cw.draft?.picks || []).map(p => p.playerId?.toString()));

        const playersWithStats = players.map(p => {
            const stats = statsMap[p.battleTag] || null;
            return { ...p.toJSON(), stats, mmr: stats?.mmr || p.currentMmr || 0 };
        });

        // Available pool: not a captain, not already picked
        const available = playersWithStats.filter(p =>
            !captainIds.has(p.id?.toString()) &&
            !pickedIds.has(p.id?.toString())
        );

        const pool = {
            tier1: available.filter(p => getEffectiveTier(p) === 1),
            tier2: available.filter(p => getEffectiveTier(p) === 2),
            tier3: available.filter(p => getEffectiveTier(p) === 3),
        };

        const draft       = cw.draft || { status: 'pending', picks: [] };
        const currentTurn = getCurrentPickState(draft);

        res.json({ clanWar: cw, draft, pool, currentTurn, captains: captainsData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/draft/:clanWarId/pick ───────────────────────────────────────────
router.post('/:clanWarId/pick', async (req, res) => {
    try {
        const session = await getPlayerSession(req);
        if (!session) return res.status(401).json({ error: 'Not authenticated' });

        const playerUser = await PlayerUser.findById(session.playerUserId);
        if (!playerUser?.linkedBattleTag) return res.status(401).json({ error: 'No BattleTag linked' });

        const cw = await ClanWar.findById(req.params.clanWarId);
        if (!cw) return res.status(404).json({ error: 'Clan war not found' });
        if (!cw.draft || cw.draft.status !== 'drafting')
            return res.status(400).json({ error: 'Draft is not active' });

        // Identify captain's team — captain is stored as name, match via Player lookup
        const linkedTag = playerUser.linkedBattleTag;
        const linkedPlayer = await Player.findOne({
            battleTag: { $regex: new RegExp(`^${linkedTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });
        const linkedName = linkedPlayer?.name || linkedTag.split('#')[0];

        const isCapA = cw.teamA?.captain === linkedName || cw.teamA?.captain === linkedTag;
        const isCapB = cw.teamB?.captain === linkedName || cw.teamB?.captain === linkedTag;
        if (!isCapA && !isCapB)
            return res.status(403).json({ error: 'You are not a captain in this clan war' });

        const captainTeam = isCapA ? 'a' : 'b';

        // Check turn
        const currentState = getCurrentPickState(cw.draft);
        if (!currentState) return res.status(400).json({ error: 'Draft is already complete' });
        if (currentState.team !== captainTeam)
            return res.status(403).json({ error: 'Not your turn' });

        // Validate target player
        const { playerId } = req.body;
        if (!playerId) return res.status(400).json({ error: 'playerId is required' });

        const player = await Player.findById(playerId);
        if (!player || !player.draftAvailable)
            return res.status(400).json({ error: 'Player not available for draft' });

        if (cw.draft.picks.some(p => p.playerId?.toString() === playerId))
            return res.status(400).json({ error: 'Player already picked' });

        // Verify player belongs to current tier (tierOverride takes priority)
        const stats     = await PlayerStats.findOne({ battleTag: player.battleTag });
        const mmr       = stats?.mmr || player.currentMmr || 0;
        const playerTier = player.tierOverride || getPlayerTier(mmr);
        if (playerTier !== currentState.tier)
            return res.status(400).json({ error: `Player MMR ${mmr} does not belong to tier ${currentState.tier}` });

        // Record pick
        cw.draft.picks.push({
            team:            captainTeam,
            playerId:        player._id,
            playerBattleTag: player.battleTag,
            tier:            currentState.tier,
            pickedAt:        new Date()
        });

        // Advance state
        const nextState = getCurrentPickState({
            status: 'drafting',
            picks:  cw.draft.picks,
            tierOrder: cw.draft.tierOrder
        });

        if (!nextState) {
            cw.draft.status = 'complete';
        } else {
            cw.draft.currentTier     = nextState.tier;
            cw.draft.currentTeamTurn = nextState.team;
        }

        await cw.save();
        res.json({ success: true, clanWar: cw });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/draft/:clanWarId/start — admin only ─────────────────────────────
router.post('/:clanWarId/start', checkAuth, async (req, res) => {
    try {
        const cw = await ClanWar.findById(req.params.clanWarId);
        if (!cw) return res.status(404).json({ error: 'Clan war not found' });

        cw.draft = {
            status:          'drafting',
            currentTier:     1,
            currentTeamTurn: 'a',
            tierOrder:       { tier1: ['a', 'b'], tier2: ['b', 'a'], tier3: ['a', 'b'] },
            picks:           []
        };

        await cw.save();
        res.json({ success: true, clanWar: cw });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/draft/:clanWarId/reset — admin only ─────────────────────────────
router.post('/:clanWarId/reset', checkAuth, async (req, res) => {
    try {
        const cw = await ClanWar.findById(req.params.clanWarId);
        if (!cw) return res.status(404).json({ error: 'Clan war not found' });

        cw.draft = {
            status:          'pending',
            currentTier:     1,
            currentTeamTurn: 'a',
            tierOrder:       { tier1: ['a', 'b'], tier2: ['b', 'a'], tier3: ['a', 'b'] },
            picks:           []
        };

        await cw.save();
        res.json({ success: true, clanWar: cw });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/draft/:clanWarId/force-complete — admin only ────────────────────
router.post('/:clanWarId/force-complete', checkAuth, async (req, res) => {
    try {
        const cw = await ClanWar.findById(req.params.clanWarId);
        if (!cw) return res.status(404).json({ error: 'Clan war not found' });

        if (!cw.draft) {
            cw.draft = { status: 'complete', picks: [] };
        } else {
            cw.draft.status = 'complete';
        }

        await cw.save();
        res.json({ success: true, clanWar: cw });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
