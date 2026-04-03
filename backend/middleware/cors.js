const cors = require('cors');

// Build the CORS middleware from ALLOWED_ORIGINS env var.
// In development (var not set) all origins are allowed.
// In production set ALLOWED_ORIGINS=https://example.com,https://www.example.com
function buildCors() {
    const raw = process.env.ALLOWED_ORIGINS;
    if (!raw) return cors(); // allow all

    const allowed = raw.split(',').map(o => o.trim()).filter(Boolean);
    return cors({
        origin: (origin, cb) => {
            if (!origin || allowed.includes(origin)) cb(null, true);
            else cb(new Error(`CORS: origin not allowed — ${origin}`));
        }
    });
}

module.exports = { buildCors };
