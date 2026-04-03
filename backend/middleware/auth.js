const mongoose = require('mongoose');

// Lazy-require to avoid circular deps at module load time
const getAdminSession = () => mongoose.model('AdminSession');

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

const checkAuth = async (req, res, next) => {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const session = await getAdminSession().findOne({ sessionId });
        if (!session || !session.isLoggedIn) return res.status(401).json({ error: 'Unauthorized' });

        if (Date.now() - session.timestamp > SESSION_TTL) {
            await getAdminSession().deleteOne({ sessionId });
            return res.status(401).json({ error: 'Session expired' });
        }

        next();
    } catch (err) {
        res.status(500).json({ error: 'Session check failed' });
    }
};

module.exports = { checkAuth };
