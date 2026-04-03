require('dotenv').config();
const express  = require('express');
const path     = require('path');
const crypto   = require('crypto');
const multer   = require('multer');
const mongoose = require('mongoose');

const { buildCors } = require('./middleware/cors');
const { checkAuth } = require('./middleware/auth');
const { initializeScheduler } = require('./services/scoring');

const playersRouter   = require('./routes/players');
const teamsRouter     = require('./routes/teams');
const matchesRouter   = require('./routes/matches');
const clanWarsRouter  = require('./routes/clanWars');
const portraitsRouter = require('./routes/portraits');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Guard required env vars ───────────────────────────────────────────────────
const ADMIN_LOGIN    = process.env.ADMIN_LOGIN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_LOGIN || !ADMIN_PASSWORD) {
    console.error('❌ ADMIN_LOGIN and ADMIN_PASSWORD must be set');
    process.exit(1);
}

// ── MongoDB ───────────────────────────────────────────────────────────────────
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/gnl_league';
mongoose.set('bufferCommands', false);

// AdminSession model (inline – simple enough to not need its own file)
const adminSessionSchema = new mongoose.Schema({
    sessionId: { type: String, unique: true },
    isLoggedIn:{ type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});
const AdminSession = mongoose.model('AdminSession', adminSessionSchema);

mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 45000 })
    .then(() => console.log('✅ MongoDB connected:', mongoose.connection.db.databaseName))
    .catch(err => { console.error('❌ MongoDB:', err.message); process.exit(1); });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(buildCors());
app.use(express.json());

// Serve frontend static files
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ── Admin auth ────────────────────────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
    const { login, password } = req.body;
    if (login !== ADMIN_LOGIN || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    try {
        const sessionId = crypto.randomBytes(32).toString('hex');
        await AdminSession.deleteMany({});
        await AdminSession.create({ sessionId, isLoggedIn: true });
        res.json({ success: true, sessionId });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/logout', checkAuth, async (req, res) => {
    await AdminSession.deleteOne({ sessionId: req.headers['x-session-id'] });
    res.json({ success: true });
});

app.get('/api/admin/verify', async (req, res) => {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) return res.json({ isAuthenticated: false });
    try {
        const session = await AdminSession.findOne({ sessionId });
        const age = session ? Date.now() - session.timestamp : Infinity;
        res.json({ isAuthenticated: !!(session?.isLoggedIn && age < 24 * 60 * 60 * 1000) });
    } catch {
        res.json({ isAuthenticated: false });
    }
});

// ── Team logo upload ──────────────────────────────────────────────────────────
const logoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only JPEG / PNG / WebP images are allowed'));
    }
});

app.post('/api/admin/teams/:id/upload-logo', checkAuth, logoUpload.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const { Team } = require('./models/Team');
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const team = await Team.findByIdAndUpdate(req.params.id, { logo: base64, updatedAt: Date.now() }, { new: true });
        res.json({ logoUrl: base64, team });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── W3Champions proxy ─────────────────────────────────────────────────────────
const axios = require('axios');
app.get('/api/matches/:battleTag', async (req, res) => {
    try {
        const { gateway = 20, season = 24, pageSize = 100, offset = 0 } = req.query;
        const url = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(decodeURIComponent(req.params.battleTag))}&gateway=${gateway}&season=${season}&offset=${offset}&pageSize=${pageSize}`;
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'BNL-League-App' } });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/players',   playersRouter);
app.use('/api/teams',     teamsRouter);
app.use('/api/matches',   matchesRouter);
app.use('/api/clan-wars', clanWarsRouter);
app.use('/api/portraits', portraitsRouter);

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
mongoose.connection.once('open', () => {
    app.listen(PORT, () => {
        console.log(`🚀 BNL server running on http://localhost:${PORT}`);
        initializeScheduler();
    });
});
