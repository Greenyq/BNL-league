const express = require('express');
const mongoose = require('mongoose');
const { BnlVsAllMatch } = require('../models/BnlVsAllMatch');
const { ClanWar } = require('../models/ClanWar');
const { Player, PlayerStats } = require('../models/Player');
const { Team } = require('../models/Team');

const router = express.Router();

router.use((req, res, next) => {
    const sharedKey = process.env.CHRONOSCOPE_SHARED_KEY;
    if (!sharedKey) return next();

    if (req.headers['x-chronoscope-key'] !== sharedKey) {
        return res.status(401).json({ error: 'Chronoscope key required' });
    }

    next();
});

router.get('/snapshot', async (req, res) => {
    try {
        const [
            playerCount,
            teamCount,
            clanWarCount,
            bnlVsAllCount,
            activeClanWars,
            latestClanWar,
            latestBnlVsAll,
            latestStats,
        ] = await Promise.all([
            Player.countDocuments(),
            Team.countDocuments(),
            ClanWar.countDocuments(),
            BnlVsAllMatch.countDocuments(),
            ClanWar.countDocuments({ status: { $in: ['upcoming', 'ongoing'] } }),
            ClanWar.findOne().sort({ date: -1, updatedAt: -1 }).lean(),
            BnlVsAllMatch.findOne().sort({ date: -1, updatedAt: -1 }).lean(),
            PlayerStats.findOne().sort({ cachedAt: -1, updatedAt: -1 }).lean(),
        ]);

        const warnings = [];
        if (playerCount === 0) warnings.push('No BNL players are registered.');
        if (teamCount === 0) warnings.push('No BNL teams are registered.');
        if (clanWarCount === 0) warnings.push('No clan wars have been scheduled.');
        if (!latestStats) warnings.push('Player statistics have not been calculated yet.');

        res.json({
            source: 'BNL League',
            status: warnings.length ? 'warning' : 'ok',
            checkedAt: new Date().toISOString(),
            database: {
                readyState: mongoose.connection.readyState,
                name: mongoose.connection.db?.databaseName ?? null,
            },
            counts: {
                players: playerCount,
                teams: teamCount,
                clanWars: clanWarCount,
                bnlVsAllMatches: bnlVsAllCount,
                activeClanWars,
            },
            latest: {
                clanWar: latestClanWar
                    ? {
                        id: String(latestClanWar._id),
                        season: latestClanWar.season,
                        status: latestClanWar.status,
                        date: latestClanWar.date,
                        teamA: latestClanWar.teamA?.name,
                        teamB: latestClanWar.teamB?.name,
                        score: latestClanWar.clanWarScore,
                    }
                    : null,
                bnlVsAll: latestBnlVsAll
                    ? {
                        id: String(latestBnlVsAll._id),
                        season: latestBnlVsAll.season,
                        status: latestBnlVsAll.status,
                        date: latestBnlVsAll.date,
                        opponentName: latestBnlVsAll.opponentName,
                        score: latestBnlVsAll.score,
                        winner: latestBnlVsAll.winner,
                    }
                    : null,
                statsCachedAt: latestStats?.cachedAt ?? latestStats?.updatedAt ?? null,
            },
            warnings,
        });
    } catch (err) {
        res.status(500).json({
            source: 'BNL League',
            status: 'error',
            checkedAt: new Date().toISOString(),
            error: err.message,
        });
    }
});

module.exports = router;
