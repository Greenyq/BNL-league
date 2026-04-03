const express  = require('express');
const bcrypt   = require('bcrypt');
const crypto   = require('crypto');
const { Player, PlayerStats, PlayerCache, ManualPointsAdjustment,
        PlayerUser, PlayerSession } = require('../models/Player');
const { checkAuth } = require('../middleware/auth');
const { recalculateAllPlayerStats } = require('../services/scoring');
const { searchPlayer } = require('../services/w3champions');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isValidBattleTag = t => /^[a-zA-Z0-9_\u0400-\u04FF]{2,12}#\d+$/.test(t) && t.length <= 30;

async function getPlayerSession(req) {
    const sessionId = req.headers['x-player-session-id'];
    if (!sessionId) return null;
    const session = await PlayerSession.findOne({ sessionId });
    if (!session || session.expiresAt < new Date()) return null;
    return session;
}

// ── Public: all players with stats ───────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const players  = await Player.find();
        const stats    = await PlayerStats.find();
        const statsMap = Object.fromEntries(stats.map(s => [s.battleTag, s]));
        res.json(players.map(p => ({ ...p.toJSON(), stats: statsMap[p.battleTag] || null })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

// ── Public: W3C search (must be before /:battleTag) ──────────────────────────
router.get('/w3c/search/:battleTag', async (req, res) => {
    try {
        const data = await searchPlayer(decodeURIComponent(req.params.battleTag));
        if (!data) return res.status(404).json({ error: 'Not found on W3Champions' });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'W3Champions lookup failed' });
    }
});

// ── Player Auth ───────────────────────────────────────────────────────────────

// Register
router.post('/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
        if (typeof username !== 'string' || username.length < 3 || username.length > 30)
            return res.status(400).json({ error: 'Username must be 3–30 characters' });
        if (typeof password !== 'string' || password.length < 6)
            return res.status(400).json({ error: 'Password must be at least 6 characters' });

        if (await PlayerUser.findOne({ username }))
            return res.status(400).json({ error: 'Username already taken' });

        const passwordHash = await bcrypt.hash(password, 10);
        const playerUser   = await PlayerUser.create({ username, passwordHash });

        const sessionId = crypto.randomBytes(32).toString('hex');
        await PlayerSession.create({ sessionId, playerUserId: playerUser.id, expiresAt: new Date(Date.now() + SESSION_TTL) });

        res.json({ success: true, sessionId, user: playerUser });
    } catch (err) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

        const playerUser = await PlayerUser.findOne({ username });
        if (!playerUser || !await bcrypt.compare(password, playerUser.passwordHash))
            return res.status(401).json({ error: 'Invalid username or password' });

        const expiresAt = new Date(Date.now() + SESSION_TTL);
        let session     = await PlayerSession.findOne({ playerUserId: playerUser.id });
        if (session) {
            session.timestamp = Date.now(); session.expiresAt = expiresAt;
            await session.save();
        } else {
            const sessionId = crypto.randomBytes(32).toString('hex');
            session = await PlayerSession.create({ sessionId, playerUserId: playerUser.id, expiresAt });
        }

        let playerData = null;
        if (playerUser.linkedBattleTag)
            playerData = await Player.findOne({ battleTag: playerUser.linkedBattleTag });

        res.json({ success: true, sessionId: session.sessionId, user: playerUser, playerData });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
router.get('/auth/me', async (req, res) => {
    try {
        const session = await getPlayerSession(req);
        if (!session) return res.status(401).json({ error: 'Not authenticated' });

        const playerUser = await PlayerUser.findById(session.playerUserId);
        if (!playerUser) return res.status(401).json({ error: 'User not found' });

        let playerData = null;
        if (playerUser.linkedBattleTag)
            playerData = await Player.findOne({ battleTag: playerUser.linkedBattleTag });

        res.json({ user: playerUser, playerData });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Logout
router.post('/auth/logout', async (req, res) => {
    try {
        const sessionId = req.headers['x-player-session-id'];
        if (sessionId) await PlayerSession.deleteOne({ sessionId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Link BattleTag
router.put('/auth/link-battletag', async (req, res) => {
    try {
        const session = await getPlayerSession(req);
        if (!session) return res.status(401).json({ error: 'Not authenticated' });

        let { battleTag } = req.body;
        if (!battleTag) return res.status(400).json({ error: 'BattleTag is required' });
        battleTag = battleTag.trim();
        if (!isValidBattleTag(battleTag)) return res.status(400).json({ error: 'Invalid BattleTag format (Name#1234)' });

        // Find in DB (case-insensitive) or auto-create from W3C
        let player = await Player.findOne({ battleTag: { $regex: new RegExp(`^${escapeRegex(battleTag)}$`, 'i') } });
        if (!player) {
            const w3c = await searchPlayer(battleTag);
            if (!w3c || !Array.isArray(w3c)) return res.status(404).json({ error: 'BattleTag not found in W3Champions' });
            const solo = w3c.find(m => m.gameMode === 1) || {};
            player = await Player.create({
                battleTag,
                name: battleTag.split('#')[0],
                race: solo.race || 0,
                mainRace: solo.race || 0,
                currentMmr: solo.mmr || 0,
            });
        }

        // Check not already linked to another account
        const existing = await PlayerUser.findOne({ linkedBattleTag: player.battleTag });
        if (existing && existing.id !== session.playerUserId.toString())
            return res.status(400).json({ error: 'BattleTag already linked to another account' });

        const playerUser = await PlayerUser.findByIdAndUpdate(
            session.playerUserId,
            { linkedBattleTag: player.battleTag, updatedAt: Date.now() },
            { new: true }
        );
        res.json({ success: true, user: playerUser, linkedPlayer: player });
    } catch (err) {
        res.status(500).json({ error: 'Failed to link BattleTag' });
    }
});

// Unlink BattleTag
router.delete('/auth/unlink-battletag', async (req, res) => {
    try {
        const session = await getPlayerSession(req);
        if (!session) return res.status(401).json({ error: 'Not authenticated' });

        const playerUser = await PlayerUser.findById(session.playerUserId);
        if (!playerUser?.linkedBattleTag) return res.status(400).json({ error: 'No BattleTag linked' });

        await Player.findOneAndUpdate({ battleTag: playerUser.linkedBattleTag }, { selectedPortrait: null, selectedPortraitId: null });
        const updated = await PlayerUser.findByIdAndUpdate(session.playerUserId, { linkedBattleTag: null }, { new: true });
        res.json({ success: true, user: updated });
    } catch (err) {
        res.status(500).json({ error: 'Failed to unlink BattleTag' });
    }
});

// Select portrait (requires linked BattleTag)
router.put('/auth/select-portrait', async (req, res) => {
    try {
        const session = await getPlayerSession(req);
        if (!session) return res.status(401).json({ error: 'Not authenticated' });

        const { portrait } = req.body; // portrait = image URL
        if (!portrait) return res.status(400).json({ error: 'portrait is required' });

        const playerUser = await PlayerUser.findById(session.playerUserId);
        if (!playerUser?.linkedBattleTag) return res.status(400).json({ error: 'Must link BattleTag first' });

        await Player.findOneAndUpdate(
            { battleTag: playerUser.linkedBattleTag },
            { selectedPortrait: portrait, updatedAt: Date.now() }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to select portrait' });
    }
});

// Select main race (requires linked BattleTag)
router.put('/auth/select-race', async (req, res) => {
    try {
        const session = await getPlayerSession(req);
        if (!session) return res.status(401).json({ error: 'Not authenticated' });

        const { race } = req.body;
        if (![0, 1, 2, 4, 8].includes(Number(race))) return res.status(400).json({ error: 'Invalid race' });

        const playerUser = await PlayerUser.findById(session.playerUserId);
        if (!playerUser?.linkedBattleTag) return res.status(400).json({ error: 'Must link BattleTag first' });

        await Player.findOneAndUpdate(
            { battleTag: playerUser.linkedBattleTag },
            { mainRace: Number(race), race: Number(race), updatedAt: Date.now() }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to select race' });
    }
});

// ── Public: single player by battleTag ───────────────────────────────────────
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

// ── Admin endpoints ───────────────────────────────────────────────────────────
router.use(checkAuth);

router.post('/', async (req, res) => {
    try {
        res.json(await Player.create(req.body));
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

router.post('/:battleTag/points', async (req, res) => {
    try {
        const { amount, reason } = req.body;
        const player = await Player.findOne({ battleTag: req.params.battleTag });
        if (!player) return res.status(404).json({ error: 'Player not found' });
        res.json(await ManualPointsAdjustment.create({ playerId: player._id.toString(), battleTag: player.battleTag, amount, reason }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/admin/recalculate', async (req, res) => {
    try {
        const result = await recalculateAllPlayerStats();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
