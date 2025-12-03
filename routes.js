const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Team, Player, TeamMatch, Portrait, Streamer, PlayerUser, PlayerSession, PasswordReset } = require('./models');

const router = express.Router();

// ==================== TEAMS ENDPOINTS ====================
router.get('/teams', async (req, res) => {
    try {
        const teams = await Team.find();
        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
});

router.post('/admin/teams', async (req, res) => {
    try {
        const newTeam = await Team.create(req.body);
        res.json(newTeam);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create team' });
    }
});

router.put('/admin/teams/:id', async (req, res) => {
    try {
        const team = await Team.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        res.json(team);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update team' });
    }
});

router.delete('/admin/teams/:id', async (req, res) => {
    try {
        await Team.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete team' });
    }
});

// Note: Upload team logo route is defined in server.js with multer middleware

// ==================== PLAYERS ENDPOINTS ====================
router.get('/players', async (req, res) => {
    try {
        const players = await Player.find();
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

router.post('/admin/players/search', async (req, res) => {
    try {
        const { battleTag } = req.body;
        const apiUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&gateway=20&season=23&pageSize=10`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'BNL-League-App',
                'Accept': 'application/json'
            }
        });
        
        if (response.data.matches && response.data.matches.length > 0) {
            const firstMatch = response.data.matches[0];
            const playerTeam = firstMatch.teams.find(team =>
                team.players.some(p => p.battleTag === battleTag)
            );
            
            if (playerTeam) {
                const player = playerTeam.players.find(p => p.battleTag === battleTag);
                res.json({
                    found: true,
                    battleTag: player.battleTag,
                    name: player.name,
                    race: player.race,
                    currentMmr: player.currentMmr,
                    matchCount: response.data.count
                });
            } else {
                res.json({ found: false, message: 'Player not found in matches' });
            }
        } else {
            res.json({ found: false, message: 'No matches found for this player' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to search player', details: error.message });
    }
});

router.post('/admin/players', async (req, res) => {
    try {
        // Check if player already exists
        const existing = await Player.findOne({ battleTag: req.body.battleTag });
        if (existing) {
            return res.status(400).json({ error: 'Player already exists' });
        }
        
        const newPlayer = await Player.create(req.body);
        res.json(newPlayer);
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ error: 'Player already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create player' });
        }
    }
});

router.put('/admin/players/:id', async (req, res) => {
    try {
        const player = await Player.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update player' });
    }
});

router.delete('/admin/players/:id', async (req, res) => {
    try {
        await Player.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete player' });
    }
});

// ==================== TEAM MATCHES ENDPOINTS ====================
router.get('/team-matches', async (req, res) => {
    try {
        const matches = await TeamMatch.find().sort({ createdAt: -1 });
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

router.post('/admin/team-matches', async (req, res) => {
    try {
        const newMatch = await TeamMatch.create(req.body);
        res.json(newMatch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create match' });
    }
});

router.put('/admin/team-matches/:id', async (req, res) => {
    try {
        const match = await TeamMatch.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        res.json(match);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update match' });
    }
});

router.delete('/admin/team-matches/:id', async (req, res) => {
    try {
        await TeamMatch.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete match' });
    }
});

// ==================== PORTRAITS ENDPOINTS ====================
router.get('/portraits', async (req, res) => {
    try {
        const portraits = await Portrait.find().sort({ race: 1, pointsRequired: 1 });
        res.json(portraits);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch portraits' });
    }
});

router.post('/admin/portraits', async (req, res) => {
    try {
        const newPortrait = await Portrait.create(req.body);
        res.json(newPortrait);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create portrait' });
    }
});

router.put('/admin/portraits/:id', async (req, res) => {
    try {
        const portrait = await Portrait.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );
        if (!portrait) {
            return res.status(404).json({ error: 'Portrait not found' });
        }
        res.json(portrait);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update portrait' });
    }
});

router.delete('/admin/portraits/:id', async (req, res) => {
    try {
        await Portrait.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete portrait' });
    }
});

// ==================== STREAMERS ENDPOINTS ====================
router.get('/streamers', async (req, res) => {
    try {
        const streamers = await Streamer.find();
        res.json(streamers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch streamers' });
    }
});

router.post('/admin/streamers', async (req, res) => {
    try {
        const newStreamer = await Streamer.create(req.body);
        res.json(newStreamer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create streamer' });
    }
});

router.put('/admin/streamers/:id', async (req, res) => {
    try {
        const streamer = await Streamer.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );
        if (!streamer) {
            return res.status(404).json({ error: 'Streamer not found' });
        }
        res.json(streamer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update streamer' });
    }
});

router.delete('/admin/streamers/:id', async (req, res) => {
    try {
        await Streamer.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete streamer' });
    }
});

// ==================== TWITCH API ENDPOINT ====================
// Check if Twitch streamers are live
router.post('/twitch/check-live', async (req, res) => {
    try {
        const { usernames } = req.body;

        // This would require Twitch API credentials
        // For now, return mock data
        const liveData = usernames.map(username => ({
            username,
            isLive: Math.random() > 0.5, // Mock data
            viewerCount: Math.floor(Math.random() * 1000),
            title: `Playing Warcraft 3`,
            thumbnail: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${username}-440x248.jpg`
        }));

        res.json(liveData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to check Twitch status' });
    }
});

// ==================== PLAYER AUTHENTICATION ENDPOINTS ====================

// Player registration
router.post('/players/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Check if username already exists
        const existingUser = await PlayerUser.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const playerUser = await PlayerUser.create({
            username,
            passwordHash
        });

        // Create session
        const sessionId = crypto.randomBytes(32).toString('hex');
        await PlayerSession.create({
            sessionId,
            playerUserId: playerUser.id
        });

        res.json({
            success: true,
            sessionId,
            user: playerUser
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register' });
    }
});

// Player login
router.post('/players/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user
        const playerUser = await PlayerUser.findOne({ username });
        if (!playerUser) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, playerUser.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Create or update session
        let session = await PlayerSession.findOne({ playerUserId: playerUser.id });
        if (session) {
            session.timestamp = Date.now();
            await session.save();
        } else {
            const sessionId = crypto.randomBytes(32).toString('hex');
            session = await PlayerSession.create({
                sessionId,
                playerUserId: playerUser.id
            });
        }

        res.json({
            success: true,
            sessionId: session.sessionId,
            user: playerUser
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Get current player user
router.get('/players/auth/me', async (req, res) => {
    try {
        const sessionId = req.headers['x-player-session-id'];

        if (!sessionId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const session = await PlayerSession.findOne({ sessionId });
        if (!session) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        const playerUser = await PlayerUser.findById(session.playerUserId);
        if (!playerUser) {
            return res.status(401).json({ error: 'User not found' });
        }

        // If user has linked battleTag, get player data
        let playerData = null;
        if (playerUser.linkedBattleTag) {
            playerData = await Player.findOne({ battleTag: playerUser.linkedBattleTag });
        }

        res.json({
            user: playerUser,
            playerData
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Link BattleTag to player account
router.put('/players/auth/link-battletag', async (req, res) => {
    try {
        const sessionId = req.headers['x-player-session-id'];
        let { battleTag } = req.body;

        if (!sessionId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!battleTag) {
            return res.status(400).json({ error: 'BattleTag is required' });
        }

        // Normalize battleTag: trim whitespace
        battleTag = battleTag.trim();

        const session = await PlayerSession.findOne({ sessionId });
        if (!session) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        // Check if battleTag exists in players (case-insensitive search)
        const player = await Player.findOne({
            battleTag: { $regex: new RegExp(`^${battleTag}$`, 'i') }
        });

        if (!player) {
            return res.status(404).json({
                error: 'BattleTag not found in league. Please contact an admin to add your BattleTag first.'
            });
        }

        // Use the exact battleTag from the database for linking
        const exactBattleTag = player.battleTag;

        // Check if battleTag is already linked to another account
        const existingLink = await PlayerUser.findOne({ linkedBattleTag: exactBattleTag });
        if (existingLink && existingLink.id !== session.playerUserId) {
            return res.status(400).json({ error: 'BattleTag already linked to another account' });
        }

        // Update user with the exact battleTag from database
        const playerUser = await PlayerUser.findByIdAndUpdate(
            session.playerUserId,
            { linkedBattleTag: exactBattleTag, updatedAt: Date.now() },
            { new: true }
        );

        res.json({
            success: true,
            user: playerUser,
            linkedPlayer: player
        });
    } catch (error) {
        console.error('Link BattleTag error:', error);
        res.status(500).json({ error: 'Failed to link BattleTag' });
    }
});

// Select portrait
router.put('/players/auth/select-portrait', async (req, res) => {
    try {
        const sessionId = req.headers['x-player-session-id'];
        const { portraitId } = req.body;

        if (!sessionId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!portraitId) {
            return res.status(400).json({ error: 'Portrait ID is required' });
        }

        const session = await PlayerSession.findOne({ sessionId });
        if (!session) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        const playerUser = await PlayerUser.findById(session.playerUserId);
        if (!playerUser || !playerUser.linkedBattleTag) {
            return res.status(400).json({ error: 'Must link BattleTag first' });
        }

        // Get player data to check race (not points, as they come from API)
        const player = await Player.findOne({ battleTag: playerUser.linkedBattleTag });
        if (!player) {
            return res.status(404).json({ error: 'Player data not found' });
        }

        // Get portrait to check requirements
        const portrait = await Portrait.findById(portraitId);
        if (!portrait) {
            return res.status(404).json({ error: 'Portrait not found' });
        }

        // Only check if portrait race matches player race (portrait.race = 0 means available for all)
        // Points are checked on frontend with live data from W3Champions API
        if (portrait.race !== 0 && portrait.race !== player.race) {
            return res.status(400).json({ error: 'Portrait race does not match your player race' });
        }

        // Update player's selected portrait
        await Player.findOneAndUpdate(
            { battleTag: playerUser.linkedBattleTag },
            { selectedPortraitId: portraitId, updatedAt: Date.now() }
        );

        res.json({
            success: true,
            message: 'Portrait selected successfully'
        });
    } catch (error) {
        console.error('Select portrait error:', error);
        res.status(500).json({ error: 'Failed to select portrait' });
    }
});

// Logout
router.post('/players/auth/logout', async (req, res) => {
    try {
        const sessionId = req.headers['x-player-session-id'];

        if (sessionId) {
            await PlayerSession.deleteOne({ sessionId });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

// Request password reset
router.post('/players/auth/request-reset', async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Check if user exists
        const user = await PlayerUser.findOne({ username });
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ success: true, message: 'If account exists, reset code has been generated' });
        }

        // Generate 6-digit reset code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Delete any existing reset requests for this user
        await PasswordReset.deleteMany({ username });

        // Create new reset request (expires in 15 minutes)
        await PasswordReset.create({
            username,
            resetCode,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        // In production, send code via email. For now, return it in response
        res.json({
            success: true,
            resetCode: resetCode, // TODO: Remove in production, send via email instead
            message: 'Reset code generated'
        });
    } catch (error) {
        console.error('Request reset error:', error);
        res.status(500).json({ error: 'Failed to process reset request' });
    }
});

// Reset password with code
router.post('/players/auth/reset-password', async (req, res) => {
    try {
        const { username, resetCode, newPassword } = req.body;

        if (!username || !resetCode || !newPassword) {
            return res.status(400).json({ error: 'Username, reset code, and new password are required' });
        }

        // Find valid reset request
        const resetRequest = await PasswordReset.findOne({
            username,
            resetCode,
            expiresAt: { $gt: new Date() }
        });

        if (!resetRequest) {
            return res.status(400).json({ error: 'Invalid or expired reset code' });
        }

        // Find user
        const user = await PlayerUser.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        user.passwordHash = passwordHash;
        user.updatedAt = Date.now();
        await user.save();

        // Delete reset request
        await PasswordReset.deleteOne({ _id: resetRequest._id });

        // Delete all sessions for this user (force re-login)
        await PlayerSession.deleteMany({ playerUserId: user.id });

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;
