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

// Proxy endpoint for W3Champions API
app.get('/api/player/:battleTag', async (req, res) => {
    try {
        const battleTag = req.params.battleTag;
        const searchName = battleTag.split('#')[0];
        
        console.log(`Fetching data for: ${battleTag}`);
        
        const response = await axios.get(
            `https://website-backend.w3champions.com/api/players/search?search=${encodeURIComponent(searchName)}`
        );
        
        if (response.data && response.data.length > 0) {
            // Find exact match or return first result
            const player = response.data.find(p => p.battleTag === battleTag) || response.data[0];
            res.json(player);
        } else {
            res.status(404).json({ error: 'Player not found' });
        }
    } catch (error) {
        console.error('Error fetching player data:', error.message);
        res.status(500).json({ error: 'Failed to fetch player data' });
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

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 GNL League server running on http://localhost:${PORT}`);
    console.log(`📊 API proxy ready for W3Champions data`);
});
