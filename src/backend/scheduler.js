const { Player, PlayerCache, PlayerStats } = require('./models');
const cron = require('node-cron');

// Achievement bonuses (copied from frontend)
const achievements = {
    centurion: { points: 100 },
    centurionSupreme: { points: 150 },
    warrior: { points: 50 },
    gladiator: { points: 30 },
    perfectWeek: { points: 40 },
    noMercy: { points: 60 },
    risingDragon: { points: 45 },
    oneShotWonder: { points: 25 },
    bnlDominator: { points: 80 },
    streamHunter: { points: 35 },
    unbeatenStreak: { points: 55 },
};

// Determine achievements based on stats
const determineAchievements = (wins, losses, points, totalGames, matchHistory = [], currentMmr = 0) => {
    const achs = [];

    // Validate inputs
    const validWins = Math.max(0, parseInt(wins) || 0);
    const validLosses = Math.max(0, parseInt(losses) || 0);
    const validPoints = parseInt(points) || 0;
    const validTotalGames = Math.max(0, parseInt(totalGames) || 0);
    const validCurrentMmr = Math.max(0, parseInt(currentMmr) || 0);
    const validMatchHistory = Array.isArray(matchHistory) ? matchHistory : [];

    // Win milestones
    if (validWins >= 200) achs.push('centurionSupreme');
    else if (validWins >= 100) achs.push('centurion');
    else if (validWins >= 50) achs.push('warrior');

    // Weekly/Season wins
    if (validWins >= 20) achs.push('perfectWeek');
    else if (validWins >= 10) achs.push('gladiator');
    if (validWins >= 50) achs.push('noMercy');

    // High rating
    if (validCurrentMmr >= 2500) achs.push('risingDragon');

    // One-shot wins (no losses)
    if (validWins >= 3 && validLosses === 0) achs.push('oneShotWonder');

    // BNL-specific wins
    const bnlWins = validMatchHistory.filter(m => m.result === 'win' && m.isBnlMatch).length;
    if (bnlWins >= 5) achs.push('bnlDominator');

    // High points
    if (validPoints >= 1000) achs.push('streamHunter');

    // Winning streak
    let maxWinStreak = 0;
    let currentStreak = 0;
    for (const match of validMatchHistory) {
        if (match.result === 'win') {
            currentStreak++;
            maxWinStreak = Math.max(maxWinStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }
    if (maxWinStreak >= 5) achs.push('unbeatenStreak');

    return achs;
};

// Process matches and calculate stats (ported from frontend)
const processMatches = (battleTag, matches, allBnlBattleTags = new Set()) => {
    if (!matches || matches.length === 0) {
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

    // Filter recent matches (from 2025-11-27 onwards)
    let recentMatches = matches;
    const cutoffDate = new Date('2025-11-27T00:00:00Z');

    if (matches.length > 50) {
        recentMatches = matches.filter(match => {
            const matchDate = new Date(match.startTime);
            return matchDate >= cutoffDate;
        });
    }

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

    for (let i = 0; i < recentMatches.length; i++) {
        const match = recentMatches[i];

        if (match.gameMode !== 1) continue;
        if (!match.teams || !Array.isArray(match.teams) || match.teams.length < 2) continue;

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

        if (!playerTeam || !player || !player.race) continue;

        const race = player.race;
        if (!matchesByRace[race]) {
            matchesByRace[race] = [];
        }

        matchesByRace[race].push(match);
        mmrByRace[race] = player.currentMmr || mmrByRace[race] || 0;
    }

    // If no races found, return empty profile
    if (Object.keys(matchesByRace).length === 0) {
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
                if (mmrDiff >= 20) matchPoints = 70;
                else if (mmrDiff >= -19) matchPoints = 50;
                else matchPoints = 30;
            } else {
                losses++;
                matchHistory.push({ result: 'loss', mmrDiff, playerMMR, opponentMMR, isBnlMatch, opponentTag: opponent.battleTag });
                if (mmrDiff <= -20) matchPoints = -70;
                else if (mmrDiff >= -19 && mmrDiff <= 19) matchPoints = -50;
                else matchPoints = -30;
            }

            totalPoints += matchPoints;
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
            matchCount: raceMatches.length
        });
    }

    // Sort profiles by race ID
    profiles.sort((a, b) => a.race - b.race);

    return profiles;
};

// Main function: Recalculate stats for all players
async function recalculateAllPlayerStats() {
    try {
        console.log('🔄 Starting player stats recalculation...');
        const startTime = Date.now();

        // Get all players from database
        const players = await Player.find({});
        console.log(`📊 Found ${players.length} players to recalculate`);

        // Get all BNL player tags for match detection
        const allBnlBattleTags = new Set(players.map(p => p.battleTag));

        let updatedCount = 0;

        // Process each player
        for (const player of players) {
            try {
                // Get cached matchData for this player
                const cache = await PlayerCache.findOne({ battleTag: player.battleTag });

                if (!cache || !cache.matchData || cache.matchData.length === 0) {
                    // No match data yet, create empty stats
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
                    matchCount: profile.matchCount
                }));

                raceStats.forEach(stat => {
                    overallWins += stat.wins;
                    overallLosses += stat.losses;
                    overallPoints += stat.points;
                });

                // Save to PlayerStats collection
                await PlayerStats.findOneAndUpdate(
                    { battleTag: player.battleTag },
                    {
                        battleTag: player.battleTag,
                        points: overallPoints,
                        wins: overallWins,
                        losses: overallLosses,
                        mmr: player.currentMmr || 0,
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
        console.log('⏰ Cron job triggered at', new Date().toISOString());
        await recalculateAllPlayerStats();
    });

    console.log('✅ Stats scheduler initialized (every 10 minutes)');
    return job;
}

module.exports = {
    initializeScheduler,
    recalculateAllPlayerStats
};
