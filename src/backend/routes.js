const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Team, Player, TeamMatch, Portrait, Streamer, PlayerUser, PlayerSession, PasswordReset, PlayerCache } = require('./models');

const router = express.Router();

// ==================== MULTER CONFIGURATION FOR FILE UPLOADS ====================
const uploadsDir = path.join(__dirname, '../../uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: matchId_timestamp_originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 700 * 1024 }, // 700 KB limit
    fileFilter: (req, file, cb) => {
        // Allow any file type
        cb(null, true);
    }
});

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
        const startTime = Date.now();
        const players = await Player.find();
        const CACHE_DURATION_MS = 60 * 60 * 1000; // 60 minutes
        const now = Date.now();
        const cutoffDate = new Date('2025-11-27T00:00:00Z'); // Only fetch recent matches

        // First pass: check all caches and separate into hits vs misses
        const cachedPlayers = [];
        const playersToFetch = [];

        for (const player of players) {
            let cache = await PlayerCache.findOne({ battleTag: player.battleTag });

            if (cache && new Date(cache.expiresAt) > now) {
                // Use cached data
                cachedPlayers.push({
                    ...player.toJSON(),
                    matchData: cache.matchData || []
                });
            } else {
                // Need to fetch fresh data
                playersToFetch.push({ player, cache });
            }
        }

        console.log(`📊 Cache status: ${cachedPlayers.length} cached, ${playersToFetch.length} to fetch (60min TTL)`);

        // Helper function: Fetch with retry logic
        async function fetchPlayerWithRetry(player, cache, maxRetries = 2) {
            let lastError;

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    const apiUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(player.battleTag)}&gateway=20&season=23&pageSize=100`;
                    const response = await axios.get(apiUrl, {
                        headers: {
                            'User-Agent': 'BNL-League-App',
                            'Accept': 'application/json'
                        },
                        timeout: 12000
                    });

                    let matchData = response.data.matches || [];
                    matchData = matchData.filter(m => new Date(m.startTime) >= cutoffDate);

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

                    console.log(`✅ ${player.battleTag}: Loaded ${matchData.length} matches`);

                    return {
                        ...player.toJSON(),
                        matchData
                    };
                } catch (error) {
                    lastError = error;
                    const statusCode = error.response?.status || 'N/A';
                    const statusText = error.response?.statusText || '';
                    const errorMsg = error.message || 'Unknown error';

                    if (attempt < maxRetries) {
                        const delay = Math.pow(2, attempt) * 500; // Exponential backoff: 500ms, 1s, 2s
                        console.warn(`⚠️ ${player.battleTag} (attempt ${attempt + 1}/${maxRetries + 1}): HTTP ${statusCode} ${statusText} - ${errorMsg}. Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            // All retries failed
            const statusCode = lastError?.response?.status || 'N/A';
            const statusText = lastError?.response?.statusText || '';
            const errorMsg = lastError?.message || 'Unknown error';
            console.error(`❌ ${player.battleTag}: API request failed after ${maxRetries + 1} attempts`);
            console.error(`   Status: HTTP ${statusCode} ${statusText}`);
            console.error(`   Error: ${errorMsg}`);
            console.error(`   URL: https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(player.battleTag)}&gateway=20&season=23&pageSize=100`);

            return {
                ...player.toJSON(),
                matchData: [],
                fetchError: true // Flag to indicate API fetch failed
            };
        }

        // Batch parallel requests: fetch in groups of 6 to maximize parallelism
        const BATCH_SIZE = 6;
        const fetchedPlayers = [];

        for (let i = 0; i < playersToFetch.length; i += BATCH_SIZE) {
            const batch = playersToFetch.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(({ player, cache }) => fetchPlayerWithRetry(player, cache))
            );
            fetchedPlayers.push(...batchResults);

            // Minimal delay between batches to avoid overwhelming API
            if (i + BATCH_SIZE < playersToFetch.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        const result = [...cachedPlayers, ...fetchedPlayers];

        const totalTime = Date.now() - startTime;
        console.log(`✅ Loaded ${result.length} players in ${totalTime}ms`);

        // If cache was old, trigger Go stats computation in background (async, don't wait)
        if (playersToFetch.length > 0) {
            triggerGoStatsComputation(result).catch(err => {
                console.warn('⚠️ Background Go computation failed:', err.message);
                // Don't fail the request if background job fails
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Error in /players/with-cache:', error);
        res.status(500).json({ error: 'Failed to fetch players with cache' });
    }
});

// Helper function to trigger Go stats computation in background
async function triggerGoStatsComputation(players) {
    const GO_WORKER_URL = process.env.GO_WORKER_URL || 'http://localhost:3001';

    // Don't wait for this - fire and forget
    setTimeout(async () => {
        try {
            console.log(`🔵 Triggering Go stats computation for ${players.length} players...`);

            const response = await axios.post(`${GO_WORKER_URL}/compute-stats`, {
                players: players
            }, {
                timeout: 300000 // 5 minute timeout for Go worker
            });

            const { time, results } = response.data;
            console.log(`✅ Go stats computed in ${time}ms for ${results.length} players`);
        } catch (error) {
            console.error(`❌ Go worker error: ${error.message}`);
            // Don't fail - this is background work
        }
    }, 100); // Small delay to avoid blocking response
}

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
        // Randomly assign home player if not provided
        let matchData = { ...req.body };
        if (!matchData.homePlayerId && matchData.player1Id && matchData.player2Id) {
            matchData.homePlayerId = Math.random() < 0.5 ? matchData.player1Id : matchData.player2Id;
        }
        const newMatch = await TeamMatch.create(matchData);
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

// ==================== PLAYER MATCH MANAGEMENT ====================
// Get matches for a specific player (for their profile)
router.get('/player-matches/:playerId', async (req, res) => {
    try {
        const { playerId } = req.params;
        const matches = await TeamMatch.find({
            $or: [
                { player1Id: playerId },
                { player2Id: playerId }
            ]
        }).sort({ scheduledDate: 1 });
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch player matches' });
    }
});

// Player reports match result (only home player can do this)
router.put('/player-matches/:id/report', async (req, res) => {
    try {
        const { winnerId, scheduledDate, scheduledTime, playerId } = req.body;
        const match = await TeamMatch.findById(req.params.id);

        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        // Only home player can report
        if (match.homePlayerId !== playerId) {
            return res.status(403).json({ error: 'Only home player can report match result' });
        }

        // If reporting winner, calculate points based on MMR
        let points = 0;
        if (winnerId) {
            // Get both players to compare MMR
            const player1 = await Player.findById(match.player1Id);
            const player2 = await Player.findById(match.player2Id);

            if (player1 && player2) {
                const winnerIsPlayer1 = winnerId === match.player1Id;
                const winner = winnerIsPlayer1 ? player1 : player2;
                const loser = winnerIsPlayer1 ? player2 : player1;

                const winnerMmr = winner.currentMmr || 0;
                const loserMmr = loser.currentMmr || 0;
                const mmrDiff = winnerMmr - loserMmr;

                // Calculate points based on MMR difference
                if (mmrDiff >= 150) {
                    points = 10; // Winner is much stronger
                } else if (mmrDiff >= 100) {
                    points = 20; // Winner is stronger
                } else {
                    points = 50; // Normal match
                }
            } else {
                points = 50; // Default if can't calculate
            }
        }

        const updateData = {
            updatedAt: Date.now(),
            reportedBy: playerId
        };

        if (scheduledDate !== undefined) {
            updateData.scheduledDate = scheduledDate;
        }

        if (scheduledTime !== undefined) {
            updateData.scheduledTime = scheduledTime;
        }

        if (winnerId) {
            updateData.winnerId = winnerId;
            updateData.points = points;
            updateData.status = 'completed';
        }

        const updatedMatch = await TeamMatch.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.json(updatedMatch);
    } catch (error) {
        console.error('Error reporting match:', error);
        res.status(500).json({ error: 'Failed to report match' });
    }
});

// ==================== MATCH FILE UPLOAD ====================
// Upload match file (only home player can do this)
router.post('/player-matches/:id/upload-file', upload.single('matchFile'), async (req, res) => {
    try {
        const { matchId, playerId } = req.body;
        const match = await TeamMatch.findById(req.params.id);

        if (!match) {
            // Clean up uploaded file if match not found
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Match not found' });
        }

        // Only home player can upload match file
        if (match.homePlayerId !== playerId) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Only home player can upload match file' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        // Update match with file info
        const updatedMatch = await TeamMatch.findByIdAndUpdate(
            req.params.id,
            {
                matchFile: {
                    originalName: req.file.originalname,
                    filename: req.file.filename,
                    size: req.file.size,
                    uploadedAt: new Date(),
                    uploadedBy: playerId
                },
                updatedAt: Date.now()
            },
            { new: true }
        );

        res.json({
            success: true,
            match: updatedMatch,
            file: {
                originalName: req.file.originalname,
                size: req.file.size,
                url: `/api/player-matches/${match._id}/download-file`
            }
        });
    } catch (error) {
        // Clean up uploaded file on error
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        console.error('Error uploading match file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Download match file
router.get('/player-matches/:id/download-file', async (req, res) => {
    try {
        const match = await TeamMatch.findById(req.params.id);

        if (!match || !match.matchFile) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.join(uploadsDir, match.matchFile.filename);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        // Send file as download
        res.download(filePath, match.matchFile.originalName, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
            }
        });
    } catch (error) {
        console.error('Error downloading match file:', error);
        res.status(500).json({ error: 'Failed to download file' });
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

// Select main race for stats filtering
router.put('/players/auth/select-main-race', async (req, res) => {
    try {
        const sessionId = req.headers['x-player-session-id'];
        const { mainRace } = req.body;

        if (!sessionId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (mainRace === undefined || mainRace === null) {
            return res.status(400).json({ error: 'Main race is required' });
        }

        // Validate race value (0=Random, 1=Human, 2=Orc, 4=NightElf, 8=Undead)
        const validRaces = [0, 1, 2, 4, 8];
        if (!validRaces.includes(mainRace)) {
            return res.status(400).json({ error: 'Invalid race value' });
        }

        const session = await PlayerSession.findOne({ sessionId });
        if (!session) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        const playerUser = await PlayerUser.findById(session.playerUserId);
        if (!playerUser || !playerUser.linkedBattleTag) {
            return res.status(400).json({ error: 'Must link BattleTag first' });
        }

        // Update player's main race
        await Player.findOneAndUpdate(
            { battleTag: playerUser.linkedBattleTag },
            { mainRace: mainRace, updatedAt: Date.now() }
        );

        res.json({
            success: true,
            message: 'Main race selected successfully'
        });
    } catch (error) {
        console.error('Select main race error:', error);
        res.status(500).json({ error: 'Failed to select main race' });
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
