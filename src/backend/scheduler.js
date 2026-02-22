const { Player, PlayerCache, PlayerStats } = require('./models');
const cron = require('node-cron');
const axios = require('axios');

// Achievement bonuses (must match frontend's achievements object)
const achievements = {
    // Win Streaks
    winStreak3: { points: 30 },
    winStreak5: { points: 50 },
    winStreak10: { points: 100 },
    winStreak15: { points: 150 },
    // Loss Streaks
    loseStreak3: { points: 10 },
    loseStreak10: { points: 25 },
    // MMR Challenges
    giantSlayer: { points: 25 },
    titanSlayer: { points: 50 },
    davidVsGoliath: { points: 100 },
    // Total Wins
    warrior: { points: 30 },
    centurion: { points: 50 },
    centurionSupreme: { points: 80 },
    noMercy: { points: 40 },
    // Weekly/Activity
    gladiator: { points: 20 },
    perfectWeek: { points: 50 },
    // Points
    goldRush: { points: 30 },
    platinumRush: { points: 60 },
    // Special
    comeback: { points: 20 },
    persistent: { points: 40 },
    veteran: { points: 35 },
    marathonRunner: { points: 30 },
    // MMR Milestones
    mmrMillionaire: { points: 50 },
    eliteWarrior: { points: 100 },
    // BNL
    bnlRobber: { points: 30 },
    bnlVictim: { points: -10 },
    bnlRivalry: { points: 25 },
    bnlDominator: { points: 60 },
};

// Determine achievements based on stats
// Returns array of achievement keys (repeatable achievements appear multiple times)
const determineAchievements = (wins, losses, points, totalGames, matchHistory = [], currentMmr = 0) => {
    const achs = [];

    // Validate inputs
    const validWins = Math.max(0, parseInt(wins) || 0);
    const validLosses = Math.max(0, parseInt(losses) || 0);
    const validPoints = parseInt(points) || 0;
    const validTotalGames = Math.max(0, parseInt(totalGames) || 0);
    const validCurrentMmr = Math.max(0, parseInt(currentMmr) || 0);
    const validMatchHistory = Array.isArray(matchHistory) ? matchHistory : [];

    // === ONE-TIME MILESTONE ACHIEVEMENTS ===

    // Total Wins
    if (validWins >= 200) achs.push('centurionSupreme');
    else if (validWins >= 100) achs.push('centurion');
    else if (validWins >= 50) achs.push('warrior');

    // Weekly/Season wins
    if (validWins >= 20) achs.push('perfectWeek');
    else if (validWins >= 10) achs.push('gladiator');
    if (validWins >= 50) achs.push('noMercy');

    // Points
    if (validPoints >= 2000) achs.push('platinumRush');
    else if (validPoints >= 1000) achs.push('goldRush');

    // MMR
    if (validCurrentMmr >= 2200) achs.push('eliteWarrior');
    else if (validCurrentMmr >= 2000) achs.push('mmrMillionaire');

    // Game counts
    if (validTotalGames >= 100) achs.push('marathonRunner');
    if (validTotalGames >= 500) achs.push('veteran');

    // BNL-specific (milestone-based)
    const bnlWins = validMatchHistory.filter(m => m.result === 'win' && m.isBnlMatch).length;
    const bnlLosses = validMatchHistory.filter(m => m.result === 'loss' && m.isBnlMatch).length;

    if (bnlWins >= 10) achs.push('bnlDominator');
    else if (bnlWins >= 5) achs.push('bnlRivalry');
    else if (bnlWins >= 1) achs.push('bnlRobber');

    if (bnlLosses >= 1) achs.push('bnlVictim');

    // === REPEATABLE ACHIEVEMENTS (count all occurrences) ===

    // Count all separate win streaks
    let currentWinStreak = 0;
    const winStreaks = [];
    for (const match of validMatchHistory) {
        if (match.result === 'win') {
            currentWinStreak++;
        } else {
            if (currentWinStreak > 0) winStreaks.push(currentWinStreak);
            currentWinStreak = 0;
        }
    }
    if (currentWinStreak > 0) winStreaks.push(currentWinStreak);

    // Classify each win streak at its highest tier
    for (const streak of winStreaks) {
        if (streak >= 15) achs.push('winStreak15');
        else if (streak >= 10) achs.push('winStreak10');
        else if (streak >= 5) achs.push('winStreak5');
        else if (streak >= 3) achs.push('winStreak3');
    }

    // Count all separate loss streaks
    let currentLossStreak = 0;
    const lossStreaks = [];
    for (const match of validMatchHistory) {
        if (match.result === 'loss') {
            currentLossStreak++;
        } else {
            if (currentLossStreak > 0) lossStreaks.push(currentLossStreak);
            currentLossStreak = 0;
        }
    }
    if (currentLossStreak > 0) lossStreaks.push(currentLossStreak);

    // Classify each loss streak at its highest tier
    for (const streak of lossStreaks) {
        if (streak >= 10) achs.push('loseStreak10');
        else if (streak >= 3) achs.push('loseStreak3');
    }

    // Count all MMR challenge wins (each occurrence counts)
    for (const match of validMatchHistory) {
        if (match.result === 'win') {
            if (match.mmrDiff >= 200) achs.push('davidVsGoliath');
            else if (match.mmrDiff >= 100) achs.push('titanSlayer');
            else if (match.mmrDiff >= 50) achs.push('giantSlayer');
        }
    }

    // Count all comebacks (win after 3+ consecutive losses)
    let consecutiveLosses = 0;
    for (const match of validMatchHistory) {
        if (match.result === 'loss') {
            consecutiveLosses++;
        } else {
            if (consecutiveLosses >= 3) {
                achs.push('comeback');
            }
            consecutiveLosses = 0;
        }
    }

    // Persistent: 5 wins after 5 losses streak
    let lossCount = 0;
    let winCountAfterLosses = 0;
    let persistentCount = 0;
    for (const match of validMatchHistory) {
        if (match.result === 'loss') {
            lossCount++;
            winCountAfterLosses = 0;
        } else {
            if (lossCount >= 5) {
                winCountAfterLosses++;
                if (winCountAfterLosses >= 5) {
                    persistentCount++;
                    lossCount = 0;
                    winCountAfterLosses = 0;
                }
            }
        }
    }
    for (let i = 0; i < persistentCount; i++) {
        achs.push('persistent');
    }

    return achs;
};

// Process matches and calculate stats (ported from frontend)
const processMatches = (battleTag, matches, allBnlBattleTags = new Set()) => {
    console.log(`  🔄 Processing ${battleTag}: ${matches ? matches.length : 0} total matches`);

    if (!matches || matches.length === 0) {
        console.log(`  ⚠️ ${battleTag}: NO MATCHES IN CACHE!`);
        return [{
            race: 0,
            mmr: 0,
            wins: 0,
            losses: 0,
            points: 0,
            achievements: [],
            matchCount: 0
        }];
    }

    // Filter matches for Stage 1 (2026-02-09 to 2026-02-22)
    let recentMatches = matches;
    const cutoffDate = new Date('2026-02-09T00:00:00Z');
    const stage1EndDate = new Date('2026-02-23T00:00:00Z'); // Stage 1 ended Feb 22 (inclusive)

    recentMatches = matches.filter(match => {
        const matchDate = new Date(match.startTime);
        return matchDate >= cutoffDate && matchDate < stage1EndDate;
    });
    console.log(`  📅 ${battleTag}: After date filter (2026-02-09 to 2026-02-22): ${recentMatches.length} matches`);

    // Sort by date if needed
    if (recentMatches.length > 1) {
        const firstTime = new Date(recentMatches[0].startTime).getTime();
        const lastTime = new Date(recentMatches[recentMatches.length - 1].startTime).getTime();
        if (firstTime > lastTime) {
            recentMatches.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        }
    }

    // Group matches by race
    const matchesByRace = {};
    const mmrByRace = {};
    let skippedNot1v1 = 0;
    let skippedNoTeams = 0;
    let skippedNoPlayer = 0;
    let processedMatches = 0;

    for (let i = 0; i < recentMatches.length; i++) {
        const match = recentMatches[i];

        if (match.gameMode !== 1) {
            skippedNot1v1++;
            continue;
        }
        if (!match.teams || !Array.isArray(match.teams) || match.teams.length < 2) {
            skippedNoTeams++;
            continue;
        }

        let playerTeam = null;
        let player = null;

        for (let j = 0; j < match.teams.length; j++) {
            const team = match.teams[j];
            if (!team || !team.players || !Array.isArray(team.players)) continue;

            for (let k = 0; k < team.players.length; k++) {
                const p = team.players[k];
                if (p && p.battleTag === battleTag) {
                    playerTeam = team;
                    player = p;
                    break;
                }
            }
            if (playerTeam) break;
        }

        if (!playerTeam || !player || player.race === undefined || player.race === null) {
            skippedNoPlayer++;
            continue;
        }

        const race = player.race;
        if (!matchesByRace[race]) {
            matchesByRace[race] = [];
        }

        matchesByRace[race].push(match);
        mmrByRace[race] = player.currentMmr || mmrByRace[race] || 0;
        processedMatches++;
    }

    console.log(`  📊 ${battleTag}: Skipped - Not 1v1: ${skippedNot1v1}, No teams: ${skippedNoTeams}, Player not found: ${skippedNoPlayer}, PROCESSED: ${processedMatches}`);

    // If no races found, return empty profile
    if (Object.keys(matchesByRace).length === 0) {
        console.log(`  ❌ ${battleTag}: NO VALID MATCHES FOUND after filtering!`);
        return [{
            race: 0,
            mmr: 0,
            wins: 0,
            losses: 0,
            points: 0,
            achievements: [],
            matchCount: 0
        }];
    }

    // Create profile for each race
    const profiles = [];

    for (const [race, raceMatches] of Object.entries(matchesByRace)) {
        const raceInt = parseInt(race);
        let wins = 0;
        let losses = 0;
        let totalPoints = 0;
        const matchHistory = [];

        // Process each match for this race
        raceMatches.forEach(match => {
            const team1Players = match.teams?.[0]?.players || [];
            const team2Players = match.teams?.[1]?.players || [];

            if (team1Players.length !== 1 || team2Players.length !== 1) {
                return; // Skip non-1v1
            }

            const playerTeam = match.teams.find(team =>
                team.players.some(p => p.battleTag === battleTag)
            );

            if (!playerTeam) return;

            const player = playerTeam.players.find(p => p.battleTag === battleTag);
            const opponentTeam = match.teams.find(team => team !== playerTeam);

            if (!player || !opponentTeam || !opponentTeam.players || opponentTeam.players.length === 0) return;

            const opponent = opponentTeam.players[0];
            const won = playerTeam.won;

            const playerMMR = player.oldMmr || player.currentMmr || 1500;
            const opponentMMR = opponent.oldMmr || opponent.currentMmr || 1500;
            const mmrDiff = opponentMMR - playerMMR;

            const isBnlMatch = opponent.battleTag ? allBnlBattleTags.has(opponent.battleTag) : false;

            let matchPoints = 0;

            if (won) {
                wins++;
                matchHistory.push({ result: 'win', mmrDiff, playerMMR, opponentMMR, isBnlMatch, opponentTag: opponent.battleTag });
                if (mmrDiff >= 20) matchPoints = 30;
                else if (mmrDiff >= -19) matchPoints = 50;
                else matchPoints = 70;
            } else {
                losses++;
                matchHistory.push({ result: 'loss', mmrDiff, playerMMR, opponentMMR, isBnlMatch, opponentTag: opponent.battleTag });
                // Reduced loss penalties
                if (mmrDiff <= -20) matchPoints = -40;      // Loss to weaker
                else if (mmrDiff >= -19 && mmrDiff <= 19) matchPoints = -30; // Loss to equal
                else matchPoints = -20;                      // Loss to stronger
            }

            totalPoints += matchPoints;
            // Floor: points cannot go below 0 per race
            if (totalPoints < 0) totalPoints = 0;
        });

        // Determine achievements
        const achs = determineAchievements(wins, losses, totalPoints, raceMatches.length, matchHistory, mmrByRace[race]);

        // Add achievement bonuses
        achs.forEach(achKey => {
            if (achievements[achKey]) {
                totalPoints += achievements[achKey].points;
            }
        });

        profiles.push({
            race: raceInt,
            mmr: mmrByRace[race],
            wins: wins,
            losses: losses,
            points: totalPoints,
            achievements: achs,
            matchCount: raceMatches.length,
            matchHistory: matchHistory.reverse().slice(0, 20) // Last 20 matches, most recent first
        });
    }

    // Sort profiles by race ID
    profiles.sort((a, b) => a.race - b.race);

    const totalWins = profiles.reduce((sum, p) => sum + p.wins, 0);
    const totalLosses = profiles.reduce((sum, p) => sum + p.losses, 0);
    const totalPoints = profiles.reduce((sum, p) => sum + p.points, 0);
    console.log(`  ✅ ${battleTag}: RESULT - ${profiles.length} race(s), Wins: ${totalWins}, Losses: ${totalLosses}, Points: ${totalPoints}`);

    return profiles;
};

// Load match data from W3Champions API
async function loadMatchDataForPlayer(player) {
    try {
        const cutoffDate = new Date('2026-02-09T00:00:00Z');
        const apiUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(player.battleTag)}&gateway=20&season=24&pageSize=100`;

        const response = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'BNL-League-App', 'Accept': 'application/json' },
            timeout: 12000
        });

        let matchData = response.data.matches || [];
        const stage1EndDate = new Date('2026-02-23T00:00:00Z'); // Stage 1 ended Feb 22 (inclusive)
        matchData = matchData.filter(m => {
            const d = new Date(m.startTime);
            return d >= cutoffDate && d < stage1EndDate;
        });

        // Save to cache
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour TTL

        await PlayerCache.findOneAndUpdate(
            { battleTag: player.battleTag },
            {
                battleTag: player.battleTag,
                matchData,
                lastUpdated: new Date(),
                expiresAt
            },
            { upsert: true, new: true }
        );

        console.log(`   📥 Loaded ${matchData.length} matches for ${player.battleTag}`);
        return matchData;
    } catch (error) {
        console.log(`   ❌ Error loading matches for ${player.battleTag}: ${error.message}`);
        return [];
    }
}

// Update MMR for all players from W3Champions
async function updateAllPlayerMMR() {
    console.log('🔄 Updating MMR from W3Champions...');
    const players = await Player.find({});
    let updated = 0;

    for (const player of players) {
        try {
            const apiUrl = `https://website-backend.w3champions.com/api/players/${encodeURIComponent(player.battleTag)}/game-mode-stats?gateway=20&season=24`;
            const response = await axios.get(apiUrl, {
                headers: { 'User-Agent': 'BNL-League-App', 'Accept': 'application/json' },
                timeout: 10000
            });

            if (response.data && response.data.length > 0) {
                // Find 1v1 Solo mode (gameMode === 1)
                const solo1v1 = response.data.find(mode => mode.gameMode === 1);

                if (solo1v1 && solo1v1.mmr > 0) {
                    if (solo1v1.mmr !== player.currentMmr) {
                        await Player.updateOne({ _id: player._id }, { currentMmr: solo1v1.mmr });
                        console.log(`   Updated ${player.battleTag}: ${player.currentMmr || 'none'} → ${solo1v1.mmr}`);
                        updated++;
                    } else {
                        console.log(`   ✓ ${player.battleTag} MMR already up to date: ${player.currentMmr}`);
                    }
                } else {
                    console.log(`   ⚠️ No 1v1 Solo MMR found for ${player.battleTag} (available modes: ${response.data.map(m => `gameMode=${m.gameMode}`).join(', ')})`);
                }
            } else {
                console.log(`   ⚠️ No game mode stats returned for ${player.battleTag} (response empty)`);
            }
        } catch (error) {
            console.log(`   ❌ Error fetching MMR for ${player.battleTag}: ${error.message}`);
        }
    }

    console.log(`✅ Updated MMR for ${updated}/${players.length} players`);
    return updated;
}

// Main function: Recalculate stats for all players
async function recalculateAllPlayerStats() {
    try {
        console.log('🔄 Starting player stats recalculation...');
        const startTime = Date.now();

        // First, update all players' MMR from W3Champions
        await updateAllPlayerMMR();

        // Get all players from database
        const players = await Player.find({});
        console.log(`📊 Found ${players.length} players to recalculate`);

        // Get all BNL player tags for match detection
        const allBnlBattleTags = new Set(players.map(p => p.battleTag));

        let updatedCount = 0;

        // Process each player
        for (const player of players) {
            try {
                // ALWAYS load fresh match data from W3Champions
                console.log(`📥 ${player.battleTag}: Loading fresh match data...`);
                await loadMatchDataForPlayer(player);

                // Get cached matchData for this player
                const cache = await PlayerCache.findOne({ battleTag: player.battleTag });

                console.log(`📦 ${player.battleTag}: cache=${!!cache}, matchData=${cache?.matchData?.length || 0}`);

                // If no data after loading, create empty stats
                if (!cache || !cache.matchData || cache.matchData.length === 0) {
                    console.log(`   ⚠️ ${player.battleTag}: Still no data - creating empty stats`);
                    await PlayerStats.findOneAndUpdate(
                        { battleTag: player.battleTag },
                        {
                            battleTag: player.battleTag,
                            points: 0,
                            wins: 0,
                            losses: 0,
                            mmr: player.currentMmr || 0,
                            raceStats: [],
                            updatedAt: new Date()
                        },
                        { upsert: true, new: true }
                    );
                    updatedCount++;
                    continue;
                }

                // Calculate stats for this player
                const profiles = processMatches(player.battleTag, cache.matchData, allBnlBattleTags);

                // Calculate overall stats (sum across all races)
                let overallWins = 0;
                let overallLosses = 0;
                let overallPoints = 0;

                const raceStats = profiles.map(profile => ({
                    race: profile.race,
                    points: profile.points,
                    wins: profile.wins,
                    losses: profile.losses,
                    mmr: profile.mmr,
                    achievements: profile.achievements,
                    matchCount: profile.matchCount,
                    matchHistory: profile.matchHistory || []
                }));

                raceStats.forEach(stat => {
                    overallWins += stat.wins;
                    overallLosses += stat.losses;
                    overallPoints += stat.points;
                });

                // Apply points floor: cannot go below 0, and if reached 500 cannot go below 500
                const existingStats = await PlayerStats.findOne({ battleTag: player.battleTag });
                const previousMaxPoints = existingStats?.maxPointsAchieved || existingStats?.points || 0;
                const maxPointsAchieved = Math.max(overallPoints, previousMaxPoints);
                const pointsFloor = maxPointsAchieved >= 500 ? 500 : 0;
                overallPoints = Math.max(pointsFloor, overallPoints);

                // Save to PlayerStats collection
                await PlayerStats.findOneAndUpdate(
                    { battleTag: player.battleTag },
                    {
                        battleTag: player.battleTag,
                        points: overallPoints,
                        wins: overallWins,
                        losses: overallLosses,
                        mmr: player.currentMmr || 0,
                        maxPointsAchieved: maxPointsAchieved,
                        raceStats: raceStats,
                        updatedAt: new Date()
                    },
                    { upsert: true, new: true }
                );

                updatedCount++;
            } catch (error) {
                console.error(`❌ Error processing ${player.battleTag}:`, error.message);
            }
        }

        const elapsed = Date.now() - startTime;
        console.log(`✅ Player stats recalculation complete: ${updatedCount}/${players.length} in ${elapsed}ms`);
        return { success: true, updated: updatedCount, elapsed };
    } catch (error) {
        console.error('❌ Fatal error in stats recalculation:', error);
        throw error;
    }
}

// Initialize scheduler
function initializeScheduler() {
    console.log('📅 Initializing stats scheduler...');

    // Run every 10 minutes: "*/10 * * * *"
    // Run every hour: "0 * * * *"
    // Run every 5 minutes for testing: "*/5 * * * *"
    const job = cron.schedule('*/10 * * * *', async () => {
        console.log('\n' + '='.repeat(70));
        console.log('⏰ CRON JOB TRIGGERED at', new Date().toISOString());
        console.log('='.repeat(70));
        await recalculateAllPlayerStats();
        console.log('='.repeat(70));
        console.log('✅ CRON JOB COMPLETED at', new Date().toISOString());
        console.log('='.repeat(70) + '\n');
    });

    console.log('✅ Stats scheduler initialized (every 10 minutes)');
    console.log('   Next run will be in ~10 minutes');
    return job;
}

module.exports = {
    initializeScheduler,
    recalculateAllPlayerStats
};
