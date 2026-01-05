const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Team, Player, TeamMatch, Portrait, Streamer, PlayerUser, PlayerSession, PasswordReset, PlayerCache } = require('./models');

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

// Get all players with cached match data
router.get('/players/with-cache', async (req, res) => {
    try {
        const players = await Player.find();
        const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
        const now = Date.now();

        const result = [];
        let cacheHits = 0;
        let cacheMisses = 0;

        for (const player of players) {
            // Check cache first
            let cache = await PlayerCache.findOne({ battleTag: player.battleTag });

            // If cache exists and not expired, use it
            if (cache && new Date(cache.expiresAt) > now) {
                cacheHits++;
                // Return player data with cached matchData for frontend processing
                result.push({
                    ...player.toJSON(),
                    matchData: cache.matchData || []
                });
                continue;
            }

            // Cache miss or expired - fetch from W3Champions
            cacheMisses++;
            console.log(`🔄 Fetching fresh data for ${player.battleTag} from W3Champions...`);
            try {
                const apiUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(player.battleTag)}&gateway=20&season=23&pageSize=100`;
                const response = await axios.get(apiUrl, {
                    headers: {
                        'User-Agent': 'BNL-League-App',
                        'Accept': 'application/json'
                    },
                    timeout: 10000
                });

                const matchData = response.data.matches || [];

                // Save to cache
                const expiresAt = new Date(now + CACHE_DURATION_MS);
                if (cache) {
                    cache.matchData = matchData;
                    cache.lastUpdated = new Date(now);
                    cache.expiresAt = expiresAt;
                    await cache.save();
                } else {
                    await PlayerCache.create({
                        battleTag: player.battleTag,
                        matchData,
                        lastUpdated: new Date(now),
                        expiresAt
                    });
                }

                // Return player data with matchData for frontend processing
                result.push({
                    ...player.toJSON(),
                    matchData
                });
            } catch (error) {
                console.error(`❌ Error fetching matches for ${player.battleTag}:`, error.message);
                // Return player without match data
                result.push({
                    ...player.toJSON(),
                    matchData: []
                });
            }
        }

        console.log(`📊 Cache stats - Hits: ${cacheHits}, Misses: ${cacheMisses}, Total: ${result.length} players loaded`);
        res.json(result);
    } catch (error) {
        console.error('Error in /players/with-cache:', error);
        res.status(500).json({ error: 'Failed to fetch players with cache' });
    }
});

// Clear cache for specific player (admin only)
router.delete('/admin/players/cache/:battleTag', async (req, res) => {
    try {
        const { battleTag } = req.params;
        const result = await PlayerCache.deleteOne({ battleTag });

        if (result.deletedCount > 0) {
            res.json({ success: true, message: `Cache cleared for ${battleTag}` });
        } else {
            res.json({ success: true, message: `No cache found for ${battleTag}` });
        }
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

// Clear all player cache (admin only)
router.delete('/admin/players/cache', async (req, res) => {
    try {
        const result = await PlayerCache.deleteMany({});
        res.json({
            success: true,
            message: `Cleared cache for ${result.deletedCount} players`,
            count: result.deletedCount
        });
    } catch (error) {
        console.error('Error clearing all cache:', error);
        res.status(500).json({ error: 'Failed to clear all cache' });
    }
});

// Helper function to search player in W3Champions with case variations
async function searchW3ChampionsPlayer(battleTag) {
    // Helper function to capitalize first letter
    const capitalizeFirst = (str) => {
        if (!str) return str;
        const parts = str.split('#');
        if (parts.length === 2) {
            return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() + '#' + parts[1];
        }
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    // Try different case variations of the battleTag
    const battleTagVariations = [
        battleTag,                    // As entered
        capitalizeFirst(battleTag),   // First letter capitalized
        battleTag.toLowerCase(),      // All lowercase
        battleTag.toUpperCase()       // All uppercase
    ];

    // Remove duplicates
    const uniqueVariations = [...new Set(battleTagVariations)];

    // Try each variation until we find matches
    for (const variation of uniqueVariations) {
        try {
            const apiUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(variation)}&gateway=20&season=23&pageSize=10`;

            const response = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'BNL-League-App',
                    'Accept': 'application/json'
                },
                timeout: 5000
            });

            if (response.data.matches && response.data.matches.length > 0) {
                const battleTagLower = battleTag.toLowerCase();

                // Find player's most frequent race from all matches
                const raceCounts = {};
                let mostFrequentRace = null;
                let playerData = null;

                for (const match of response.data.matches) {
                    const playerTeam = match.teams.find(team =>
                        team.players.some(p => p.battleTag.toLowerCase() === battleTagLower)
                    );

                    if (playerTeam) {
                        const player = playerTeam.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
                        if (player) {
                            if (!playerData) {
                                playerData = player;
                            }

                            // Count race frequency
                            const race = player.race;
                            raceCounts[race] = (raceCounts[race] || 0) + 1;

                            // Track most frequent race
                            if (!mostFrequentRace || raceCounts[race] > raceCounts[mostFrequentRace]) {
                                mostFrequentRace = race;
                            }
                        }
                    }
                }

                if (playerData) {
                    return {
                        found: true,
                        battleTag: playerData.battleTag,
                        name: playerData.name,
                        race: mostFrequentRace || playerData.race,
                        currentMmr: playerData.currentMmr,
                        matchCount: response.data.count
                    };
                }
            }
        } catch (err) {
            // Continue to next variation if this one fails
            continue;
        }
    }

    return { found: false };
}

router.post('/admin/players/search', async (req, res) => {
    try {
        let { battleTag } = req.body;

        // Normalize battleTag: trim whitespace
        battleTag = battleTag.trim();

        const result = await searchW3ChampionsPlayer(battleTag);

        if (result.found) {
            res.json(result);
        } else {
            res.json({ found: false, message: 'No matches found for this player' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to search player', details: error.message });
    }
});

router.post('/admin/players', async (req, res) => {
    try {
        // Check if player already exists (case-insensitive)
        const existing = await Player.findOne({
            battleTag: { $regex: new RegExp(`^${req.body.battleTag}$`, 'i') }
        });
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
        let player = await Player.findOne({
            battleTag: { $regex: new RegExp(`^${battleTag}$`, 'i') }
        });

        // If player doesn't exist in our database, try to find in W3Champions and auto-create
        if (!player) {
            console.log(`Player ${battleTag} not found in DB, searching W3Champions...`);
            const w3cResult = await searchW3ChampionsPlayer(battleTag);

            if (!w3cResult.found) {
                return res.status(404).json({
                    error: 'BattleTag not found in W3Champions. Please check the spelling and try again.'
                });
            }

            // Create player automatically from W3Champions data
            console.log(`Creating player ${w3cResult.battleTag} automatically from W3Champions data`);
            player = await Player.create({
                battleTag: w3cResult.battleTag,
                name: w3cResult.name || w3cResult.battleTag.split('#')[0],
                race: w3cResult.race,
                currentMmr: w3cResult.currentMmr
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

// Unlink BattleTag from player account
router.delete('/players/auth/unlink-battletag', async (req, res) => {
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
            return res.status(404).json({ error: 'User not found' });
        }

        if (!playerUser.linkedBattleTag) {
            return res.status(400).json({ error: 'No BattleTag linked to this account' });
        }

        const previousBattleTag = playerUser.linkedBattleTag;

        // Remove the linked battleTag
        const updatedUser = await PlayerUser.findByIdAndUpdate(
            session.playerUserId,
            { linkedBattleTag: null, updatedAt: Date.now() },
            { new: true }
        );

        // Also remove selected portrait since it's tied to the player
        await Player.findOneAndUpdate(
            { battleTag: previousBattleTag },
            { selectedPortraitId: null, updatedAt: Date.now() }
        );

        res.json({
            success: true,
            message: 'BattleTag unlinked successfully',
            user: updatedUser,
            previousBattleTag
        });
    } catch (error) {
        console.error('Unlink BattleTag error:', error);
        res.status(500).json({ error: 'Failed to unlink BattleTag' });
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

// ==================== LIVE MATCHES ====================
// Get live matches for our players from W3Champions
router.get('/live-matches', async (req, res) => {
    try {
        const players = await Player.find();
        const battleTags = players.map(p => p.battleTag);

        // Fetch ongoing matches from W3Champions
        const apiUrl = 'https://website-backend.w3champions.com/api/matches/ongoing?offset=0&pageSize=100';
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'BNL-League-App',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        const allMatches = response.data.matches || [];

        // Create lowercase map for case-insensitive comparison
        const battleTagsLowerMap = new Map();
        players.forEach(p => {
            battleTagsLowerMap.set(p.battleTag.toLowerCase(), p);
        });

        // Filter matches that include our players (case-insensitive)
        const ourMatches = allMatches.filter(match => {
            return match.teams.some(team =>
                team.players.some(player =>
                    battleTagsLowerMap.has(player.battleTag.toLowerCase())
                )
            );
        });

        // Enrich with player names from our database
        const enrichedMatches = ourMatches.map(match => {
            const enrichedTeams = match.teams.map(team => ({
                ...team,
                players: team.players.map(player => {
                    const ourPlayer = battleTagsLowerMap.get(player.battleTag.toLowerCase());
                    return {
                        battleTag: player.battleTag,
                        name: player.name,
                        race: player.race,
                        currentMmr: player.currentMmr || player.mmr || null,
                        oldMmr: player.oldMmr || null,
                        isOurPlayer: !!ourPlayer,
                        playerName: ourPlayer?.name || player.name || player.battleTag.split('#')[0],
                        teamId: ourPlayer?.teamId || null
                    };
                })
            }));

            return {
                id: match.id,
                map: match.map,
                gameMode: match.gameMode,
                gateway: match.gateway,
                startTime: match.startTime,
                teams: enrichedTeams
            };
        });

        res.json({
            count: enrichedMatches.length,
            matches: enrichedMatches
        });
    } catch (error) {
        console.error('Error fetching live matches:', error.message);
        res.status(500).json({ error: 'Failed to fetch live matches', matches: [] });
    }
});

module.exports = router;
