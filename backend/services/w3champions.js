const axios = require('axios');
const { PlayerCache } = require('../models/Player');

const W3C_BASE = 'https://website-backend.w3champions.com/api';
const HEADERS  = { 'User-Agent': 'BNL-League-App', 'Accept': 'application/json' };

const PERMANENT_SEASON_START = new Date(process.env.BNL_SEASON_START || '2026-05-30T00:00:00Z');
const MATCH_PAGE_SIZE = 100;
const MAX_MATCH_PAGES = 5;

// Fetch and cache match history for one player.
// Returns matches from the permanent BNL season window.
async function loadMatchDataForPlayer(player, { season = 24, gateway = 20 } = {}) {
    try {
        const matchData = [];
        for (let page = 0; page < MAX_MATCH_PAGES; page++) {
            const offset = page * MATCH_PAGE_SIZE;
            const url = `${W3C_BASE}/matches/search?playerId=${encodeURIComponent(player.battleTag)}&gateway=${gateway}&season=${season}&offset=${offset}&pageSize=${MATCH_PAGE_SIZE}`;
            const { data } = await axios.get(url, { headers: HEADERS, timeout: 12000 });
            const matches = data.matches || [];

            matchData.push(...matches.filter(m => new Date(m.startTime) >= PERMANENT_SEASON_START));

            const reachedOlderMatches = matches.some(m => new Date(m.startTime) < PERMANENT_SEASON_START);
            if (matches.length < MATCH_PAGE_SIZE || reachedOlderMatches) break;
        }

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

module.exports = { loadMatchDataForPlayer, fetchPlayerMmr, searchPlayer, searchPlayers, PERMANENT_SEASON_START };
