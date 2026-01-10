const mongoose = require('mongoose');
const axios = require('axios');
const { Player, PlayerCache } = require('../src/backend/models');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/gnl_league';

// Load matches from W3Champions API
async function loadMatchesForPlayer(battleTag) {
    try {
        const gateway = 20;
        const season = 23;
        const pageSize = 100;
        const apiUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&gateway=${gateway}&season=${season}&offset=0&pageSize=${pageSize}`;

        console.log(`   📥 Fetching matches for ${battleTag}...`);
        const response = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'BNL-League-App', 'Accept': 'application/json' },
            timeout: 15000
        });

        if (response.data && response.data.matches && Array.isArray(response.data.matches)) {
            const matches = response.data.matches;
            console.log(`   ✅ Found ${matches.length} matches for ${battleTag}`);
            return matches;
        } else {
            console.log(`   ⚠️ No matches data in response for ${battleTag}`);
            return [];
        }
    } catch (error) {
        console.error(`   ❌ Error loading matches for ${battleTag}:`, error.message);
        return [];
    }
}

// Save matches to PlayerCache
async function saveToCache(battleTag, matches) {
    try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days

        await PlayerCache.findOneAndUpdate(
            { battleTag },
            {
                battleTag,
                matchData: matches,
                lastUpdated: new Date(),
                expiresAt
            },
            { upsert: true, new: true }
        );

        console.log(`   💾 Saved ${matches.length} matches to cache for ${battleTag}`);
        return true;
    } catch (error) {
        console.error(`   ❌ Error saving cache for ${battleTag}:`, error.message);
        return false;
    }
}

// Main function
async function reloadAllMatchCache() {
    console.log('🚀 Starting match cache reload from W3Champions API...\n');
    const startTime = Date.now();

    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URL);
        console.log('✅ Connected to MongoDB\n');

        // Get all players
        const players = await Player.find({});
        console.log(`📊 Found ${players.length} players to process\n`);

        let successCount = 0;
        let errorCount = 0;

        // Process each player
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            console.log(`[${i + 1}/${players.length}] Processing ${player.battleTag} (${player.name})...`);

            // Load matches from W3Champions
            const matches = await loadMatchesForPlayer(player.battleTag);

            // Save to cache
            if (matches.length > 0) {
                const saved = await saveToCache(player.battleTag, matches);
                if (saved) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } else {
                console.log(`   ⚠️ No matches found, skipping cache save`);
                errorCount++;
            }

            // Add delay to avoid rate limiting
            if (i < players.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
            }

            console.log('');
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log('\n' + '='.repeat(60));
        console.log('✅ Match cache reload complete!');
        console.log(`   Success: ${successCount}/${players.length}`);
        console.log(`   Errors: ${errorCount}/${players.length}`);
        console.log(`   Time: ${elapsed}s`);
        console.log('='.repeat(60));

        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    reloadAllMatchCache()
        .then(() => {
            console.log('\n✅ Done! Now run: npm run recalc-stats');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Error:', error);
            process.exit(1);
        });
}

module.exports = { reloadAllMatchCache };
