const express = require('express');
const axios = require('axios');
const { Team, Player, TeamMatch } = require('./models');

const router = express.Router();

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

// Upload team logo
router.post('/admin/teams/:id/upload-logo', async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const logoUrl = `/uploads/${req.file.filename}`;
        const team = await Team.findByIdAndUpdate(
            req.params.id,
            { logo: logoUrl, updatedAt: Date.now() },
            { new: true }
        );
        
        res.json({ logoUrl, team });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

// ==================== PLAYERS ENDPOINTS ====================
router.get('/players', async (req, res) => {
    try {
        const players = await Player.find();
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

router.post('/admin/players/search', async (req, res) => {
    try {
        const { battleTag } = req.body;
        const apiUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&gateway=20&season=23&pageSize=10`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'BNL-League-App',
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

router.post('/admin/players', async (req, res) => {
    try {
        // Check if player already exists
        const existing = await Player.findOne({ battleTag: req.body.battleTag });
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
        const newMatch = await TeamMatch.create(req.body);
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

module.exports = router;
