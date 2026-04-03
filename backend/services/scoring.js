/**
 * BNL Scoring Engine
 *
 * Points per match (based on MMR difference: opponentMMR − playerMMR):
 *   Win  vs stronger (diff ≥ +20): 30 pts
 *   Win  vs equal   (diff ±19)   : 50 pts
 *   Win  vs weaker  (diff ≤ −20) : 70 pts
 *   Loss to stronger (diff ≥ +20): −20 pts
 *   Loss to equal   (diff ±19)   : −30 pts
 *   Loss to weaker  (diff ≤ −20) : −40 pts
 *   Floor per race: 0 pts (or 500 if player ever reached 500)
 */

const cron = require('node-cron');
const { Player, PlayerCache, PlayerStats, ManualPointsAdjustment } = require('../models/Player');
const { loadMatchDataForPlayer, fetchPlayerMmr } = require('./w3champions');

// ── Achievement bonus table ───────────────────────────────────────────────────
const ACHIEVEMENT_BONUSES = {
    winStreak3:      30,  winStreak5:     50,  winStreak10:  100, winStreak15: 150,
    loseStreak3:     10,  loseStreak10:   25,
    giantSlayer:     25,  titanSlayer:    50,  davidVsGoliath: 100,
    warrior:         30,  centurion:      50,  centurionSupreme: 80,
    noMercy:         40,  gladiator:      20,  perfectWeek:  50,
    goldRush:        30,  platinumRush:   60,
    comeback:        20,  persistent:     40,  veteran:      35,  marathonRunner: 30,
    mmrMillionaire:  50,  eliteWarrior:  100,
    bnlRobber:       30,  bnlVictim:    -10,  bnlRivalry:   25,  bnlDominator: 60,
};

// ── determineAchievements ─────────────────────────────────────────────────────
function determineAchievements(wins, losses, points, totalGames, matchHistory = [], currentMmr = 0) {
    const achs = [];
    const w = Math.max(0, wins | 0);
    const pts = points | 0;
    const g = Math.max(0, totalGames | 0);
    const mmr = Math.max(0, currentMmr | 0);
    const hist = Array.isArray(matchHistory) ? matchHistory : [];

    // One-time milestone achievements
    if (w >= 200)       achs.push('centurionSupreme');
    else if (w >= 100)  achs.push('centurion');
    else if (w >= 50)   achs.push('warrior');

    if (w >= 20)        achs.push('perfectWeek');
    else if (w >= 10)   achs.push('gladiator');
    if (w >= 50)        achs.push('noMercy');

    if (pts >= 2000)    achs.push('platinumRush');
    else if (pts >= 1000) achs.push('goldRush');

    if (mmr >= 2200)    achs.push('eliteWarrior');
    else if (mmr >= 2000) achs.push('mmrMillionaire');

    if (g >= 500)       achs.push('veteran');
    if (g >= 100)       achs.push('marathonRunner');

    // BNL-specific milestones
    const bnlWins   = hist.filter(m => m.result === 'win'  && m.isBnlMatch).length;
    const bnlLosses = hist.filter(m => m.result === 'loss' && m.isBnlMatch).length;
    if (bnlWins >= 10)       achs.push('bnlDominator');
    else if (bnlWins >= 5)   achs.push('bnlRivalry');
    else if (bnlWins >= 1)   achs.push('bnlRobber');
    if (bnlLosses >= 1)      achs.push('bnlVictim');

    // Repeatable: win streaks
    let streak = 0;
    const winStreaks = [];
    for (const m of hist) {
        if (m.result === 'win') { streak++; }
        else { if (streak > 0) winStreaks.push(streak); streak = 0; }
    }
    if (streak > 0) winStreaks.push(streak);
    for (const s of winStreaks) {
        if (s >= 15)      achs.push('winStreak15');
        else if (s >= 10) achs.push('winStreak10');
        else if (s >= 5)  achs.push('winStreak5');
        else if (s >= 3)  achs.push('winStreak3');
    }

    // Repeatable: loss streaks
    streak = 0;
    const lossStreaks = [];
    for (const m of hist) {
        if (m.result === 'loss') { streak++; }
        else { if (streak > 0) lossStreaks.push(streak); streak = 0; }
    }
    if (streak > 0) lossStreaks.push(streak);
    for (const s of lossStreaks) {
        if (s >= 10)     achs.push('loseStreak10');
        else if (s >= 3) achs.push('loseStreak3');
    }

    // Repeatable: MMR challenges & comebacks
    for (const m of hist) {
        if (m.result === 'win') {
            if (m.mmrDiff >= 200)      achs.push('davidVsGoliath');
            else if (m.mmrDiff >= 100) achs.push('titanSlayer');
            else if (m.mmrDiff >= 50)  achs.push('giantSlayer');
        }
    }

    // Comeback: win after 3+ consecutive losses
    let consLosses = 0;
    for (const m of hist) {
        if (m.result === 'loss') { consLosses++; }
        else { if (consLosses >= 3) achs.push('comeback'); consLosses = 0; }
    }

    // Persistent: 5 wins after 5 losses
    let lc = 0, wc = 0;
    for (const m of hist) {
        if (m.result === 'loss') { lc++; wc = 0; }
        else {
            if (lc >= 5) { wc++; if (wc >= 5) { achs.push('persistent'); lc = 0; wc = 0; } }
        }
    }

    return achs;
}

// ── processMatches ────────────────────────────────────────────────────────────
function processMatches(battleTag, matches, allBnlBattleTags = new Set()) {
    if (!matches || matches.length === 0) {
        return [{ race: 0, mmr: 0, wins: 0, losses: 0, points: 0, achievements: [], matchCount: 0 }];
    }

    const STAGE1_START = new Date('2026-02-09T00:00:00Z');
    const STAGE1_END   = new Date('2026-02-23T00:00:00Z');

    let filtered = matches.filter(m => {
        const d = new Date(m.startTime);
        return d >= STAGE1_START && d < STAGE1_END;
    });

    // Sort oldest→newest
    if (filtered.length > 1 && new Date(filtered[0].startTime) > new Date(filtered[filtered.length - 1].startTime)) {
        filtered.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    }

    const byRace  = {};
    const mmrByRace = {};

    for (const match of filtered) {
        if (match.gameMode !== 1) continue;
        if (!match.teams || match.teams.length < 2) continue;

        let playerTeam = null, player = null;
        for (const team of match.teams) {
            const p = (team.players || []).find(p => p.battleTag === battleTag);
            if (p) { playerTeam = team; player = p; break; }
        }
        if (!playerTeam || !player || player.race == null) continue;

        const race = player.race;
        byRace[race] = byRace[race] || [];
        byRace[race].push(match);
        mmrByRace[race] = player.currentMmr || mmrByRace[race] || 0;
    }

    if (Object.keys(byRace).length === 0) {
        return [{ race: 0, mmr: 0, wins: 0, losses: 0, points: 0, achievements: [], matchCount: 0 }];
    }

    return Object.entries(byRace).map(([race, raceMatches]) => {
        let wins = 0, losses = 0, totalPoints = 0;
        const matchHistory = [];

        for (const match of raceMatches) {
            const t1p = match.teams[0].players || [];
            const t2p = match.teams[1].players || [];
            if (t1p.length !== 1 || t2p.length !== 1) continue;

            const pTeam = match.teams.find(t => t.players.some(p => p.battleTag === battleTag));
            if (!pTeam) continue;
            const p   = pTeam.players.find(p => p.battleTag === battleTag);
            const opp = match.teams.find(t => t !== pTeam)?.players[0];
            if (!p || !opp) continue;

            const pMmr   = p.oldMmr   || p.currentMmr   || 1500;
            const oppMmr = opp.oldMmr || opp.currentMmr || 1500;
            const diff   = oppMmr - pMmr;
            const won    = pTeam.won;
            const isBnl  = allBnlBattleTags.has(opp.battleTag);

            let pts = 0;
            if (won) {
                wins++;
                pts = diff >= 20 ? 30 : diff >= -19 ? 50 : 70;
                matchHistory.push({ result: 'win',  mmrDiff: diff, playerMMR: pMmr, opponentMMR: oppMmr, isBnlMatch: isBnl, opponentTag: opp.battleTag });
            } else {
                losses++;
                pts = diff <= -20 ? -40 : diff <= 19 ? -30 : -20;
                matchHistory.push({ result: 'loss', mmrDiff: diff, playerMMR: pMmr, opponentMMR: oppMmr, isBnlMatch: isBnl, opponentTag: opp.battleTag });
            }

            totalPoints = Math.max(0, totalPoints + pts);
        }

        const raceInt = parseInt(race);
        const achs = determineAchievements(wins, losses, totalPoints, raceMatches.length, matchHistory, mmrByRace[race]);
        achs.forEach(k => { totalPoints += ACHIEVEMENT_BONUSES[k] || 0; });

        return {
            race: raceInt,
            mmr: mmrByRace[race],
            wins, losses,
            points: totalPoints,
            achievements: achs,
            matchCount: raceMatches.length,
            matchHistory: matchHistory.reverse().slice(0, 20)
        };
    }).sort((a, b) => a.race - b.race);
}

// ── recalculateAllPlayerStats ─────────────────────────────────────────────────
async function recalculateAllPlayerStats() {
    console.log('='.repeat(60));
    console.log('🔄 Stats recalculation started', new Date().toISOString());
    const t0 = Date.now();

    // 1. Refresh MMR for every player
    const players = await Player.find({});
    for (const p of players) {
        const mmr = await fetchPlayerMmr(p.battleTag);
        if (mmr !== null && mmr !== p.currentMmr) {
            await Player.updateOne({ _id: p._id }, { currentMmr: mmr });
            p.currentMmr = mmr;
        }
    }

    const allTags = new Set(players.map(p => p.battleTag));
    let updated = 0;

    // 2. Load fresh match data and compute stats
    for (const player of players) {
        try {
            await loadMatchDataForPlayer(player);
            const cache = await PlayerCache.findOne({ battleTag: player.battleTag });

            if (!cache || !cache.matchData?.length) {
                await PlayerStats.findOneAndUpdate(
                    { battleTag: player.battleTag },
                    { battleTag: player.battleTag, points: 0, wins: 0, losses: 0, mmr: player.currentMmr || 0, raceStats: [], updatedAt: new Date() },
                    { upsert: true }
                );
                updated++;
                continue;
            }

            const profiles = processMatches(player.battleTag, cache.matchData, allTags);

            let totalWins = 0, totalLosses = 0, totalPoints = 0;
            const raceStats = profiles.map(pr => {
                totalWins   += pr.wins;
                totalLosses += pr.losses;
                totalPoints += pr.points;
                return { race: pr.race, points: pr.points, wins: pr.wins, losses: pr.losses, mmr: pr.mmr, achievements: pr.achievements, matchCount: pr.matchCount, matchHistory: pr.matchHistory || [] };
            });

            // Points floor: 0 always; 500 if ever reached 500
            const existing = await PlayerStats.findOne({ battleTag: player.battleTag });
            const prevMax  = existing?.maxPointsAchieved || 0;
            const maxAch   = Math.max(totalPoints, prevMax);
            totalPoints    = Math.max(maxAch >= 500 ? 500 : 0, totalPoints);

            // Manual admin adjustments
            const adjustments = await ManualPointsAdjustment.find({ battleTag: player.battleTag });
            if (adjustments.length) {
                const delta = adjustments.reduce((s, a) => s + a.amount, 0);
                totalPoints = Math.max(0, totalPoints + delta);
            }

            await PlayerStats.findOneAndUpdate(
                { battleTag: player.battleTag },
                { battleTag: player.battleTag, points: totalPoints, wins: totalWins, losses: totalLosses, mmr: player.currentMmr || 0, maxPointsAchieved: maxAch, raceStats, updatedAt: new Date() },
                { upsert: true }
            );
            updated++;
        } catch (err) {
            console.error(`❌ ${player.battleTag}:`, err.message);
        }
    }

    console.log(`✅ Done: ${updated}/${players.length} players in ${Date.now() - t0}ms`);
    console.log('='.repeat(60));
    return { updated, total: players.length };
}

// ── Cron scheduler ────────────────────────────────────────────────────────────
function initializeScheduler() {
    const job = cron.schedule('*/10 * * * *', async () => {
        console.log('⏰ Cron triggered:', new Date().toISOString());
        await recalculateAllPlayerStats();
    });
    console.log('📅 Stats scheduler initialized (every 10 minutes)');
    return job;
}

module.exports = { processMatches, determineAchievements, recalculateAllPlayerStats, initializeScheduler, ACHIEVEMENT_BONUSES };
