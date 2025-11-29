const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const { Team, Player, TeamMatch, AdminSession } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/gnl_league';
mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
});

// Admin credentials
const ADMIN_LOGIN = 'admin777';
const ADMIN_PASSWORD = '@dmin1122!';

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'team-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG images are allowed'));
        }
    }
});

// Enable CORS
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Middleware to check admin authentication
const checkAuth = async (req, res, next) => {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const session = await AdminSession.findOne({ sessionId });
        if (!session || !session.isLoggedIn) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Check if session expired (24 hours)
        const sessionAge = Date.now() - session.timestamp;
        if (sessionAge > 24 * 60 * 60 * 1000) {
            await AdminSession.deleteOne({ sessionId });
            return res.status(401).json({ error: 'Session expired' });
        }
        
        next();
    } catch (error) {
        res.status(500).json({ error: 'Session check failed' });
    }
};

// ==================== ADMIN AUTH ENDPOINTS ====================
app.post('/api/admin/login', async (req, res) => {
    const { login, password } = req.body;
    
    if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
        const sessionId = crypto.randomBytes(32).toString('hex');
        await writeData('admin_session.json', {
            isLoggedIn: true,
            sessionId: sessionId,
            timestamp: Date.now()
        });
        res.json({ success: true, sessionId });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/admin/logout', checkAuth, async (req, res) => {
    await writeData('admin_session.json', { isLoggedIn: false, sessionId: null, timestamp: null });
    res.json({ success: true });
});

app.get('/api/admin/verify', async (req, res) => {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
        return res.json({ isAuthenticated: false });
    }
    
    const session = await readData('admin_session.json');
    const sessionAge = Date.now() - session.timestamp;
    
    if (session.isLoggedIn && session.sessionId === sessionId && sessionAge < 24 * 60 * 60 * 1000) {
        res.json({ isAuthenticated: true });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// ==================== TEAMS ENDPOINTS ====================
app.get('/api/teams', async (req, res) => {
    const teams = await readData('teams.json');
    res.json(teams);
});

app.post('/api/admin/teams', checkAuth, async (req, res) => {
    const teams = await readData('teams.json');
    const newTeam = {
        id: Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    teams.push(newTeam);
    await writeData('teams.json', teams);
    res.json(newTeam);
});

app.put('/api/admin/teams/:id', checkAuth, async (req, res) => {
    const teams = await readData('teams.json');
    const index = teams.findIndex(t => t.id === parseInt(req.params.id));
    if (index !== -1) {
        teams[index] = { ...teams[index], ...req.body, updatedAt: new Date().toISOString() };
        await writeData('teams.json', teams);
        res.json(teams[index]);
    } else {
        res.status(404).json({ error: 'Team not found' });
    }
});

app.delete('/api/admin/teams/:id', checkAuth, async (req, res) => {
    const teams = await readData('teams.json');
    const filtered = teams.filter(t => t.id !== parseInt(req.params.id));
    await writeData('teams.json', filtered);
    res.json({ success: true });
});

// ==================== PLAYERS ENDPOINTS ====================
app.get('/api/players', async (req, res) => {
    const players = await readData('players.json');
    res.json(players);
});

app.post('/api/admin/players/search', checkAuth, async (req, res) => {
    try {
        const { battleTag } = req.body;
        const apiUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&gateway=20&season=23&pageSize=10`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'GNL-League-App',
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

app.post('/api/admin/players', checkAuth, async (req, res) => {
    const players = await readData('players.json');
    const newPlayer = {
        id: Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    players.push(newPlayer);
    await writeData('players.json', players);
    res.json(newPlayer);
});

app.put('/api/admin/players/:id', checkAuth, async (req, res) => {
    const players = await readData('players.json');
    const index = players.findIndex(p => p.id === parseInt(req.params.id));
    if (index !== -1) {
        players[index] = { ...players[index], ...req.body, updatedAt: new Date().toISOString() };
        await writeData('players.json', players);
        res.json(players[index]);
    } else {
        res.status(404).json({ error: 'Player not found' });
    }
});

app.delete('/api/admin/players/:id', checkAuth, async (req, res) => {
    const players = await readData('players.json');
    const filtered = players.filter(p => p.id !== parseInt(req.params.id));
    await writeData('players.json', filtered);
    res.json({ success: true });
});

// ==================== TEAM MATCHES ENDPOINTS ====================
app.get('/api/team-matches', async (req, res) => {
    const matches = await readData('team_matches.json');
    res.json(matches);
});

app.post('/api/admin/team-matches', checkAuth, async (req, res) => {
    const matches = await readData('team_matches.json');
    const newMatch = {
        id: Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    matches.push(newMatch);
    await writeData('team_matches.json', matches);
    res.json(newMatch);
});

app.put('/api/admin/team-matches/:id', checkAuth, async (req, res) => {
    const matches = await readData('team_matches.json');
    const index = matches.findIndex(m => m.id === parseInt(req.params.id));
    if (index !== -1) {
        matches[index] = { ...matches[index], ...req.body, updatedAt: new Date().toISOString() };
        await writeData('team_matches.json', matches);
        res.json(matches[index]);
    } else {
        res.status(404).json({ error: 'Match not found' });
    }
});

app.delete('/api/admin/team-matches/:id', checkAuth, async (req, res) => {
    const matches = await readData('team_matches.json');
    const filtered = matches.filter(m => m.id !== parseInt(req.params.id));
    await writeData('team_matches.json', filtered);
    res.json({ success: true });
});

// Proxy endpoint for W3Champions matches - THIS IS THE MAIN ONE
app.get('/api/matches/:battleTag', async (req, res) => {
    try {
        const battleTag = decodeURIComponent(req.params.battleTag);
        const { gateway = 20, season = 23, pageSize = 100, offset = 0 } = req.query;

        console.log(`Fetching matches for: ${battleTag}`);
        
        // Build the URL with proper encoding
        const apiUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&gateway=${gateway}&season=${season}&offset=${offset}&pageSize=${pageSize}`;
        
        console.log(`Making request to: ${apiUrl}`);

        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'GNL-League-App',
                'Accept': 'application/json'
            }
        });

        console.log(`Response received: ${response.data.count} matches`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching matches:', error.message);
        console.error('Error details:', error.response?.data || error);
        res.status(500).json({ error: 'Failed to fetch matches', details: error.message });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 GNL League server running on http://localhost:${PORT}`);
    console.log(`📊 Using W3Champions matches API`);
});
