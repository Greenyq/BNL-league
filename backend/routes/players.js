const express  = require('express');
const bcrypt   = require('bcrypt');
const crypto   = require('crypto');
const { Player, PlayerStats, PlayerCache, ManualPointsAdjustment,
        PlayerUser, PlayerSession, PasswordReset } = require('../models/Player');
const { checkAuth } = require('../middleware/auth');
const { recalculateAllPlayerStats } = require('../services/scoring');
const { searchPlayer, searchPlayers } = require('../services/w3champions');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isValidBattleTag = t => /^[a-zA-Z0-9_\u0400-\u04FF]{2,12}#\d+$/.test(t) && t.length <= 30;

// Returns player doc merged with stats (or null). Case-insensitive battleTag lookup.
async function playerWithStats(battleTag) {
    if (!battleTag) return null;
    const player = await Player.findOne({
        battleTag: { $regex: new RegExp(`^${escapeRegex(battleTag.trim())}$`, 'i') }
    });
    if (!player) return null;
    const stats = await PlayerStats.findOne({ battleTag: player.battleTag });
    return { ...player.toJSON(), stats: stats ? stats.toJSON() : null };
}

// Case-insensitive query for Player by battleTag
function playerQ(battleTag) {
    return { battleTag: { $regex: new RegExp(`^${escapeRegex(battleTag.trim())}$`, 'i') } };
}

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
router.get('/w3c/autocomplete/:query', async (req, res) => {
    try {
        const query = decodeURIComponent(req.params.query || '').trim();
        if (query.length < 3) return res.json([]);

        const data = await searchPlayers(query, { pageSize: 10 });
        res.json(data.map(p => ({
            battleTag: p.battleTag,
            name: p.name || (p.battleTag ? p.battleTag.split('#')[0] : ''),
        })));
    } catch (err) {
        res.status(500).json({ error: 'W3Champions autocomplete failed' });
    }
});

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

        const playerData = await playerWithStats(playerUser.linkedBattleTag);
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

        const playerData = await playerWithStats(playerUser.linkedBattleTag);
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

        // Store player.battleTag (canonical casing from DB) not what user typed
        const playerUser = await PlayerUser.findByIdAndUpdate(
            session.playerUserId,
            { linkedBattleTag: player.battleTag, updatedAt: Date.now() },
            { new: true }
        );
        const linkedPlayer = await playerWithStats(player.battleTag);
        res.json({ success: true, user: playerUser, linkedPlayer });
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

        await Player.findOneAndUpdate(playerQ(playerUser.linkedBattleTag), { selectedPortrait: null, selectedPortraitId: null });
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

        const updated = await Player.findOneAndUpdate(
            playerQ(playerUser.linkedBattleTag),
            { selectedPortrait: portrait, updatedAt: Date.now() },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Player not found — re-link your BattleTag' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to select portrait' });
    }
});

// Toggle draft availability (requires linked BattleTag)
router.put('/auth/toggle-draft', async (req, res) => {
    try {
        const session = await getPlayerSession(req);
        if (!session) return res.status(401).json({ error: 'Not authenticated' });

        const playerUser = await PlayerUser.findById(session.playerUserId);
        if (!playerUser?.linkedBattleTag) return res.status(400).json({ error: 'Must link BattleTag first' });

        const player = await Player.findOne(playerQ(playerUser.linkedBattleTag));
        if (!player) return res.status(404).json({ error: 'Player not found' });

        const updated = await Player.findByIdAndUpdate(
            player._id,
            { draftAvailable: !player.draftAvailable, draftAvailableUpdatedAt: new Date() },
            { new: true }
        );
        res.json({ success: true, draftAvailable: updated.draftAvailable });
    } catch (err) {
        res.status(500).json({ error: 'Failed to toggle draft availability' });
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

        const updated = await Player.findOneAndUpdate(
            playerQ(playerUser.linkedBattleTag),
            { mainRace: Number(race), race: Number(race), updatedAt: Date.now() },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Player not found — re-link your BattleTag' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to select race' });
    }
});

// ── Password Reset ───────────────────────────────────────────────────────────

// Request password reset (generates 6-digit code, 1-hour expiry)
router.post('/auth/request-reset', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: 'Username is required' });

        const playerUser = await PlayerUser.findOne({ username });
        if (!playerUser) return res.status(404).json({ error: 'User not found' });

        // Remove any existing reset for this user
        await PasswordReset.deleteMany({ username });

        const resetCode = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
        await PasswordReset.create({
            username,
            resetCode,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create reset request' });
    }
});

// Complete password reset with code
router.post('/auth/reset-password', async (req, res) => {
    try {
        const { username, resetCode, newPassword } = req.body;
        if (!username || !resetCode || !newPassword)
            return res.status(400).json({ error: 'All fields are required' });
        if (typeof newPassword !== 'string' || newPassword.length < 6)
            return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const reset = await PasswordReset.findOne({ username, resetCode });
        if (!reset) return res.status(400).json({ error: 'Invalid reset code' });
        if (reset.expiresAt < new Date()) {
            await PasswordReset.deleteOne({ _id: reset._id });
            return res.status(400).json({ error: 'Reset code expired' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await PlayerUser.findOneAndUpdate({ username }, { passwordHash, updatedAt: Date.now() });

        // Clean up: delete reset request and all sessions for this user
        await PasswordReset.deleteMany({ username });
        const playerUser = await PlayerUser.findOne({ username });
        if (playerUser) await PlayerSession.deleteMany({ playerUserId: playerUser.id });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reset password' });
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
        const battleTag = req.body?.battleTag ? String(req.body.battleTag).trim() : '';
        if (!battleTag) return res.status(400).json({ error: 'battleTag is required' });

        const existing = await Player.findOne(playerQ(battleTag));
        if (existing) return res.status(409).json({ error: 'Player already added' });

        res.json(await Player.create({ ...req.body, battleTag }));
    } catch (err) {
        if (err?.code === 11000) return res.status(409).json({ error: 'Player already added' });
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

// Admin: list pending password reset requests
router.get('/admin/pending-resets', async (req, res) => {
    try {
        const resets = await PasswordReset.find().sort({ createdAt: -1 });
        res.json(resets);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch resets' });
    }
});

// Admin: delete a password reset request
router.delete('/admin/pending-resets/:id', async (req, res) => {
    try {
        await PasswordReset.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete reset' });
    }
});

// Admin: list all PlayerUser accounts (for account management)
router.get('/admin/accounts', async (req, res) => {
    try {
        const accounts = await PlayerUser.find().sort({ createdAt: -1 });
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
});

// Admin: delete a PlayerUser account completely (unlinks BattleTag, deletes sessions)
router.delete('/admin/accounts/:id', async (req, res) => {
    try {
        const account = await PlayerUser.findById(req.params.id);
        if (!account) return res.status(404).json({ error: 'Account not found' });

        // Unlink BattleTag from Player record if linked
        if (account.linkedBattleTag) {
            await Player.findOneAndUpdate(
                { battleTag: { $regex: new RegExp(`^${escapeRegex(account.linkedBattleTag)}$`, 'i') } },
                { selectedPortrait: null, selectedPortraitId: null }
            );
        }

        // Delete all sessions and password resets for this user
        await PlayerSession.deleteMany({ playerUserId: account.id });
        await PasswordReset.deleteMany({ username: account.username });

        // Delete the account
        await PlayerUser.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// Admin: force-unlink a BattleTag from any/all accounts that still reference it
router.delete('/admin/force-unlink-battletag/:battleTag', async (req, res) => {
    try {
        const battleTag = decodeURIComponent(req.params.battleTag);
        const result = await PlayerUser.updateMany(
            { linkedBattleTag: { $regex: new RegExp(`^${escapeRegex(battleTag)}$`, 'i') } },
            { $set: { linkedBattleTag: null, updatedAt: new Date() } }
        );
        res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (err) {
        res.status(500).json({ error: 'Failed to force-unlink BattleTag' });
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
