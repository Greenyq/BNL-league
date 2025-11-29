const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/matches/:battleTag', async (req, res) => {
    try {
        const battleTag = req.params.battleTag;
        const { gateway = 20, season = 23, pageSize = 100, offset = 0 } = req.query;

        console.log(`Fetching matches for: ${battleTag}`);

        const url =
            "https://website-backend.w3champions.com/api/matches/search?" +
            new URLSearchParams({
                playerIds: battleTag,
                gateway,
                season,
                pageSize,
                offset
            });

        const response = await fetch(url, {
            signal: AbortSignal.timeout(8000), // 🔥 ОЧЕНЬ ВАЖНО ДЛЯ RENDER
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        console.log("W3C response count:", data.matches?.length || 0);

        res.json(data);

    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({
            error: 'Failed to fetch matches',
            details: error.message
        });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 GNL League server running on http://localhost:${PORT}`);
});
