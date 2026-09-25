const express = require('express');
const { Duel, Stage2Participant } = require('../models/Duel');
const { Player, PlayerStats, PlayerUser, PlayerSession } = require('../models/Player');
const { MapFile, MapLabel } = require('../models/Map');
const { checkAuth, getAdminSessionResult } = require('../middleware/auth');
const { getTierFromMmr } = require('../services/scoring');
const { suggestDuelPoints } = require('../services/duelScoring');
const { ensureMapCatalog } = require('../services/mapCatalog');
const { maximumPairing } = require('../services/pairing');

const router = express.Router();
const tierOf = (player, stats) => player.tierOverride || stats?.tier || getTierFromMmr(stats?.mmr || player.currentMmr || 0).value;
const escapeRegex = value => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const STAGE2_ICON_POOLS = {
    C: ['b-leaf-swirl', 'b-crystal-growth', 'b-stag-head', 'b-snowflake-1'],
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
const RELIC_TYPES = ['arena_shield', 'global_shield', 'opponent_skip', 'tier_vision', 'map_reroll', 'chaos_shift'];
const hasClaimedRelic = participant => Boolean(participant?.relicAwardedAt || participant?.relicType || participant?.arenaShield || participant?.arenaShieldUsedAt);
const duelPairKey = (firstId, secondId) => [String(firstId), String(secondId)].sort().join(':');
const clearAssignment = participant => {
    participant.assignedOpponentId = null;
    participant.assignedAt = null;
    participant.assignedMapId = null;
    participant.assignedMapTitle = null;
    participant.assignedMapLabelId = null;
    participant.assignedMapBiome = null;
    participant.assignedMapSeason = null;
    participant.assignedMaps = [];
};
const mapAssignment = map => map ? ({
    mapId: String(map.id || map.mapId),
    title: map.title,
    labelId: String(map.labelId),
    biomeName: map.biomeName || null,
    season: map.season || null
}) : null;
const shuffle = items => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
        const swapWith = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapWith]] = [result[swapWith], result[index]];
    }
    return result;
};
const chooseMapSeries = (maps, existingMap = null, count = 3) => {
    if (!maps.length && !existingMap) return [];
    const first = existingMap || chooseRandom(maps);
    if (!first) return [];
    const sameBiome = maps.filter(map => String(map.labelId) === String(first.labelId));
    const firstId = String(first.id || first.mapId);
    return [first, ...shuffle(sameBiome.filter(map => String(map.id || map.mapId) !== firstId))]
        .slice(0, count)
        .map(mapAssignment);
};
const applyAssignedMaps = (first, second, maps) => {
    const assignments = (maps || []).map(mapAssignment).filter(Boolean);
    const primary = assignments[0] || null;
    for (const participant of [first, second]) {
        participant.assignedMapId = primary?.mapId || null;
        participant.assignedMapTitle = primary?.title || null;
        participant.assignedMapLabelId = primary?.labelId || null;
        participant.assignedMapBiome = primary?.biomeName || null;
        participant.assignedMapSeason = primary?.season || null;
        participant.assignedMaps = assignments;
    }
};
const loadTournamentMaps = async () => {
    // Matchmaking can run before anyone has opened the map gallery. Ensure the
    // default catalog exists so a valid pair can never be stored without maps.
    await ensureMapCatalog();
    const biomes = await MapLabel.find({ active: { $ne: false } }).select('_id name season kind');
    const byId = new Map(biomes.map(b => [String(b.id), b]));
    const maps = await MapFile.find({ labelId: { $in: [...byId.keys()] } }).select('_id title labelId');
    return maps.map(map => { const biome=byId.get(String(map.labelId)); return {id:map.id,title:map.title,labelId:map.labelId,biomeName:biome?.name||'Unknown',season:biome?.season||'Season 3',kind:biome?.kind||'biome'}; });
};
const chooseRandom = items => items.length ? items[Math.floor(Math.random() * items.length)] : null;

// Upgrade active matches created before BO3 map pools existed. The original
// selected map remains game 1; two more unique maps are taken from its biome.
async function repairAssignedMapSeries() {
    const participants = await Stage2Participant.find({ assignedOpponentId: { $ne: null } });
    if (!participants.length) return 0;
    const tournamentMaps = await loadTournamentMaps();
    const byPlayerId = new Map(participants.map(participant => [String(participant.playerId), participant]));
    const repairedPairs = new Set();
    let repaired = 0;
    for (const participant of participants) {
        const opponent = byPlayerId.get(String(participant.assignedOpponentId || ''));
        if (!opponent || String(opponent.assignedOpponentId || '') !== String(participant.playerId)) continue;
        const pairKey = duelPairKey(participant.playerId, opponent.playerId);
        if (repairedPairs.has(pairKey)) continue;
        repairedPairs.add(pairKey);
        const current = (participant.assignedMaps || []).map(map => ({
            id: map.mapId, title: map.title, labelId: map.labelId,
            biomeName: map.biomeName, season: map.season
        }));
        const validSeries = current.length >= 3
            && new Set(current.map(map => String(map.labelId))).size === 1
            && new Set(current.map(map => String(map.id))).size === current.length;
        if (validSeries) {
            const opponentSeries = opponent.assignedMaps || [];
            if (opponentSeries.length !== current.length) {
                applyAssignedMaps(participant, opponent, current);
                await Promise.all([participant.save(), opponent.save()]);
                repaired++;
            }
            continue;
        }
        const legacyMap = tournamentMaps.find(map => String(map.id) === String(participant.assignedMapId))
            || (participant.assignedMapId && participant.assignedMapLabelId ? {
                id: participant.assignedMapId,
                title: participant.assignedMapTitle || 'Assigned map',
                labelId: participant.assignedMapLabelId,
                biomeName: participant.assignedMapBiome,
                season: participant.assignedMapSeason
            } : null);
        const arenaMatch = ['king', 's_bracket'].includes(participant.status)
            || ['king', 's_bracket'].includes(opponent.status);
        const eligibleMaps = tournamentMaps.filter(map => arenaMatch ? map.kind === 'arena' : map.kind !== 'arena');
        const series = chooseMapSeries(eligibleMaps, legacyMap);
        if (!series.length) continue;
        applyAssignedMaps(participant, opponent, series);
        await Promise.all([participant.save(), opponent.save()]);
        repaired++;
    }
    return repaired;
}

async function pruneRemovedStage2Participants() {
    const playerIds = new Set((await Player.find({}).select('_id')).map(player => String(player.id)));
    const stale = (await Stage2Participant.find({}).select('playerId'))
        .filter(participant => !playerIds.has(String(participant.playerId)));
    if (!stale.length) return;

    const stalePlayerIds = stale.map(participant => String(participant.playerId));
    await Stage2Participant.deleteMany({ _id: { $in: stale.map(participant => participant._id) } });
    await Promise.all([
        Stage2Participant.updateMany(
            { assignedOpponentId: { $in: stalePlayerIds } },
            { $set: {
                assignedOpponentId: null, assignedAt: null,
                assignedMapId: null, assignedMapTitle: null, assignedMapLabelId: null,
                assignedMapBiome: null, assignedMapSeason: null, assignedMaps: []
            } }
        ),
        Stage2Participant.updateMany(
            { encounterOpponentId: { $in: stalePlayerIds } },
            { $set: { encounterOpponentId: null, encounterOpponentName: null, encounterStatus: null, encounterRevealedAt: null } }
        )
    ]);
}

async function getStage2Viewer(req) {
    const admin = await getAdminSessionResult(req.headers['x-session-id']);
    const isAdmin = Boolean(admin.session);
    const sessionId = req.headers['x-player-session-id'];
    if (!sessionId) return { isAdmin, participant: null };
    const session = await PlayerSession.findOne({ sessionId });
    if (!session || session.expiresAt < new Date()) return { isAdmin, participant: null };
    const user = await PlayerUser.findById(session.playerUserId);
    if (!user?.linkedBattleTag) return { isAdmin, participant: null };
    const participant = await Stage2Participant.findOne({
        battleTag: { $regex: new RegExp(`^${escapeRegex(user.linkedBattleTag)}$`, 'i') }
    });
    return { isAdmin, participant };
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

// GET /api/duels/progress — live Season 3 match progress.
// A completed duel is already stored in Duel. An assigned match exists only on
// the two Stage2Participant records until its result is submitted, so count
// each unique assigned pair once.
router.get('/progress', async (req, res) => {
    try {
        const [finished, participants] = await Promise.all([
            Duel.countDocuments({}),
            Stage2Participant.find({})
                .select('playerId assignedOpponentId encounterOpponentId encounterStatus')
                .lean()
        ]);

        const participantIds = new Set(participants.map(participant => String(participant.playerId)));
        const assignedPairs = new Set();
        for (const participant of participants) {
            const opponentId = String(participant.assignedOpponentId || '');
            if (opponentId && participantIds.has(opponentId)) {
                assignedPairs.add(duelPairKey(participant.playerId, opponentId));
            }

            const encounterOpponentId = String(participant.encounterOpponentId || '');
            if (['awaiting_admin', 'pending'].includes(participant.encounterStatus)
                && encounterOpponentId
                && participantIds.has(encounterOpponentId)) {
                assignedPairs.add(duelPairKey(participant.playerId, encounterOpponentId));
            }
        }

        res.set('Cache-Control', 'no-store');
        res.json({ finished, total: finished + assignedPairs.size });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch Season 3 progress' });
    }
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
    participant.status = 'lower';
    participant.lowerWins = 0;
    participant.lowerLosses = 0;
};

const matchmakingGroup = participant => ['s_bracket', 'king'].includes(participant.status)
    ? `center:${participant.tier}`
    : `${participant.status}:${participant.tier}`;

async function repairInvalidAssignments() {
    const [participants, completedDuels] = await Promise.all([
        Stage2Participant.find({ assignedOpponentId: { $ne: null } }),
        Duel.find({ phase: { $ne: 'encounter' } }).select('playerA.playerId playerB.playerId')
    ]);
    const completedPairs = new Set(completedDuels.map(duel => duelPairKey(duel.playerA.playerId, duel.playerB.playerId)));
    const byPlayerId = new Map(participants.map(participant => [String(participant.playerId), participant]));
    const invalidIds = new Set();
    for (const participant of participants) {
        const opponent = byPlayerId.get(String(participant.assignedOpponentId || ''));
        const isMutual = opponent && String(opponent.assignedOpponentId || '') === String(participant.playerId);
        const isCompatible = opponent && matchmakingGroup(opponent) === matchmakingGroup(participant);
        const alreadyPlayed = opponent && completedPairs.has(duelPairKey(participant.playerId, opponent.playerId));
        if (!isMutual || !isCompatible || alreadyPlayed) {
            invalidIds.add(participant.id);
            if (opponent) invalidIds.add(opponent.id);
        }
    }
    if (!invalidIds.size) return 0;
    await Stage2Participant.updateMany(
        { _id: { $in: Array.from(invalidIds) } },
        { $set: { assignedOpponentId: null, assignedAt: null, assignedMapId: null, assignedMapTitle: null, assignedMapLabelId: null, assignedMapBiome: null, assignedMapSeason: null, assignedMaps: [] } }
    );
    return invalidIds.size;
}

async function repairInvalidEncounters() {
    const [encounters, participants, duels] = await Promise.all([
        Stage2Participant.find({ encounterStatus: { $in: ['awaiting_admin', 'pending'] } }),
        Stage2Participant.find({}),
        Duel.find({}).select('playerA.playerId playerB.playerId')
    ]);
    const byPlayerId = new Map(participants.map(participant => [String(participant.playerId), participant]));
    const completedPairs = new Set(duels.map(duel => duelPairKey(duel.playerA.playerId, duel.playerB.playerId)));
    const reserved = new Set();
    let repaired = 0;
    for (const challenger of encounters) {
        const bossId = String(challenger.encounterOpponentId || '');
        const boss = byPlayerId.get(bossId);
        const invalid = !boss
            || boss.status === 'eliminated'
            || Boolean(boss.assignedOpponentId)
            || hasClaimedRelic(boss)
            || reserved.has(bossId)
            || completedPairs.has(duelPairKey(challenger.playerId, bossId));
        if (!invalid) {
            reserved.add(bossId);
            continue;
        }
        challenger.encounterType = null;
        challenger.encounterOpponentId = null;
        challenger.encounterOpponentName = null;
        challenger.encounterStatus = null;
        challenger.encounterRevealedAt = null;
        challenger.specialPath = null;
        challenger.specialMoveReady = true;
        challenger.mysteryUsed = false;
        challenger.updatedAt = new Date();
        await challenger.save();
        repaired++;
    }
    return repaired;
}

// Fill every currently available slot without changing tournament results.
// Results and bracket movement remain admin-only operations.
async function autoAssignOpenMatches() {
    await repairInvalidAssignments();
    await repairInvalidEncounters();
    await repairAssignedMapSeries();
    const reservedBossIds = (await Stage2Participant.find({
        encounterStatus: { $in: ['awaiting_admin', 'pending'] },
        encounterOpponentId: { $ne: null }
    }).select('encounterOpponentId')).map(participant => String(participant.encounterOpponentId));
    const [participants, completedDuels, tournamentMaps] = await Promise.all([
        Stage2Participant.find({
            status: { $ne: 'eliminated' },
            playerId: { $nin: reservedBossIds },
            assignedOpponentId: null,
            specialMoveReady: { $ne: true },
            encounterStatus: { $nin: ['awaiting_admin', 'pending'] }
        }).sort({ updatedAt: 1, tier: 1 }),
        Duel.find({ phase: { $ne: 'encounter' } }).select('playerA.playerId playerB.playerId'),
        loadTournamentMaps()
    ]);
    const completedPairs = new Set(completedDuels.map(duel => duelPairKey(duel.playerA.playerId, duel.playerB.playerId)));
    const groups = new Map();
    for (const participant of participants) {
        const key = matchmakingGroup(participant);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(participant);
    }
    const assigned = [];
    for (const pool of groups.values()) {
        const canPair = (a, b) => {
            const firstAvoids = (a.avoidedOpponentIds || []).map(String).includes(String(b.playerId));
            const secondAvoids = (b.avoidedOpponentIds || []).map(String).includes(String(a.playerId));
            return !firstAvoids && !secondAvoids && !completedPairs.has(duelPairKey(a.playerId, b.playerId));
        };
        const pairs = maximumPairing(pool, canPair);
        for (const [a, b] of pairs) {
            const now = new Date();
            a.assignedOpponentId = b.playerId; a.assignedAt = now;
            b.assignedOpponentId = a.playerId; b.assignedAt = now;
            const arenaMatch = ['king', 's_bracket'].includes(a.status) || ['king', 's_bracket'].includes(b.status);
            const mapPool = tournamentMaps.filter(map => arenaMatch ? map.kind === 'arena' : map.kind !== 'arena');
            applyAssignedMaps(a, b, chooseMapSeries(mapPool));
            if (!a.opponents.includes(String(b.playerId))) a.opponents.push(String(b.playerId));
            if (!b.opponents.includes(String(a.playerId))) b.opponents.push(String(a.playerId));
            a.updatedAt = b.updatedAt = now;
            await Promise.all([a.save(), b.save()]);
            assigned.push({ playerA: a.name, playerB: b.name, group: matchmakingGroup(a) });
        }
    }
    return assigned;
}

let matchmakingQueue = Promise.resolve();
const queueAutoAssignment = () => {
    const next = matchmakingQueue.then(() => autoAssignOpenMatches());
    matchmakingQueue = next.catch(() => {});
    return next;
};

async function matchmakingSummary() {
    const participants = await Stage2Participant.find({ status: { $ne: 'eliminated' } });
    const byPlayerId = new Map(participants.map(participant => [String(participant.playerId), participant]));
    const scheduled = new Set();
    for (const participant of participants) {
        const opponentId = String(participant.assignedOpponentId || '');
        const opponent = byPlayerId.get(opponentId);
        if (!opponent || String(opponent.assignedOpponentId || '') !== String(participant.playerId)) continue;
        scheduled.add([String(participant.playerId), opponentId].sort().join(':'));
    }
    return {
        scheduled: scheduled.size,
        waitingForPath: participants.filter(participant => participant.specialMoveReady).length,
        waitingForEncounter: participants.filter(participant => ['awaiting_admin', 'pending'].includes(participant.encounterStatus)).length,
        free: participants.filter(participant => !participant.assignedOpponentId && !participant.specialMoveReady && !['awaiting_admin', 'pending'].includes(participant.encounterStatus)).length
    };
}

async function awardRandomRelic(participant) {
    const relicType = chooseRandom(RELIC_TYPES);
    const now = new Date();
    participant.relicType = relicType;
    participant.relicAwardedAt = now;
    participant.relicUsedAt = null;
    if (relicType === 'arena_shield') participant.arenaShield = true;
    if (relicType === 'chaos_shift') {
        const tiers = ['C', 'B', 'A', 'S'].filter(tier => tier !== participant.tier);
        participant.tier = chooseRandom(tiers);
        const numericTier = { C: 1, B: 2, A: 3, S: 4 }[participant.tier];
        await Player.findByIdAndUpdate(participant.playerId, { tierOverride: numericTier, updatedAt: new Date() });
        participant.status = participant.tier === 'S' ? 's_bracket' : chooseRandom(['upper', 'lower']);
        participant.upperWins = 0;
        participant.upperLosses = 0;
        participant.lowerWins = 0;
        participant.lowerLosses = 0;
        participant.kingQualified = false;
        participant.relicUsedAt = now;
        clearAssignment(participant);
    }
    return relicType;
}

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
        // Self-heal records left behind by older versions of player deletion.
        await pruneRemovedStage2Participants();
        await repairLegacyUpperDemotions();
        await repairLegacyKings();
        // Besides repairing legacy records, fill any schedule holes left by an
        // older greedy matchmaking run. This also upgrades existing pairs that
        // were created before the map catalog had been initialized.
        await queueAutoAssignment();
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
        const assignedIds = new Set();
        if (own?.assignedOpponentId) assignedIds.add(String(own.assignedOpponentId));
        if (own?.encounterStatus === 'pending' && own?.encounterOpponentId) assignedIds.add(String(own.encounterOpponentId));
        const revealAll = viewer.isAdmin && req.query.revealNames === '1';
        const hasTierVision = own?.relicType === 'tier_vision';
        const sanitized = participants.map(participant => {
            const isSelf = Boolean(own && String(own.id) === String(participant.id));
            const assignedToViewer = Boolean(own && assignedIds.has(String(participant.playerId)));
            const viewerAssignedToParticipant = Boolean(own && String(participant.assignedOpponentId || '') === String(own.playerId));
            const isOpponent = assignedToViewer || viewerAssignedToParticipant;
            const maySeeName = revealAll || isSelf || isOpponent || Boolean(hasTierVision && participant.tier === own.tier);
            return {
                id: participant.id,
                playerId: viewer.isAdmin ? participant.playerId : undefined,
                tier: participant.tier,
                status: participant.status,
                upperWins: participant.upperWins,
                upperLosses: participant.upperLosses,
                lowerWins: participant.lowerWins,
                lowerLosses: participant.lowerLosses,
                kingQualified: participant.kingQualified,
                arenaShield: Boolean(participant.arenaShield),
                relicClaimed: isSelf || viewer.isAdmin ? hasClaimedRelic(participant) : undefined,
                relicType: isSelf || viewer.isAdmin ? participant.relicType : undefined,
                relicUsedAt: isSelf || viewer.isAdmin ? participant.relicUsedAt : undefined,
                winStreak: isSelf ? Math.max(Number(participant.winStreak) || 0, ownWinStreak) : undefined,
                specialMoveReady: isSelf || viewer.isAdmin ? Boolean(participant.specialMoveReady) : undefined,
                mysteryUsed: isSelf ? Boolean(participant.mysteryUsed) : undefined,
                specialPath: isSelf || viewer.isAdmin ? participant.specialPath : undefined,
                encounterType: isSelf || viewer.isAdmin ? participant.encounterType : undefined,
                encounterOpponentName: viewer.isAdmin || (isSelf && participant.encounterStatus === 'pending') ? participant.encounterOpponentName : undefined,
                encounterStatus: isSelf || viewer.isAdmin ? participant.encounterStatus : undefined,
                assignedOpponentId: isSelf || viewer.isAdmin ? participant.assignedOpponentId : undefined,
                assignedAt: isSelf || viewer.isAdmin ? participant.assignedAt : undefined,
                assignedMapId: isSelf || isOpponent || viewer.isAdmin ? participant.assignedMapId : undefined,
                assignedMapTitle: isSelf || isOpponent || viewer.isAdmin ? participant.assignedMapTitle : undefined,
                assignedMapBiome: isSelf || isOpponent || viewer.isAdmin ? participant.assignedMapBiome : undefined,
                assignedMapSeason: isSelf || isOpponent || viewer.isAdmin ? participant.assignedMapSeason : undefined,
                assignedMaps: isSelf || isOpponent || viewer.isAdmin ? participant.assignedMaps : undefined,
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
            const tier = ({ 1: 'C', 2: 'B', 3: 'A', 4: 'S' })[numericTier];
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
        const assigned = await queueAutoAssignment();
        res.json({ initialized, assigned });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Hook for an encounter reward or an admin action. Shields never stack.
router.post('/stage2/:id/arena-shield', checkAuth, async (req, res) => {
    try {
        const participant = await Stage2Participant.findById(req.params.id);
        if (!participant) return res.status(404).json({ error: 'Stage 2 participant not found' });
        participant.arenaShield = req.body.enabled !== false;
        if (participant.arenaShield) {
            participant.arenaShieldUsedAt = null;
            participant.relicType = 'arena_shield';
            participant.relicAwardedAt = participant.relicAwardedAt || new Date();
            participant.relicUsedAt = null;
        }
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
        if (path === 'mystery' && hasClaimedRelic(participant)) {
            return res.status(409).json({ error: 'A player who has claimed the Arena Shield cannot enter Mystery Road again' });
        }
        participant.specialMoveReady = false;
        participant.specialPath = path;
        participant.encounterType = null;
        participant.encounterOpponentId = null;
        participant.encounterOpponentName = null;
        participant.encounterStatus = null;
        if (path === 'mystery') {
            const playedDuels = await Duel.find({
                $or: [
                    { 'playerA.playerId': participant.playerId },
                    { 'playerB.playerId': participant.playerId }
                ]
            }).select('playerA.playerId playerB.playerId');
            const playedOpponentIds = playedDuels.map(duel => String(duel.playerA.playerId) === String(participant.playerId)
                ? String(duel.playerB.playerId)
                : String(duel.playerA.playerId));
            const reservedBossIds = (await Stage2Participant.find({
                encounterStatus: { $in: ['awaiting_admin', 'pending'] },
                encounterOpponentId: { $ne: null }
            }).select('encounterOpponentId')).map(entry => String(entry.encounterOpponentId));
            const candidates = await Stage2Participant.find({
                _id: { $ne: participant._id },
                playerId: { $nin: [...playedOpponentIds, ...reservedBossIds] },
                status: { $ne: 'eliminated' },
                arenaShield: { $ne: true },
                arenaShieldUsedAt: null,
                relicType: null,
                relicAwardedAt: null,
                assignedOpponentId: null,
                specialMoveReady: { $ne: true },
                encounterStatus: { $nin: ['awaiting_admin', 'pending'] }
            });
            if (!candidates.length) return res.status(409).json({ error: 'No encounter opponent is available' });
            const sameTierCandidates = candidates.filter(candidate => candidate.tier === participant.tier);
            let opponent = chooseRandom(sameTierCandidates);
            if (!opponent) {
                const candidatePlayerIds = candidates.map(candidate => candidate.playerId);
                const playerIds = [participant.playerId, ...candidatePlayerIds];
                const players = await Player.find({ _id: { $in: playerIds } }).select('_id battleTag currentMmr');
                const stats = await PlayerStats.find({
                    battleTag: { $in: players.map(player => player.battleTag).filter(Boolean) }
                }).select('battleTag mmr');
                const playersById = new Map(players.map(player => [String(player.id), player]));
                const statsByTag = new Map(stats.filter(stat => stat.battleTag).map(stat => [String(stat.battleTag).toLowerCase(), stat]));
                const tierMidpoint = { C: 1075, B: 1450, A: 1700, S: 1900 };
                const getMmr = candidate => {
                    const player = playersById.get(String(candidate.playerId));
                    const stat = statsByTag.get(String(player?.battleTag || candidate.battleTag || '').toLowerCase());
                    return Number(stat?.mmr || player?.currentMmr || tierMidpoint[candidate.tier] || 0);
                };
                const challengerMmr = getMmr(participant);
                opponent = [...candidates].sort((first, second) =>
                    Math.abs(getMmr(first) - challengerMmr) - Math.abs(getMmr(second) - challengerMmr)
                )[0];
            }
            participant.encounterType = Math.random() < .5 ? 'dragon' : 'dungeon';
            participant.encounterOpponentId = opponent.playerId;
            participant.encounterOpponentName = opponent.name;
            participant.encounterStatus = 'awaiting_admin';
            participant.encounterRevealedAt = null;
            participant.mysteryUsed = true;
        }
        participant.updatedAt = new Date();
        await participant.save();
        if (path === 'safe') await queueAutoAssignment();
        // The selected player's identity stays server-side until an admin opens the match.
        res.json({ path, encounterType: participant.encounterType, encounterStatus: participant.encounterStatus });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Only an admin can announce a regular pairing. Until then both tokens stay anonymous.
router.post('/stage2/assign-match', checkAuth, async (req, res) => {
    try {
        const { playerAId, playerBId } = req.body;
        if (!playerAId || !playerBId || playerAId === playerBId)
            return res.status(400).json({ error: 'Select two different participants' });
        const [a, b] = await Promise.all([
            Stage2Participant.findById(playerAId),
            Stage2Participant.findById(playerBId)
        ]);
        if (!a || !b) return res.status(404).json({ error: 'Stage 2 participant not found' });
        if (a.status === 'eliminated' || b.status === 'eliminated')
            return res.status(409).json({ error: 'Eliminated players cannot be assigned' });
        const center = value => ['s_bracket', 'king'].includes(value);
        if (a.tier !== b.tier || (!(center(a.status) && center(b.status)) && a.status !== b.status))
            return res.status(409).json({ error: 'Players must be in the same tier and bracket' });
        const now = new Date();
        a.assignedOpponentId = b.playerId; a.assignedAt = now;
        b.assignedOpponentId = a.playerId; b.assignedAt = now;
        const tournamentMaps = await loadTournamentMaps();
        const arenaMatch = center(a.status) || center(b.status);
        applyAssignedMaps(a, b, chooseMapSeries(tournamentMaps.filter(map => arenaMatch ? map.kind === 'arena' : map.kind !== 'arena')));
        await Promise.all([a.save(), b.save()]);
        res.json({ success: true, playerA: a.name, playerB: b.name, assignedAt: now, assignedMaps: a.assignedMaps });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/stage2/unassign-match', checkAuth, async (req, res) => {
    try {
        const participant = await Stage2Participant.findById(req.body.participantId);
        if (!participant) return res.status(404).json({ error: 'Stage 2 participant not found' });
        const opponent = participant.assignedOpponentId
            ? await Stage2Participant.findOne({ playerId: participant.assignedOpponentId })
            : null;
        clearAssignment(participant);
        if (opponent && String(opponent.assignedOpponentId || '') === String(participant.playerId)) clearAssignment(opponent);
        await Promise.all([participant.save(), opponent?.save()].filter(Boolean));
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/stage2/auto-assign', checkAuth, async (req, res) => {
    try {
        const assigned = await queueAutoAssignment();
        const summary = await matchmakingSummary();
        res.json({ assigned, count: assigned.length, summary });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// The encounter is generated secretly; this admin action is the moment its opponent is revealed.
router.post('/stage2/:id/reveal-encounter', checkAuth, async (req, res) => {
    try {
        const participant = await Stage2Participant.findById(req.params.id);
        if (!participant) return res.status(404).json({ error: 'Stage 2 participant not found' });
        if (participant.encounterStatus !== 'awaiting_admin' || !participant.encounterOpponentId)
            return res.status(409).json({ error: 'No hidden encounter is waiting' });
        participant.encounterStatus = 'pending';
        participant.encounterRevealedAt = new Date();
        await participant.save();
        res.json({ encounterType: participant.encounterType, opponentName: participant.encounterOpponentName });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/stage2/:id/cancel-encounter', checkAuth, async (req, res) => {
    try {
        const participant = await Stage2Participant.findById(req.params.id);
        if (!participant) return res.status(404).json({ error: 'Stage 2 participant not found' });
        if (!['awaiting_admin', 'pending'].includes(participant.encounterStatus)) {
            return res.status(409).json({ error: 'No active encounter to cancel' });
        }
        participant.encounterType = null;
        participant.encounterOpponentId = null;
        participant.encounterOpponentName = null;
        participant.encounterStatus = null;
        participant.encounterRevealedAt = null;
        participant.specialPath = null;
        participant.specialMoveReady = true;
        participant.mysteryUsed = false;
        participant.updatedAt = new Date();
        await participant.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/stage2/:id/use-relic', async (req, res) => {
    try {
        const viewer = await getStage2Viewer(req);
        const participant = await Stage2Participant.findById(req.params.id);
        if (!participant) return res.status(404).json({ error: 'Stage 2 participant not found' });
        const ownsParticipant = viewer.participant && String(viewer.participant.id) === String(participant.id);
        if (!viewer.isAdmin && !ownsParticipant) return res.status(403).json({ error: 'Not allowed' });
        if (participant.relicUsedAt) return res.status(409).json({ error: 'This relic has already been used' });
        if (!['opponent_skip', 'map_reroll'].includes(participant.relicType)) {
            return res.status(409).json({ error: 'This relic is passive or activates automatically' });
        }
        const opponent = participant.assignedOpponentId
            ? await Stage2Participant.findOne({ playerId: participant.assignedOpponentId })
            : null;
        if (!opponent) return res.status(409).json({ error: 'No assigned opponent' });

        if (participant.relicType === 'opponent_skip') {
            if (!participant.avoidedOpponentIds.includes(String(opponent.playerId))) {
                participant.avoidedOpponentIds.push(String(opponent.playerId));
            }
            clearAssignment(participant);
            clearAssignment(opponent);
        } else {
            const arenaMatch = ['king', 's_bracket'].includes(participant.status);
            const alternatives = (await loadTournamentMaps()).filter(map => (arenaMatch ? map.kind === 'arena' : map.kind !== 'arena') && String(map.labelId) !== String(participant.assignedMapLabelId));
            const replacement = chooseRandom(alternatives);
            if (!replacement) return res.status(409).json({ error: 'No map from another biome is available' });
            applyAssignedMaps(participant, opponent, chooseMapSeries(alternatives, replacement));
        }
        participant.relicUsedAt = new Date();
        participant.updatedAt = opponent.updatedAt = new Date();
        await Promise.all([participant.save(), opponent.save()]);
        if (participant.relicType === 'opponent_skip') await queueAutoAssignment();
        res.json({ success: true, relicType: participant.relicType, assignedMapTitle: participant.assignedMapTitle, assignedMaps: participant.assignedMaps });
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
        const tierNumber = { C: 1, B: 2, A: 3, S: 4 };
        const duel = await Duel.create({
            phase: 'encounter', tierGroup: challenger.tier,
            playerA: { playerId: challenger.playerId, battleTag: challenger.battleTag, name: challenger.name, tier: tierNumber[challenger.tier], points: 0 },
            playerB: { playerId: opponent.playerId, battleTag: opponent.battleTag, name: opponent.name, tier: tierNumber[opponent.tier], points: 0 },
            winner: challengerWon ? 'A' : 'B', score: challengerWon ? '2:0' : '0:2',
            notes: `${challenger.encounterType || 'special'} encounter`, playedAt: req.body.playedAt || new Date()
        });
        challenger.encounterStatus = challengerWon ? 'won' : 'lost';
        let relicType = null;
        if (challengerWon) {
            relicType = await awardRandomRelic(challenger);
        }
        challenger.updatedAt = new Date();
        await challenger.save();
        await queueAutoAssignment();
        res.status(201).json({ duel, encounterStatus: challenger.encounterStatus, relicType, arenaShield: challenger.arenaShield });
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
        const groupA = ({ 1: 'C', 2: 'B', 3: 'A', 4: 'S' })[tierA], groupB = ({ 1: 'C', 2: 'B', 3: 'A', 4: 'S' })[tierB];
        if (!groupA || !groupB) return res.status(400).json({ error: 'Both players must belong to B, A, or S tier' });
        const [pa, pb] = await Promise.all([Stage2Participant.findOne({ playerId: a.id }), Stage2Participant.findOne({ playerId: b.id })]);
        if (!pa || !pb) return res.status(400).json({ error: 'Initialize Stage 2 first' });
        const isKingMatch = pa.status === 'king' || pb.status === 'king';
        const isCenterMatch = ['s_bracket', 'king'].includes(pa.status) && ['s_bracket', 'king'].includes(pb.status);
        if (groupA !== groupB || (!isCenterMatch && pa.status !== pb.status)) return res.status(400).json({ error: 'Players must be in the same tier and bracket' });
        const previousDuel = await Duel.exists({
            phase: { $ne: 'encounter' },
            $or: [
                { 'playerA.playerId': a.id, 'playerB.playerId': b.id },
                { 'playerA.playerId': b.id, 'playerB.playerId': a.id }
            ]
        });
        if (previousDuel) return res.status(409).json({ error: 'These players have already played each other' });
        const phase = isKingMatch ? 'king' : pa.status;
        const scoreMatch = String(score || '').trim().match(/^(\d+)\s*[:\-]\s*(\d+)$/);
        if (!scoreMatch) return res.status(400).json({ error: 'Enter a BO3 score such as 2:0 or 2:1' });
        const mapsA = Number(scoreMatch[1]), mapsB = Number(scoreMatch[2]);
        if (!((mapsA === 2 && mapsB <= 1) || (mapsB === 2 && mapsA <= 1)) || (winner === 'A') !== (mapsA > mapsB))
            return res.status(400).json({ error: 'Winner and BO3 score do not match' });

        // Selecting both players in the admin result form is itself an explicit
        // assignment. Release any old automatic pairings before recording it.
        const displacedOpponentIds = [pa.assignedOpponentId, pb.assignedOpponentId]
            .filter(Boolean)
            .map(String)
            .filter(id => id !== String(pa.playerId) && id !== String(pb.playerId));
        if (displacedOpponentIds.length) {
            await Stage2Participant.updateMany(
                { playerId: { $in: displacedOpponentIds } },
                { $set: { assignedOpponentId: null, assignedAt: null } }
            );
        }
        const isCurrentPair = String(pa.assignedOpponentId || '') === String(pb.playerId);
        if ((pa.assignedMaps || []).length < 3 || !isCurrentPair) {
            const maps = await loadTournamentMaps();
            const eligibleMaps = maps.filter(map => phase === 'king' || phase === 's_bracket' ? map.kind === 'arena' : map.kind !== 'arena');
            const existingMap = isCurrentPair && pa.assignedMapId
                ? eligibleMaps.find(map => String(map.id) === String(pa.assignedMapId)) || {
                    id: pa.assignedMapId,
                    title: pa.assignedMapTitle || 'Assigned map',
                    labelId: pa.assignedMapLabelId,
                    biomeName: pa.assignedMapBiome,
                    season: pa.assignedMapSeason
                }
                : null;
            applyAssignedMaps(pa, pb, chooseMapSeries(eligibleMaps, existingMap));
        }

        const duel = await Duel.create({
            phase, tierGroup: phase === 'king' ? 'S' : groupA,
            playerA: { playerId: a.id, battleTag: a.battleTag, name: a.name, tier: tierA, points: 0 },
            playerB: { playerId: b.id, battleTag: b.battleTag, name: b.name, tier: tierB, points: 0 },
            winner, score: `${mapsA}:${mapsB}`, notes, playedAt: playedAt || new Date(),
            assignedMapId: pa.assignedMapId,
            assignedMapTitle: pa.assignedMapTitle,
            assignedMapLabelId: pa.assignedMapLabelId,
            assignedMapBiome: pa.assignedMapBiome,
            assignedMapSeason: pa.assignedMapSeason,
            assignedMaps: pa.assignedMaps
        });
        const winnerP = winner === 'A' ? pa : pb, loserP = winner === 'A' ? pb : pa;
        winnerP.winStreak = (Number(winnerP.winStreak) || 0) + 1;
        loserP.winStreak = 0;
        loserP.specialMoveReady = false;
        if (['upper', 'lower'].includes(phase) && !winnerP.mysteryUsed && !hasClaimedRelic(winnerP)) winnerP.specialMoveReady = true;
        if (!pa.opponents.includes(String(pb.playerId))) pa.opponents.push(String(pb.playerId));
        if (!pb.opponents.includes(String(pa.playerId))) pb.opponents.push(String(pa.playerId));
        pa.mapWins += mapsA; pa.mapLosses += mapsB; pb.mapWins += mapsB; pb.mapLosses += mapsA;
        const globalShieldProtected = loserP.relicType === 'global_shield' && !loserP.relicUsedAt;
        if (globalShieldProtected) loserP.relicUsedAt = new Date();
        if (phase === 'upper') {
            winnerP.upperWins++;
            if (winnerP.upperWins >= 3) winnerP.status = 's_bracket';
            if (!globalShieldProtected) {
                loserP.upperLosses = (Number(loserP.upperLosses) || 0) + 1;
                if (loserP.upperLosses >= 2) loserP.status = 'lower';
            }
        } else if (phase === 'lower') {
            winnerP.lowerWins++;
            if (winnerP.lowerWins >= 3) winnerP.status = 's_bracket';
            if (!globalShieldProtected) {
                loserP.lowerLosses = (Number(loserP.lowerLosses) || 0) + 1;
                loserP.status = 'eliminated';
            }
        } else if (phase === 's_bracket') {
            const shieldProtected = globalShieldProtected || Boolean(loserP.arenaShield);
            if (shieldProtected) {
                if (!globalShieldProtected) {
                    loserP.arenaShield = false;
                    loserP.arenaShieldUsedAt = new Date();
                    loserP.relicUsedAt = new Date();
                }
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
            const kingProtected = globalShieldProtected || loserP.arenaShield;
            if (loserP.status === 'king' && kingProtected) {
                // The challenger breaks the king's shield and stays for a rematch.
                if (!globalShieldProtected) {
                    loserP.arenaShield = false;
                    loserP.arenaShieldUsedAt = new Date();
                    loserP.relicUsedAt = new Date();
                }
                loserP.status = 'king';
                loserP.kingQualified = true;
                winnerP.status = 's_bracket';
            } else if (kingProtected) {
                // A shielded challenger remains in the arena after losing to the king.
                if (!globalShieldProtected) {
                    loserP.arenaShield = false;
                    loserP.arenaShieldUsedAt = new Date();
                    loserP.relicUsedAt = new Date();
                }
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
        clearAssignment(pa);
        clearAssignment(pb);
        await Promise.all([pa.save(), pb.save()]);
        await queueAutoAssignment();
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
