const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const { Team, Player, TeamMatch, AdminSession } = require('./models');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/gnl_league';

// Configure mongoose to not buffer commands
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 30000);

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URL, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB');
        console.log('📍 Database:', mongoose.connection.db.databaseName);
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        console.error('💡 Check MONGO_URL environment variable');
        // Exit if cannot connect to DB
        process.exit(1);
    }
};

// Start DB connection
connectDB();

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
        await AdminSession.deleteMany({});
        await AdminSession.create({ sessionId, isLoggedIn: true, timestamp: Date.now() });
        res.json({ success: true, sessionId });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/admin/logout', checkAuth, async (req, res) => {
    const sessionId = req.headers['x-session-id'];
    await AdminSession.deleteOne({ sessionId });
    res.json({ success: true });
});

app.get('/api/admin/verify', async (req, res) => {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) return res.json({ isAuthenticated: false });
    
    try {
        const session = await AdminSession.findOne({ sessionId });
        const sessionAge = session ? Date.now() - session.timestamp : Infinity;
        res.json({ isAuthenticated: session && session.isLoggedIn && sessionAge < 24 * 60 * 60 * 1000 });
    } catch (error) {
        res.json({ isAuthenticated: false });
    }
});

// Use routes with checkAuth middleware
app.use('/api', routes);
app.use('/api/admin', checkAuth, routes);

// Upload endpoint with multer
app.post('/api/admin/teams/:id/upload-logo', checkAuth, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const logoUrl = `/uploads/${req.file.filename}`;
        const team = await Team.findByIdAndUpdate(req.params.id, { logo: logoUrl, updatedAt: Date.now() }, { new: true });
        res.json({ logoUrl, team });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

// W3Champions proxy
app.get('/api/matches/:battleTag', async (req, res) => {
    try {
        const battleTag = decodeURIComponent(req.params.battleTag);
        const { gateway = 20, season = 23, pageSize = 100, offset = 0 } = req.query;
        const apiUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&gateway=${gateway}&season=${season}&offset=${offset}&pageSize=${pageSize}`;
        
        const response = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'BNL-League-App', 'Accept': 'application/json' }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching matches:', error.message);
        res.status(500).json({ error: 'Failed to fetch matches', details: error.message });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server only after DB connection
mongoose.connection.once('open', () => {
    app.listen(PORT, () => {
        console.log(`🚀 BNL (Battle Newbie League) server running on http://localhost:${PORT}`);
        console.log(`📊 Using W3Champions matches API`);
        console.log(`💾 MongoDB Ready`);
    });
});