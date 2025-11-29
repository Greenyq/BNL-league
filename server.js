const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Proxy endpoint for W3Champions API - Player basic info
app.get('/api/player/:battleTag', async (req, res) => {
    try {
        const battleTag = req.params.battleTag;
        
        console.log(`Fetching data for: ${battleTag}`);
        
        // Use direct player endpoint
        const response = await axios.get(
            `https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}`
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching player data:', error.message);
        res.status(500).json({ error: 'Failed to fetch player data', details: error.message });
    }
});

// Get player game mode stats
app.get('/api/player/:battleTag/stats', async (req, res) => {
    try {
        const battleTag = req.params.battleTag;
        
        const response = await axios.get(
            `https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateWay=10&season=0`
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching player stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch player stats' });
    }
});

// Get player MMR timeline - for match history graphs
app.get('/api/player/:battleTag/mmr-timeline', async (req, res) => {
    try {
        const battleTag = req.params.battleTag;
        const { race = 1, gateWay = 20, season = 23, gameMode = 1 } = req.query;
        
        console.log(`Fetching MMR timeline for: ${battleTag}`);
        
        const response = await axios.get(
            `https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/mmr-rp-timeline`,
            {
                params: { race, gateWay, season, gameMode }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching MMR timeline:', error.message);
        res.status(500).json({ error: 'Failed to fetch MMR timeline' });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 GNL League server running on http://localhost:${PORT}`);
    console.log(`📊 API proxy ready for W3Champions data`);
});
