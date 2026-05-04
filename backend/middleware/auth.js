const mongoose = require('mongoose');

// Lazy-require to avoid circular deps at module load time
const getAdminSession = () => mongoose.model('AdminSession');

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

const getAdminSessionResult = async (sessionId) => {
    if (!sessionId) return { session: null, error: 'Unauthorized' };

    const session = await getAdminSession().findOne({ sessionId });
    if (!session || !session.isLoggedIn) return { session: null, error: 'Unauthorized' };

    if (Date.now() - session.timestamp > SESSION_TTL) {
        await getAdminSession().deleteOne({ sessionId });
        return { session: null, error: 'Session expired' };
    }

    return { session, error: null };
};

const checkAuth = async (req, res, next) => {
    try {
        const { session, error } = await getAdminSessionResult(req.headers['x-session-id']);
        if (!session) return res.status(401).json({ error });

        next();
    } catch (err) {
        res.status(500).json({ error: 'Session check failed' });
    }
};

module.exports = { checkAuth, getAdminSessionResult };
