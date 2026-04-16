const axios = require('axios');
const { PlayerCache } = require('../models/Player');

const W3C_BASE = 'https://website-backend.w3champions.com/api';
const HEADERS  = { 'User-Agent': 'BNL-League-App', 'Accept': 'application/json' };

const STAGE1_START = new Date('2026-02-09T00:00:00Z');
const STAGE1_END   = new Date('2026-02-23T00:00:00Z'); // Feb 22 inclusive

// Fetch and cache match history for one player.
// Returns the filtered match array (Stage 1 only).
async function loadMatchDataForPlayer(player, { season = 24, gateway = 20 } = {}) {
    try {
        const url = `${W3C_BASE}/matches/search?playerId=${encodeURIComponent(player.battleTag)}&gateway=${gateway}&season=${season}&pageSize=100`;
        const { data } = await axios.get(url, { headers: HEADERS, timeout: 12000 });

        const matchData = (data.matches || []).filter(m => {
            const d = new Date(m.startTime);
            return d >= STAGE1_START && d < STAGE1_END;
        });

        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1-hour TTL
        await PlayerCache.findOneAndUpdate(
            { battleTag: player.battleTag },
            { battleTag: player.battleTag, matchData, lastUpdated: new Date(), expiresAt },
            { upsert: true, new: true }
        );

        return matchData;
    } catch (err) {
        console.error(`[w3c] loadMatches ${player.battleTag}: ${err.message}`);
        return [];
    }
}

// Update currentMmr for a single player from W3Champions (1v1 Solo mode).
// Returns the new MMR value, or null if unavailable.
async function fetchPlayerMmr(battleTag, { season = 24, gateway = 20 } = {}) {
    try {
        const url = `${W3C_BASE}/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateway=${gateway}&season=${season}`;
        const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });

        if (!data || !data.length) return null;
        const solo = data.find(m => m.gameMode === 1);
        return solo && solo.mmr > 0 ? solo.mmr : null;
    } catch (err) {
        console.error(`[w3c] fetchMmr ${battleTag}: ${err.message}`);
        return null;
    }
}

// Search for a player on W3Champions by battletag (handles case variations).
async function searchPlayer(battleTag) {
    try {
        const url = `${W3C_BASE}/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateway=20&season=24`;
        const { data } = await axios.get(url, { headers: HEADERS, timeout: 8000 });
        return data || null;
    } catch (err) {
        return null;
    }
}

// Autocomplete players by partial battletag/name.
async function searchPlayers(query, { pageSize = 20 } = {}) {
    try {
        const url = `${W3C_BASE}/players/global-search?search=${encodeURIComponent(query)}&pageSize=${pageSize}`;
        const { data } = await axios.get(url, { headers: HEADERS, timeout: 8000 });
        return Array.isArray(data) ? data : [];
    } catch (err) {
        return [];
    }
}

module.exports = { loadMatchDataForPlayer, fetchPlayerMmr, searchPlayer, searchPlayers, STAGE1_START, STAGE1_END };
