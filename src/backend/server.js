const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const { Team, Player, TeamMatch, Portrait, Streamer, AdminSession } = require('./models');
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
const ADMIN_LOGIN = 'admin2024';
const ADMIN_PASSWORD = 'BNL@dmin2024!Secure';

// Multer configuration for file uploads (storing in memory for MongoDB)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for base64
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG and PNG images are allowed'));
        }
    }
});

// Enable CORS
app.use(cors());
app.use(express.json());

// Serve static files - handle both local and production paths correctly
// __dirname = /path/to/src/backend
// We need: /path/to/public
const publicPath = path.resolve(__dirname, '../../public');
const fallbackPublicPath = path.resolve(__dirname, '../../../public'); // In case of deployment structure differences

let staticPath = publicPath;
try {
    // Check if path exists
    const fs = require('fs');
    if (!fs.existsSync(publicPath)) {
        console.warn(`⚠️ Primary path not found: ${publicPath}`);
        if (fs.existsSync(fallbackPublicPath)) {
            staticPath = fallbackPublicPath;
            console.log(`✅ Using fallback path: ${staticPath}`);
        }
    }
} catch (e) {
    // If fs check fails, use primary
}

console.log(`📁 Serving static files from: ${staticPath}`);
app.use(express.static(staticPath));

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
        try {
            const sessionId = crypto.randomBytes(32).toString('hex');
            // Delete old sessions
            await AdminSession.deleteMany({});
            // Create new session
            await AdminSession.create({ sessionId, isLoggedIn: true, timestamp: Date.now() });
            res.json({ success: true, sessionId });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Database error', details: error.message });
        }
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

// Serve uploaded match files
const uploadsPath = path.resolve(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsPath));

// Upload endpoint with multer - saves as base64 in MongoDB
app.post('/api/admin/teams/:id/upload-logo', checkAuth, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // Convert image to base64 data URL
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        const team = await Team.findByIdAndUpdate(
            req.params.id,
            { logo: base64Image, updatedAt: Date.now() },
            { new: true }
        );

        res.json({ logoUrl: base64Image, team });
    } catch (error) {
        console.error('Upload error:', error);
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

// Serve index.html for all other routes (SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Start server only after DB connection
mongoose.connection.once('open', () => {
    app.listen(PORT, () => {
        console.log(`🚀 BNL (Breaking New Limits) server running on http://localhost:${PORT}`);
        console.log(`📊 Using W3Champions matches API`);
        console.log(`💾 MongoDB Ready`);
    });
});