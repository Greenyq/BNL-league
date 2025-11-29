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

// Proxy endpoint for W3Champions matches - THIS IS THE MAIN ONE
app.get('/api/matches/:battleTag', async (req, res) => {
    try {
        const battleTag = req.params.battleTag;
        const { gateway = 20, season = 23, pageSize = 100, offset = 0 } = req.query;

        console.log(`Fetching matches for: ${battleTag}`);

        const response = await axios.get(
            `https://website-backend.w3champions.com/api/matches/search`,
            {
                params: {
                    playerIds: battleTag,
                    gateway,
                    season,
                    offset,
                    pageSize
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching matches:', error.message);
        res.status(500).json({ error: 'Failed to fetch matches', details: error.message });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 GNL League server running on http://localhost:${PORT}`);
    console.log(`📊 Using W3Champions matches API`);
});
