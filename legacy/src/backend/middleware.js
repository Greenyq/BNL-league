const { AdminSession } = require('./models');

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

module.exports = { checkAuth };
