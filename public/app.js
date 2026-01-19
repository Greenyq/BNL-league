const { useState, useEffect } = React;

// Race mapping - W3Champions API
const raceIcons = {
    0: '🎲', // Random
    1: '👑', // Human
    2: '⚔️', // Orc  
    4: '🌙', // Night Elf
    8: '💀', // Undead
};

const raceNames = {
    0: 'Random',
    1: 'Human',
    2: 'Orc',
    4: 'Night Elf',
    8: 'Undead',
};

const raceImages = {
    0: null, // Random
    1: '/images/human.jpg', // Alliance shield with swords
    2: '/images/orc.jpg', // Horde red symbol
    4: '/images/nightelf.jpg',
    8: '/images/undead.jpg', // Death Knight skulls and weapons
};

// Achievements (Достижения)
const achievements = {
    // Win Streaks (Серии побед)
    winStreak3: { icon: "🔥", name: "В огне", desc: "3 победы подряд", points: 30 },
    winStreak5: { icon: "🔥🔥", name: "Огненная серия", desc: "5 побед подряд", points: 50 },
    winStreak10: { icon: "🔥🔥🔥", name: "Доминатор", desc: "10 побед подряд", points: 100 },
    winStreak15: { icon: "👑", name: "Неудержимый", desc: "15 побед подряд", points: 150 },

    // Loss Streaks (Серии поражений)
    loseStreak3: { icon: "💪", name: "Не расстраивайся дави на газ", desc: "3 поражения подряд", points: 10 },
    loseStreak10: { icon: "🛡️", name: "Выживший", desc: "Продолжать играть после 10 поражений подряд", points: 25 },

    // MMR Challenges (MMR челленджи)
    giantSlayer: { icon: "⚔️", name: "И кто тут папа?", desc: "Победа над соперником с +50 MMR", points: 25 },
    titanSlayer: { icon: "⚡", name: "Убийца титанов", desc: "Победа над соперником с +100 MMR", points: 50 },
    davidVsGoliath: { icon: "🏹", name: "Давид против Голиафа", desc: "Победа над соперником с +200 MMR", points: 100 },

    // Total Wins (Всего побед)
    warrior: { icon: "⚔️", name: "Воин", desc: "50 побед всего", points: 30 },
    centurion: { icon: "💯", name: "Центурион", desc: "100 побед всего", points: 50 },
    centurionSupreme: { icon: "👑💯", name: "Верховный центурион", desc: "200 побед всего", points: 80 },
    noMercy: { icon: "😈", name: "Без пощады", desc: "50+ побед в этом сезоне", points: 40 },

    // Weekly/Activity (Недельная активность)
    gladiator: { icon: "🏛️", name: "Гладиатор", desc: "10+ побед на этой неделе", points: 20 },
    perfectWeek: { icon: "✨", name: "Идеальная неделя", desc: "20+ побед на этой неделе", points: 50 },

    // Points (Очки)
    goldRush: { icon: "💰", name: "Золотая лихорадка", desc: "1000+ очков", points: 30 },
    platinumRush: { icon: "💎", name: "Платиновая лихорадка", desc: "2000+ очков", points: 60 },

    // Special (Специальные)
    comeback: { icon: "↩️", name: "Возвращение", desc: "Победа после 3 поражений", points: 20 },
    persistent: { icon: "🔄", name: "Упорный", desc: "5 побед после серии из 5 поражений", points: 40 },
    veteran: { icon: "🎖️", name: "Ветеран", desc: "500+ игр всего", points: 35 },
    marathonRunner: { icon: "🏃", name: "Марафонец", desc: "100+ игр в этом сезоне", points: 30 },

    // MMR Milestones (MMR достижения)
    mmrMillionaire: { icon: "💵", name: "MMR Миллионер", desc: "Достигнуть 2000+ MMR", points: 50 },
    eliteWarrior: { icon: "👑", name: "Элитный воин", desc: "Достигнуть 2200+ MMR", points: 100 },

    // BNL Specific Achievements (Достижения БНЛ)
    bnlRobber: { icon: "🏴‍☠️", name: "Обокрал ПТС БНЛ", desc: "Победа над игроком БНЛ", points: 30 },
    bnlVictim: { icon: "😢", name: "Отдал ПТС БНЛ", desc: "Поражение от игрока БНЛ", points: -10 },
    bnlRivalry: { icon: "⚔️🎯", name: "Соперничество БНЛ", desc: "Сыграть 5+ матчей против игроков БНЛ", points: 25 },
    bnlDominator: { icon: "👑🏴‍☠️", name: "Доминатор БНЛ", desc: "Выиграть 10+ матчей против игроков БНЛ", points: 60 },
};

const API_BASE = '';

function App() {
    // Initialize activeTab from URL
    const getTabFromPath = () => {
        const path = window.location.pathname;
        const validTabs = ['home', 'players', 'teams', 'schedule', 'stats', 'streamers', 'profile', 'admin'];
        const tabFromPath = path.substring(1) || 'home'; // Remove leading slash
        return validTabs.includes(tabFromPath) ? tabFromPath : 'home';
    };

    const [activeTab, setActiveTab] = useState(getTabFromPath());
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Navigate to tab and update URL
    const navigateTo = (tab) => {
        setActiveTab(tab);
        const path = tab === 'home' ? '/' : `/${tab}`;
        window.history.pushState({ tab }, '', path);
    };

    // Handle browser back/forward buttons
    React.useEffect(() => {
        const handlePopState = (event) => {
            const tab = event.state?.tab || getTabFromPath();
            setActiveTab(tab);
        };

        window.addEventListener('popstate', handlePopState);

        // Set initial state
        window.history.replaceState({ tab: activeTab }, '', activeTab === 'home' ? '/' : `/${activeTab}`);

        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    
    // Admin states
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [sessionId, setSessionId] = useState(localStorage.getItem('adminSessionId'));

    // Player authentication states
    const [playerSessionId, setPlayerSessionId] = useState(localStorage.getItem('playerSessionId'));
    const [playerUser, setPlayerUser] = useState(null);
    const [showPlayerAuthModal, setShowPlayerAuthModal] = useState(false);

    // Data from backend
    const [teams, setTeams] = useState([]);
    const [allPlayers, setAllPlayers] = useState([]);
    const [teamMatches, setTeamMatches] = useState([]);
    const [portraits, setPortraits] = useState([]);

    const [schedule] = useState([
        { id: 1, team1: "Chinese Panda", team2: "Elite Warriors", date: "2025-12-01 18:00", status: "upcoming" },
        { id: 2, team1: "Chinese Panda", team2: "Elite Warriors", date: "2025-11-28 20:00", status: "live" }
    ]);

    useEffect(() => {
        loadPlayers();
        loadTeams();
        loadAllPlayers();
        loadTeamMatches();
        loadPortraits();
        if (sessionId) {
            verifySession();
        }
        if (playerSessionId) {
            verifyPlayerSession();
        }

        // Auto-refresh data every 5 minutes
        const refreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing data...');
            loadPlayers();
            loadTeams();
            loadAllPlayers();
            loadTeamMatches();
            loadPortraits();
        }, 5 * 60 * 1000); // 5 minutes

        // Cleanup on unmount
        return () => clearInterval(refreshInterval);
    }, []);

    const verifySession = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/admin/verify`, {
                headers: { 'x-session-id': sessionId }
            });
            const data = await response.json();
            setIsAdmin(data.isAuthenticated);
            if (!data.isAuthenticated) {
                localStorage.removeItem('adminSessionId');
                setSessionId(null);
            }
        } catch (error) {
            console.error('Session verification failed:', error);
            setIsAdmin(false);
        }
    };

    const verifyPlayerSession = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/players/auth/me`, {
                headers: { 'x-player-session-id': playerSessionId }
            });
            if (response.ok) {
                const data = await response.json();
                setPlayerUser(data.user);
            } else {
                localStorage.removeItem('playerSessionId');
                setPlayerSessionId(null);
                setPlayerUser(null);
            }
        } catch (error) {
            console.error('Player session verification failed:', error);
            setPlayerUser(null);
        }
    };

    const loadTeams = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/teams`);
            const data = await response.json();
            setTeams(data);
        } catch (error) {
            console.error('Error loading teams:', error);
        }
    };

    const loadAllPlayers = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/players`);
            const data = await response.json();
            setAllPlayers(data);
        } catch (error) {
            console.error('Error loading players:', error);
        }
    };

    const loadTeamMatches = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/team-matches`);
            const data = await response.json();
            setTeamMatches(data);
        } catch (error) {
            console.error('Error loading team matches:', error);
        }
    };

    const loadPortraits = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/portraits`);
            const data = await response.json();
            setPortraits(data);
        } catch (error) {
            console.error('Error loading portraits:', error);
        }
    };

    const loadPlayers = async () => {
        try {
            console.log('🔄 Loading players...');
            const loadStart = Date.now();

            // Fetch players with pre-calculated stats from backend
            const response = await fetch(`${API_BASE}/api/players/with-cache`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const cachedPlayers = await response.json();
            console.log(`✅ Loaded ${cachedPlayers.length} players in ${Date.now() - loadStart}ms`);

            const loadedPlayers = [];

            // Convert API response to player cards
            // Always load all races to enable race switcher, mainRace is used for default display
            cachedPlayers.forEach((player) => {
                const raceStats = player.raceStats || [];

                // Always load all races for race switcher functionality
                if (raceStats.length > 0) {
                    raceStats.forEach((raceStat) => {
                        const finalPlayer = {
                            id: `${player.id}_${raceStat.race}`,
                            name: player.name || player.battleTag.split('#')[0],
                            battleTag: player.battleTag,
                            race: raceStat.race,
                            mainRace: player.mainRace, // Keep mainRace for sorting/display logic
                            mmr: raceStat.mmr || player.currentMmr || 0,
                            points: raceStat.points || 0,
                            wins: raceStat.wins || 0,
                            losses: raceStat.losses || 0,
                            achievements: raceStat.achievements || [],
                            matchHistory: raceStat.matchHistory || [],
                            activityData: generateActivityData(player.battleTag),
                            teamId: player.teamId || null,
                            selectedPortraitId: player.selectedPortraitId || null,
                            discordTag: player.discordTag || null,
                        };
                        loadedPlayers.push(finalPlayer);
                    });
                } else {
                    // Fallback: no race stats, show with overall stats
                    const finalPlayer = {
                        id: player.id,
                        name: player.name || player.battleTag.split('#')[0],
                        battleTag: player.battleTag,
                        race: player.race || player.mainRace || 0,
                        mainRace: player.mainRace,
                        mmr: player.currentMmr || 0,
                        points: player.points || 0,
                        wins: player.wins || 0,
                        losses: player.losses || 0,
                        achievements: [],
                        matchHistory: player.matchHistory || [],
                        activityData: generateActivityData(player.battleTag),
                        teamId: player.teamId || null,
                        selectedPortraitId: player.selectedPortraitId || null,
                        discordTag: player.discordTag || null,
                    };
                    loadedPlayers.push(finalPlayer);
                }
            });

            console.log(`✅ Processed ${loadedPlayers.length} player cards in ${Date.now() - loadStart}ms`);
            setPlayers(loadedPlayers);
        } catch (error) {
            console.error('❌ Error loading players:', error);
            setError('Не удалось загрузить данные игроков');
        } finally {
            setLoading(false);
        }
    };

    // Process matches from API and calculate points
    // Returns array of profiles - one per race played
    // allBnlBattleTags is a Set for O(1) lookup performance
    const processMatches = (battleTag, matches, allBnlBattleTags = new Set()) => {
        const processStart = performance.now();

        if (!matches || matches.length === 0) {
            return [{
                race: 0,
                mmr: 0,
                wins: 0,
                losses: 0,
                points: 0,
                achievements: [],
                matchHistory: [],
                activityData: generateActivityData(battleTag)
            }];
        }

        // Performance: Backend now filters matches before sending, so minimal filtering needed here
        // But keep as fallback in case old cached data exists
        let recentMatches = matches;
        const cutoffDate = new Date('2025-11-27T00:00:00Z');

        // Only filter if we have old data (backend now does this)
        if (matches.length > 50) {
            const filterStart = performance.now();
            recentMatches = matches.filter(match => {
                const matchDate = new Date(match.startTime);
                return matchDate >= cutoffDate;
            });
            console.log(`    ⏱️ Filter matches took ${(performance.now() - filterStart).toFixed(2)}ms (${recentMatches.length}/${matches.length})`);
        }

        // Performance: Skip sorting if already sorted (backend should send sorted)
        // Only sort if first/last items suggest unsorted data
        if (recentMatches.length > 1) {
            const firstTime = new Date(recentMatches[0].startTime).getTime();
            const lastTime = new Date(recentMatches[recentMatches.length - 1].startTime).getTime();
            if (firstTime > lastTime) {
                // Only sort if not in order
                const sortStart = performance.now();
                recentMatches.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
                console.log(`    ⏱️ Sort matches took ${(performance.now() - sortStart).toFixed(2)}ms`);
            }
        }

        // Group matches by race
        const groupStart = performance.now();
        const matchesByRace = {};
        const mmrByRace = {};

        // Performance: Use for loop instead of forEach (faster)
        // Also eliminate redundant find() calls
        for (let i = 0; i < recentMatches.length; i++) {
            const match = recentMatches[i];

            // Filter only 1v1 games (gameMode === 1)
            if (match.gameMode !== 1) continue;

            // Validate match structure
            if (!match.teams || !Array.isArray(match.teams) || match.teams.length < 2) continue;

            // Find player's team - do this once
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

            // Initialize race data if not exists
            if (!matchesByRace[race]) {
                matchesByRace[race] = [];
            }

            matchesByRace[race].push(match);
            // Update MMR to latest match value (since matches are sorted chronologically)
            mmrByRace[race] = player.currentMmr || mmrByRace[race] || 0;
        }
        console.log(`    ⏱️ Group matches took ${(performance.now() - groupStart).toFixed(2)}ms`);

        // If no races found, return empty profile
        if (Object.keys(matchesByRace).length === 0) {
            return [{
                race: 0,
                mmr: 0,
                wins: 0,
                losses: 0,
                points: 0,
                achievements: [],
                matchHistory: [],
                activityData: generateActivityData(battleTag)
            }];
        }

        // Create profile for each race
        const profiles = [];
        const calculateStart = performance.now();

        for (const [race, raceMatches] of Object.entries(matchesByRace)) {
            const raceInt = parseInt(race);
            let wins = 0;
            let losses = 0;
            let totalPoints = 0;
            const matchHistory = [];

            // Process each match for this race
            raceMatches.forEach(match => {
                // Only count 1v1 matches (not 2v2 or other team formats)
                // In 1v1, each team should have exactly 1 player
                const team1Players = match.teams?.[0]?.players || [];
                const team2Players = match.teams?.[1]?.players || [];

                if (team1Players.length !== 1 || team2Players.length !== 1) {
                    console.log(`Skipping non-1v1 match: ${team1Players.length}v${team2Players.length}`);
                    return; // Skip non-1v1 matches
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

                // Calculate MMR difference
                const playerMMR = player.oldMmr || player.currentMmr || 1500;
                const opponentMMR = opponent.oldMmr || opponent.currentMmr || 1500;
                const mmrDiff = opponentMMR - playerMMR;

                // Check if opponent is a BNL player (using Set.has() for O(1) performance)
                const isBnlMatch = opponent.battleTag ? allBnlBattleTags.has(opponent.battleTag) : false;

                // Points calculation based on MMR difference
                let matchPoints = 0;

                if (won) {
                    wins++;
                    matchHistory.push({ result: 'win', mmrDiff, playerMMR, opponentMMR, isBnlMatch, opponentTag: opponent.battleTag });

                    // Victory points based on opponent MMR
                    if (mmrDiff >= 20) {
                        // Win against stronger opponent: +70 points
                        matchPoints = 70;
                    } else if (mmrDiff >= -19) {
                        // Win against equal opponent: +50 points
                        matchPoints = 50;
                    } else {
                        // Win against weaker opponent: less points
                        matchPoints = 30;
                    }
                } else {
                    losses++;
                    matchHistory.push({ result: 'loss', mmrDiff, playerMMR, opponentMMR, isBnlMatch, opponentTag: opponent.battleTag });

                    // Loss points (negative) based on opponent MMR
                    if (mmrDiff <= -20) {
                        // Loss to weaker opponent: -70 points
                        matchPoints = -70;
                    } else if (mmrDiff >= -19 && mmrDiff <= 19) {
                        // Loss to equal opponent: -50 points
                        matchPoints = -50;
                    } else {
                        // Loss to stronger opponent: less penalty
                        matchPoints = -30;
                    }
                }

                totalPoints += matchPoints;
            });

            // Determine achievements for this race
            const achs = determineAchievements(wins, losses, totalPoints, raceMatches.length, matchHistory, [], mmrByRace[race]);

            // Add achievement bonuses
            achs.forEach(achKey => {
                if (achievements[achKey]) {
                    totalPoints += achievements[achKey].points;
                } else {
                    console.error(`❌ Achievement '${achKey}' not found in achievements object`);
                }
            });

            // Performance: Skip verbose logging for each race profile (too slow with 50+ players)
            // console.log(`Profile for ${battleTag} - ${raceNames[raceInt]}:`, { wins, losses, points: totalPoints, mmr: mmrByRace[race] });

            profiles.push({
                race: raceInt,
                mmr: mmrByRace[race],
                wins: wins,
                losses: losses,
                points: totalPoints,
                achievements: achs,
                matchHistory: matchHistory.reverse().slice(0, 20), // Last 20 matches, most recent first
                activityData: generateActivityData(battleTag)
            });
        }
        console.log(`    ⏱️ Calculate points took ${(performance.now() - calculateStart).toFixed(2)}ms for ${Object.keys(matchesByRace).length} races`);

        // Sort profiles by race ID to ensure consistent ordering (0, 1, 2, 4, 8)
        profiles.sort((a, b) => a.race - b.race);

        console.log(`  ✅ processMatches(${battleTag}) took ${(performance.now() - processStart).toFixed(2)}ms`);
        return profiles;
    };

    const determineAchievements = (wins, losses, points, totalGames, matchHistory = [], previousAchievements = [], currentMmr = 0) => {
        const achs = [];

        // Validate inputs
        const validWins = Math.max(0, parseInt(wins) || 0);
        const validLosses = Math.max(0, parseInt(losses) || 0);
        const validPoints = parseInt(points) || 0;
        const validTotalGames = Math.max(0, parseInt(totalGames) || 0);
        const validCurrentMmr = Math.max(0, parseInt(currentMmr) || 0);
        const validMatchHistory = Array.isArray(matchHistory) ? matchHistory : [];
        const validPreviousAchievements = Array.isArray(previousAchievements) ? previousAchievements : [];

        // Win milestones
        if (validWins >= 200) achs.push('centurionSupreme');
        else if (validWins >= 100) achs.push('centurion');
        else if (validWins >= 50) achs.push('warrior');

        // Weekly/Season wins
        if (validWins >= 20) achs.push('perfectWeek');
        else if (validWins >= 10) achs.push('gladiator');
        if (validWins >= 50) achs.push('noMercy');

        // Games played
        if (validTotalGames >= 500) achs.push('veteran');
        if (validTotalGames >= 100) achs.push('marathonRunner');

        // Points milestones
        if (validPoints >= 2000) achs.push('platinumRush');
        else if (validPoints >= 1000) achs.push('goldRush');

        // MMR milestones
        if (validCurrentMmr >= 2200) achs.push('eliteWarrior');
        else if (validCurrentMmr >= 2000) achs.push('mmrMillionaire');

        // Analyze streaks (check LAST 20 matches, most recent first)
        // matchHistory is in chronological order (oldest first), so we need to reverse it
        const recentMatches = [...validMatchHistory].reverse().slice(0, 20);

        // Check for win streaks
        let currentWinStreak = 0;
        let maxWinStreak = 0;
        for (const match of recentMatches) {
            if (match.result === 'win') {
                currentWinStreak++;
                maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
            } else {
                currentWinStreak = 0;
            }
        }

        if (maxWinStreak >= 15) achs.push('winStreak15');
        else if (maxWinStreak >= 10) achs.push('winStreak10');
        else if (maxWinStreak >= 5) achs.push('winStreak5');
        else if (maxWinStreak >= 3) achs.push('winStreak3');

        // Check for loss streaks
        let currentLossStreak = 0;
        let maxLossStreak = 0;
        for (const match of recentMatches) {
            if (match.result === 'loss') {
                currentLossStreak++;
                maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
            } else {
                currentLossStreak = 0;
            }
        }

        if (maxLossStreak >= 10) achs.push('loseStreak10');
        else if (maxLossStreak >= 3) achs.push('loseStreak3');

        // Check MMR difference challenges
        let hasGiantSlayer = false;
        let hasTitanSlayer = false;
        let hasDavidVsGoliath = false;
        for (const match of recentMatches) {
            if (match.result === 'win') {
                if (match.mmrDiff >= 200) hasDavidVsGoliath = true;
                if (match.mmrDiff >= 100) hasTitanSlayer = true;
                if (match.mmrDiff >= 50) hasGiantSlayer = true;
            }
        }
        if (hasDavidVsGoliath) achs.push('davidVsGoliath');
        if (hasTitanSlayer) achs.push('titanSlayer');
        if (hasGiantSlayer) achs.push('giantSlayer');

        // Check for comeback (win after 3 losses)
        for (let i = 0; i < recentMatches.length - 3; i++) {
            if (recentMatches[i].result === 'win' &&
                recentMatches[i + 1].result === 'loss' &&
                recentMatches[i + 2].result === 'loss' &&
                recentMatches[i + 3].result === 'loss') {
                achs.push('comeback');
                break;
            }
        }

        // Check for persistent (5 wins after 5 loss streak)
        for (let i = 0; i < recentMatches.length - 9; i++) {
            // Check if we have 5 wins followed by 5 losses
            const fiveWins = recentMatches.slice(i, i + 5).every(m => m.result === 'win');
            const fiveLosses = recentMatches.slice(i + 5, i + 10).every(m => m.result === 'loss');
            if (fiveWins && fiveLosses) {
                achs.push('persistent');
                break;
            }
        }

        // BNL specific achievements
        const bnlMatches = validMatchHistory.filter(m => m && m.isBnlMatch);
        const bnlWins = bnlMatches.filter(m => m && m.result === 'win').length;
        const bnlLosses = bnlMatches.filter(m => m && m.result === 'loss').length;

        if (bnlWins >= 10) achs.push('bnlDominator');
        if (bnlMatches.length >= 5) achs.push('bnlRivalry');
        if (bnlWins > 0) achs.push('bnlRobber');
        if (bnlLosses > 0) achs.push('bnlVictim');

        // Merge with previously earned achievements (once earned, never lost)
        const allAchievements = new Set([...achs, ...validPreviousAchievements]);

        // Validate all achievements exist before returning
        const validatedAchievements = Array.from(allAchievements).filter(achKey => {
            if (!achievements[achKey]) {
                console.warn(`⚠️ Achievement '${achKey}' not found in achievements object`);
                return false;
            }
            return true;
        });

        // Performance: Skip verbose achievement logging (too slow with 50+ achievements)
        // console.log(`🏆 Achievement check: wins=${validWins}, losses=${validLosses}, points=${validPoints}, totalGames=${validTotalGames}, MMR=${validCurrentMmr}, achievements=${validatedAchievements.join(', ') || 'none'}`);

        return validatedAchievements;
    };

    // Performance: Cache activity data instead of generating random each time
    const activityDataCache = {};
    const generateActivityData = (battleTag) => {
        if (activityDataCache[battleTag]) {
            return activityDataCache[battleTag];
        }
        // Generate once and cache it
        const data = Array(7).fill(0).map(() =>
            Array(20).fill(0).map(() => Math.random() > 0.4)
        );
        activityDataCache[battleTag] = data;
        return data;
    };

    if (loading) {
        return (
            <div>
                <Header activeTab={activeTab} />
                <Nav
                    activeTab={activeTab}
                    setActiveTab={navigateTo}
                    isAdmin={isAdmin}
                    setShowLoginModal={setShowLoginModal}
                />
                <div className="app">
                    <div className="loading">⚔️ Загрузка матчей с W3Champions...<br />Подсчет очков с 27.11.2025...</div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Header activeTab={activeTab} />
            <Nav
                activeTab={activeTab}
                setActiveTab={navigateTo}
                isAdmin={isAdmin}
                setShowLoginModal={setShowLoginModal}
                playerUser={playerUser}
                setShowPlayerAuthModal={setShowPlayerAuthModal}
            />
            <div className="app">
                {activeTab === 'home' && <Rules />}
                {activeTab === 'players' && <Players players={players} />}
                {activeTab === 'teams' && <Teams teams={teams} players={players} allPlayers={allPlayers} teamMatches={teamMatches} />}
                {activeTab === 'schedule' && (
                    <Schedule
                        schedule={schedule}
                        teams={teams}
                        allPlayers={allPlayers}
                        teamMatches={teamMatches}
                        portraits={portraits}
                        playerUser={playerUser}
                        playerSessionId={playerSessionId}
                        onUpdate={async () => {
                            await loadAllPlayers();
                            await loadTeamMatches();
                        }}
                    />
                )}
                {activeTab === 'streamers' && <Streamers />}
                {activeTab === 'profile' && playerUser && (
                    <PlayerProfile
                        playerUser={playerUser}
                        playerSessionId={playerSessionId}
                        allPlayers={players}
                        teams={teams}
                        teamMatches={teamMatches}
                        onUpdate={async () => {
                            await verifyPlayerSession();
                            await loadAllPlayers(); // Reload database players
                            await loadPlayers(); // Reload players to get fresh data with portraits
                            await loadTeamMatches(); // Reload matches
                        }}
                        onLogout={() => {
                            localStorage.removeItem('playerSessionId');
                            setPlayerSessionId(null);
                            setPlayerUser(null);
                            navigateTo('home');
                        }}
                    />
                )}
                {activeTab === 'admin' && isAdmin && (
                    <AdminPanel
                        teams={teams}
                        allPlayers={allPlayers}
                        teamMatches={teamMatches}
                        sessionId={sessionId}
                        onUpdate={() => {
                            loadTeams();
                            loadAllPlayers();
                            loadTeamMatches();
                        }}
                        onLogout={() => {
                            localStorage.removeItem('adminSessionId');
                            setSessionId(null);
                            setIsAdmin(false);
                            navigateTo('home');
                        }}
                    />
                )}
            </div>
            {showLoginModal && (
                <LoginModal
                    onClose={() => {
                        setShowLoginModal(false);
                    }}
                    onSuccess={(newSessionId) => {
                        setSessionId(newSessionId);
                        setIsAdmin(true);
                        localStorage.setItem('adminSessionId', newSessionId);
                        setShowLoginModal(false);
                        navigateTo('admin');
                    }}
                />
            )}
            {showPlayerAuthModal && (
                <PlayerAuthModal
                    onClose={() => {
                        setShowPlayerAuthModal(false);
                    }}
                    onSuccess={(newSessionId, user) => {
                        setPlayerSessionId(newSessionId);
                        setPlayerUser(user);
                        setShowPlayerAuthModal(false);
                        navigateTo('profile');
                    }}
                />
            )}
        </div>
    );
}

function Header({ activeTab }) {
    const [bannerLoaded, setBannerLoaded] = React.useState(false);

    // Only show banner on home page
    if (activeTab !== 'home') {
        return null;
    }

    return (
        <div className="header">
            <div className="header-content">
                {!bannerLoaded && (
                    <div className="skeleton skeleton-banner" style={{ marginBottom: 0 }}></div>
                )}
                <img
                    src="/images/banner.png"
                    alt="Welcome to BNL - Warcraft Breaking New Limits"
                    style={{
                        width: '100%',
                        height: '400px',
                        display: bannerLoaded ? 'block' : 'none',
                        objectFit: 'cover',
                        borderRadius: '15px',
                        boxShadow: '0 10px 40px rgba(201, 169, 97, 0.3)',
                        animation: 'fadeIn 0.5s ease'
                    }}
                    onLoad={() => setBannerLoaded(true)}
                    onError={(e) => {
                        // Fallback to text if image not found
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'block';
                        setBannerLoaded(true);
                    }}
                />
                <div style={{ display: 'none' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #1a3a52 0%, #0f2333 100%)',
                        padding: '60px 40px',
                        borderRadius: '15px',
                        textAlign: 'center'
                    }}>
                        <h1 style={{
                            fontSize: '3.5em',
                            fontWeight: '900',
                            color: '#00e5ff',
                            textShadow: '0 0 20px rgba(0, 229, 255, 0.8)',
                            marginBottom: '15px',
                            letterSpacing: '2px'
                        }}>WELCOME TO BNL</h1>
                        <h2 style={{
                            fontSize: '2.2em',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #c9a961 0%, #f4e4b8 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginTop: '10px'
                        }}>Warcraft Breaking New Limits</h2>
                        <div style={{ color: '#888', marginTop: '20px', fontSize: '1.2em' }}>📅 Season 23 • Starting Nov 27, 2025</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Nav({ activeTab, setActiveTab, isAdmin, setShowLoginModal, playerUser, setShowPlayerAuthModal }) {
    return (
        <div className="nav">
            <div className="nav-container">
                <button className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>🏠 Главная</button>
                <button className={`nav-btn ${activeTab === 'players' ? 'active' : ''}`} onClick={() => setActiveTab('players')}>Игроки</button>
                <button className={`nav-btn ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>Команды</button>
                <button className={`nav-btn ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Расписание</button>
                <button className={`nav-btn ${activeTab === 'streamers' ? 'active' : ''}`} onClick={() => setActiveTab('streamers')}>📺 Стримеры</button>
                {isAdmin ? (
                    <button className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>⚙️ Админка</button>
                ) : playerUser ? (
                    <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>👤 {playerUser.username}</button>
                ) : (
                    <button className="nav-btn" onClick={() => setShowPlayerAuthModal(true)}>🔐 Вход</button>
                )}
            </div>
        </div>
    );
}

function Rules() {
    return (
        <div>
            <h2 style={{ fontSize: '2.5em', marginBottom: '30px', color: '#c9a961', textAlign: 'center' }}>
                📜 Правила Breaking New Limits
            </h2>

            <div style={{
                maxWidth: '900px',
                margin: '0 auto',
                background: '#1a1a1a',
                padding: '40px',
                borderRadius: '20px',
                border: '2px solid #c9a961'
            }}>
                <div style={{ marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '1.8em', color: '#c9a961', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>⚔️</span> Этап 1: Ладдерные игры
                    </h3>
                    <div style={{ fontSize: '1.1em', lineHeight: '1.8', color: '#e0e0e0' }}>
                        <p style={{ marginBottom: '15px' }}>
                            На первом этапе игроки играют в ладдер на W3Champions и зарабатывают очки:
                        </p>
                        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
                            <li style={{ marginBottom: '10px' }}>
                                <strong style={{ color: '#4caf50' }}>+70 очков</strong> — победа над сильным соперником (разница MMR +20 и выше)
                            </li>
                            <li style={{ marginBottom: '10px' }}>
                                <strong style={{ color: '#4caf50' }}>+50 очков</strong> — победа над равным соперником (разница MMR от -19 до +19)
                            </li>
                            <li style={{ marginBottom: '10px' }}>
                                <strong style={{ color: '#f44336' }}>-50 очков</strong> — поражение от равного соперника
                            </li>
                            <li style={{ marginBottom: '10px' }}>
                                <strong style={{ color: '#f44336' }}>-70 очков</strong> — поражение от слабого соперника (разница MMR -20 и ниже)
                            </li>
                        </ul>

                        <div style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '10px',
                            marginTop: '20px',
                            marginBottom: '20px'
                        }}>
                            <h4 style={{ fontSize: '1.3em', color: '#c9a961', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>🏅</span> Ачивки — дополнительные очки
                            </h4>
                            <p style={{ color: '#e0e0e0', marginBottom: '15px' }}>
                                Выполняя особые достижения, вы получаете бонусные очки, которые добавляются к вашему счету:
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.1em', marginBottom: '5px' }}>
                                        🔥 <strong>On Fire</strong> — <span style={{ color: '#4caf50' }}>+30 очков</span>
                                    </div>
                                    <div style={{ fontSize: '0.9em', color: '#888' }}>3 победы подряд</div>
                                </div>
                                <div style={{ padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.1em', marginBottom: '5px' }}>
                                        🔥🔥 <strong>Hot Streak</strong> — <span style={{ color: '#4caf50' }}>+50 очков</span>
                                    </div>
                                    <div style={{ fontSize: '0.9em', color: '#888' }}>5 побед подряд</div>
                                </div>
                                <div style={{ padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.1em', marginBottom: '5px' }}>
                                        ⚔️ <strong>И кто тут папа?</strong> — <span style={{ color: '#4caf50' }}>+25 очков</span>
                                    </div>
                                    <div style={{ fontSize: '0.9em', color: '#888' }}>Победа над игроком с +50 MMR</div>
                                </div>
                                <div style={{ padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.1em', marginBottom: '5px' }}>
                                        💪 <strong>Не расстраивайся</strong> — <span style={{ color: '#4caf50' }}>+10 очков</span>
                                    </div>
                                    <div style={{ fontSize: '0.9em', color: '#888' }}>3 поражения подряд (не сдавайся!)</div>
                                </div>
                                <div style={{ padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.1em', marginBottom: '5px' }}>
                                        💯 <strong>Centurion</strong> — <span style={{ color: '#4caf50' }}>+50 очков</span>
                                    </div>
                                    <div style={{ fontSize: '0.9em', color: '#888' }}>100 побед за все время</div>
                                </div>
                                <div style={{ padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.1em', marginBottom: '5px' }}>
                                        🏛️ <strong>Gladiator</strong> — <span style={{ color: '#4caf50' }}>+20 очков</span>
                                    </div>
                                    <div style={{ fontSize: '0.9em', color: '#888' }}>10+ побед на этой неделе</div>
                                </div>
                                <div style={{ padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.1em', marginBottom: '5px' }}>
                                        💰 <strong>Gold Rush</strong> — <span style={{ color: '#4caf50' }}>+30 очков</span>
                                    </div>
                                    <div style={{ fontSize: '0.9em', color: '#888' }}>Достигли 1000+ очков</div>
                                </div>
                                <div style={{ padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.1em', marginBottom: '5px' }}>
                                        ↩️ <strong>Comeback</strong> — <span style={{ color: '#4caf50' }}>+20 очков</span>
                                    </div>
                                    <div style={{ fontSize: '0.9em', color: '#888' }}>Победа после 3 поражений</div>
                                </div>
                                <div style={{ padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.1em', marginBottom: '5px' }}>
                                        🎖️ <strong>Veteran</strong> — <span style={{ color: '#4caf50' }}>+35 очков</span>
                                    </div>
                                    <div style={{ fontSize: '0.9em', color: '#888' }}>500+ игр за все время</div>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.9em', color: '#888', marginTop: '15px', fontStyle: 'italic' }}>
                                💡 Ачивки могут быть выполнены несколько раз, каждый раз давая бонусные очки!
                            </p>
                        </div>

                        <div style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '10px',
                            marginTop: '20px',
                            border: '2px solid #c9a961'
                        }}>
                            <h4 style={{ fontSize: '1.3em', color: '#c9a961', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>🖼️</span> Портреты — награды за очки
                            </h4>
                            <p style={{ color: '#e0e0e0', lineHeight: '1.6', marginBottom: '15px' }}>
                                По мере накопления очков вы разблокируете уникальные портреты для своей расы!
                                Каждый портрет требует определенное количество очков для разблокировки:
                            </p>
                            <ul style={{ marginLeft: '20px', marginBottom: '15px', color: '#e0e0e0' }}>
                                <li style={{ marginBottom: '10px' }}>
                                    Портреты доступны только для вашей расы (Human, Orc, Night Elf, Undead, Random)
                                </li>
                                <li style={{ marginBottom: '10px' }}>
                                    Каждый портрет требует определенное количество очков (от 0 до 1000+)
                                </li>
                                <li style={{ marginBottom: '10px' }}>
                                    Выберите портрет в своем профиле после привязки BattleTag
                                </li>
                                <li style={{ marginBottom: '10px' }}>
                                    Портрет отображается на вашей карточке игрока
                                </li>
                            </ul>
                            <p style={{ fontSize: '0.9em', color: '#c9a961', fontStyle: 'italic', marginTop: '15px' }}>
                                🎨 Собирайте очки, чтобы открыть все портреты вашей расы!
                            </p>
                        </div>
                        <div style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '10px',
                            border: '2px solid #c9a961',
                            marginTop: '20px'
                        }}>
                            <p style={{ fontSize: '1.2em', fontWeight: '700', color: '#c9a961', marginBottom: '10px' }}>
                                🏆 Условие перехода во второй этап:
                            </p>
                            <p style={{ fontSize: '1.3em', fontWeight: '800', color: '#4caf50' }}>
                                Набрать 500 очков
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '1.8em', color: '#c9a961', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>👥</span> Этап 2: Командный этап
                    </h3>
                    <div style={{ fontSize: '1.1em', lineHeight: '1.8', color: '#e0e0e0' }}>
                        <p style={{ marginBottom: '15px' }}>
                            Игроки, набравшие 500 очков, автоматически попадают во второй этап.
                            Здесь формируются команды с капитанами и тренерами:
                        </p>
                        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
                            <li style={{ marginBottom: '10px' }}>
                                <strong style={{ color: '#c9a961' }}>Капитан</strong> — координирует коммуникацию между командами и организует матчи
                            </li>
                            <li style={{ marginBottom: '10px' }}>
                                <strong style={{ color: '#c9a961' }}>Тренер</strong> — помогает игрокам с советами и анализом игры
                            </li>
                        </ul>
                        <p style={{ marginBottom: '15px' }}>
                            В течение месяца все игроки из команды А должны сыграть с игроками из команды Б.
                            Команда, набравшая максимальные очки, побеждает.
                        </p>
                        <div style={{
                            background: '#2a2a2a',
                            padding: '15px',
                            borderRadius: '10px',
                            marginTop: '15px'
                        }}>
                            <p style={{ fontSize: '1.1em', color: '#888' }}>
                                💡 Очки со второго этапа влияют на преимущества в финале
                            </p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 style={{ fontSize: '1.8em', color: '#c9a961', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>🏆</span> Этап 3: Супер Финал
                    </h3>
                    <div style={{ fontSize: '1.1em', lineHeight: '1.8', color: '#e0e0e0' }}>
                        <p style={{ marginBottom: '15px' }}>
                            После второго этапа лучшие 2 игрока из каждой команды попадают в супер финал.
                        </p>
                        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
                            <li style={{ marginBottom: '10px' }}>
                                Команда-победитель второго этапа получает право первыми банить и выбирать карту для первой игры
                            </li>
                            <li style={{ marginBottom: '10px' }}>
                                Финал проходит в формате <strong style={{ color: '#c9a961' }}>Best of 3 (BO3)</strong>
                            </li>
                            <li style={{ marginBottom: '10px' }}>
                                Победитель становится чемпионом BNL сезона!
                            </li>
                        </ul>
                        <div style={{
                            background: 'linear-gradient(135deg, #c9a961 0%, #8b7355 100%)',
                            padding: '20px',
                            borderRadius: '10px',
                            marginTop: '20px',
                            textAlign: 'center'
                        }}>
                            <p style={{ fontSize: '1.4em', fontWeight: '800', color: '#000' }}>
                                ⚔️ Да начнется битва! ⚔️
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Players({ players }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [selectedRaces, setSelectedRaces] = useState({});
    const [portraits, setPortraits] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('premier'); // 'premier' or 'league1'

    // Load portraits
    React.useEffect(() => {
        const fetchPortraits = async () => {
            try {
                const response = await fetch(`${API_BASE}/api/portraits`);
                const data = await response.json();
                setPortraits(data);
            } catch (error) {
                console.error('Error fetching portraits:', error);
            }
        };
        fetchPortraits();
    }, []);

    // Group players by battleTag and find best race for each
    const groupedPlayers = React.useMemo(() => {
        const groups = {};

        players.forEach(player => {
            if (!groups[player.battleTag]) {
                groups[player.battleTag] = [];
            }
            groups[player.battleTag].push(player);
        });

        // For each battleTag, select mainRace profile or best by points
        return Object.entries(groups).map(([battleTag, raceProfiles]) => {
            // Sort by points descending
            const sorted = raceProfiles.sort((a, b) => (b.points || 0) - (a.points || 0));

            // Use mainRace profile if set, otherwise use the one with most points
            const mainRace = sorted[0]?.mainRace;
            let bestProfile = sorted[0];
            if (mainRace !== undefined && mainRace !== null) {
                const mainRaceProfile = sorted.find(p => p.race === mainRace);
                if (mainRaceProfile) {
                    bestProfile = mainRaceProfile;
                }
            }

            return {
                battleTag,
                profiles: sorted,
                bestProfile: bestProfile
            };
        });
    }, [players]);

    // Create Map for O(1) lookup of groupedPlayers by battleTag
    const groupedPlayersMap = React.useMemo(() => {
        const map = new Map();
        groupedPlayers.forEach(group => {
            map.set(group.battleTag, group);
        });
        return map;
    }, [groupedPlayers]);

    // Sort by best profile points (descending)
    const sortedPlayers = React.useMemo(() => {
        return [...groupedPlayers].sort((a, b) =>
            (b.bestProfile.points || 0) - (a.bestProfile.points || 0)
        );
    }, [groupedPlayers]);

    // Split players into two leagues based on MMR
    const premierLeague = React.useMemo(() => {
        return sortedPlayers.filter(group => (group.bestProfile.mmr || 0) >= 1700);
    }, [sortedPlayers]);

    const league1 = React.useMemo(() => {
        return sortedPlayers.filter(group => (group.bestProfile.mmr || 0) < 1700);
    }, [sortedPlayers]);

    const toggleRace = React.useCallback((battleTag) => {
        setSelectedRaces(prev => {
            const currentIndex = prev[battleTag] || 0;
            const group = groupedPlayersMap.get(battleTag);
            if (!group) return prev;
            const nextIndex = (currentIndex + 1) % group.profiles.length;
            return { ...prev, [battleTag]: nextIndex };
        });
    }, [groupedPlayersMap]);

    const handleSelectPlayer = React.useCallback((profile) => {
        setSelectedPlayer(profile);
    }, []);

    const renderPlayers = (leaguePlayers) => {
        if (leaguePlayers.length === 0) {
            return (
                <div style={{ textAlign: 'center', color: '#888', fontSize: '1.1em', padding: '40px' }}>
                    Нет игроков в этой лиге
                </div>
            );
        }

        return (
            <div className="players-grid">
                {leaguePlayers.map((group, index) => {
                    // Find index of mainRace profile or default to 0
                    let defaultIndex = 0;
                    const mainRace = group.profiles[0]?.mainRace;
                    if (mainRace !== undefined && mainRace !== null) {
                        const mainRaceIndex = group.profiles.findIndex(p => p.race === mainRace);
                        if (mainRaceIndex !== -1) {
                            defaultIndex = mainRaceIndex;
                        }
                    }

                    const selectedIndex = selectedRaces[group.battleTag] !== undefined
                        ? selectedRaces[group.battleTag]
                        : defaultIndex;
                    const displayedProfile = group.profiles[selectedIndex];
                    const hasMultipleRaces = group.profiles.length > 1;

                    return (
                        <MemoizedPlayerCard
                            key={group.battleTag}
                            player={displayedProfile}
                            rank={index + 1}
                            hasMultipleRaces={hasMultipleRaces}
                            portraits={portraits}
                            onToggleRace={() => toggleRace(group.battleTag)}
                            onClick={() => handleSelectPlayer(displayedProfile)}
                        />
                    );
                })}
            </div>
        );
    };

    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961', textAlign: 'center' }}>Профили игроков</h2>

            {/* League Toggle Tabs */}
            <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                marginBottom: '40px',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={() => setSelectedLeague('premier')}
                    style={{
                        padding: '12px 30px',
                        fontSize: '1.1em',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: selectedLeague === 'premier'
                            ? 'linear-gradient(135deg, #c9a961 0%, #8b7355 100%)'
                            : 'rgba(201, 169, 97, 0.2)',
                        color: selectedLeague === 'premier' ? '#000' : '#c9a961',
                        transition: 'all 0.3s ease',
                        boxShadow: selectedLeague === 'premier'
                            ? '0 4px 12px rgba(201, 169, 97, 0.4)'
                            : 'none'
                    }}
                    onMouseEnter={(e) => {
                        if (selectedLeague !== 'premier') {
                            e.target.style.background = 'rgba(201, 169, 97, 0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (selectedLeague !== 'premier') {
                            e.target.style.background = 'rgba(201, 169, 97, 0.2)';
                        }
                    }}
                >
                    👑 Премьер Лига
                </button>
                <button
                    onClick={() => setSelectedLeague('league1')}
                    style={{
                        padding: '12px 30px',
                        fontSize: '1.1em',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: selectedLeague === 'league1'
                            ? 'linear-gradient(135deg, #c9a961 0%, #8b7355 100%)'
                            : 'rgba(201, 169, 97, 0.2)',
                        color: selectedLeague === 'league1' ? '#000' : '#c9a961',
                        transition: 'all 0.3s ease',
                        boxShadow: selectedLeague === 'league1'
                            ? '0 4px 12px rgba(201, 169, 97, 0.4)'
                            : 'none'
                    }}
                    onMouseEnter={(e) => {
                        if (selectedLeague !== 'league1') {
                            e.target.style.background = 'rgba(201, 169, 97, 0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (selectedLeague !== 'league1') {
                            e.target.style.background = 'rgba(201, 169, 97, 0.2)';
                        }
                    }}
                >
                    ⚔️ Лига 1
                </button>
            </div>

            {/* Render selected league */}
            {selectedLeague === 'premier' ? renderPlayers(premierLeague) : renderPlayers(league1)}

            {selectedPlayer && (
                <PlayerDetailModal
                    player={selectedPlayer}
                    portraits={portraits}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
        </div>
    );
}

function PlayerCard({ player, rank, onClick, hasMultipleRaces, onToggleRace, portraits = [] }) {
    const raceImage = raceImages[player.race];

    // Create portrait Map for O(1) lookup
    const portraitsMap = React.useMemo(() => {
        const map = new Map();
        portraits.forEach(p => {
            map.set(p.id, p);
        });
        return map;
    }, [portraits]);

    // Find selected portrait if player has one
    const selectedPortrait = player.selectedPortraitId
        ? portraitsMap.get(player.selectedPortraitId)
        : null;

    // Use portrait image if available, otherwise use race image
    const avatarImage = selectedPortrait ? selectedPortrait.imageUrl : raceImage;

    const hasQualified = (player.points || 0) >= 500;

    const handleCardClick = (e) => {
        // Don't trigger onClick if clicking the race switcher
        if (!e.target.closest('.race-switcher')) {
            onClick(e);
        }
    };

    return (
        <div className="player-card" onClick={handleCardClick} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
            <div className="player-card-inner" style={{ paddingBottom: hasQualified ? '40px' : undefined }}>
                <div className="player-header">
                    <div className="player-title">
                        <div style={{ position: 'relative' }}>
                            <div className="player-avatar">
                                {avatarImage ? (
                                    <img src={avatarImage} alt={selectedPortrait ? selectedPortrait.name : (raceNames[player.race] || 'Race')} onError={(e) => {
                                        console.error(`Failed to load image for ${player.name}:`, avatarImage);
                                        e.target.style.display = 'none';
                                    }} />
                                ) : (
                                    <span>{raceIcons[player.race] || '🎲'}</span>
                                )}
                            </div>
                            {hasMultipleRaces && (
                                <button
                                    className="race-switcher"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleRace();
                                    }}
                                    style={{
                                        position: 'absolute',
                                        bottom: '-5px',
                                        right: '-5px',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #c9a961 0%, #8b7355 100%)',
                                        border: '2px solid #1a1a1a',
                                        color: '#000',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: '800',
                                        boxShadow: '0 2px 8px rgba(201, 169, 97, 0.6)',
                                        transition: 'all 0.2s',
                                        zIndex: 10
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.15)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(201, 169, 97, 0.8)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(201, 169, 97, 0.6)';
                                    }}
                                    title="Переключить расу"
                                >
                                    ⇄
                                </button>
                            )}
                        </div>
                        <div className="player-info">
                            <div className="player-name">
                                {player.name}
                                {player.race && player.race !== 0 && (
                                    <span style={{
                                        color: '#c9a961',
                                        marginLeft: '8px',
                                        fontSize: '0.85em',
                                        fontWeight: '600'
                                    }}>
                                        ({raceNames[player.race]})
                                    </span>
                                )}
                            </div>
                            <div className="battle-tag">{player.battleTag}</div>
                            {player.error && (
                                <div style={{ color: '#f44336', fontSize: '0.7em', marginTop: '5px' }}>
                                    ⚠️ Не удалось загрузить данные
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="rank-mmr">
                        <div className="rank-label">Rank</div>
                        <div className="rank-number">#{rank}</div>
                        <div className="rank-label" style={{ marginTop: '15px' }}>{raceNames[player.race] || 'Random'}</div>
                        <div className="mmr-display">{player.mmr} MMR</div>
                        {player.achievements && player.achievements.length > 0 && (
                            <div style={{
                                marginTop: '15px',
                                fontSize: '0.85em',
                                color: '#c9a961',
                                padding: '5px 10px',
                                borderRadius: '4px',
                                textAlign: 'center',
                                fontWeight: '700'
                            }}>
                                🏆 {player.achievements.length}
                            </div>
                        )}
                    </div>
                </div>


                {/* Always render achievements container with fixed min-height */}
                <div className="achievement-icons" style={{
                    display: 'flex',
                    gap: '8px',
                    padding: player.achievements && player.achievements.length > 0 ? '10px 15px' : '0',
                    flexWrap: 'wrap',
                    borderTop: player.achievements && player.achievements.length > 0 ? '1px solid rgba(201, 169, 97, 0.2)' : 'none',
                    borderBottom: player.achievements && player.achievements.length > 0 ? '1px solid rgba(201, 169, 97, 0.2)' : 'none',
                    margin: player.achievements && player.achievements.length > 0 ? '10px 0' : '0',
                    minHeight: '0',
                    position: 'relative',
                    alignItems: 'center'
                }}>
                    {player.achievements && player.achievements.map(achKey => {
                        const ach = achievements[achKey];
                        if (!ach) {
                            console.warn(`Achievement ${achKey} not found`);
                            return null;
                        }
                        return (
                            <div key={achKey} className="achievement-icon">
                                {ach.icon}
                                <div className="achievement-tooltip">
                                    <div style={{ fontWeight: '700' }}>{ach.name}</div>
                                    <div style={{ color: '#888', fontSize: '0.9em', marginTop: '3px' }}>{ach.desc}</div>
                                    <div style={{ color: '#4caf50', marginTop: '5px' }}>+{ach.points} pts</div>
                                </div>
                            </div>
                        );
                    })}

                    {player.achievements && player.achievements.length > 0 && (
                        <div style={{
                            marginLeft: 'auto',
                            display: 'flex',
                            gap: '8px'
                        }}>
                            {player.achievements.slice(-2).map(achKey => {
                                const ach = achievements[achKey];
                                if (!ach) return null;
                                return (
                                    <div key={`right-${achKey}`} className="achievement-icon">
                                        {ach.icon}
                                        <div className="achievement-tooltip">
                                            <div style={{ fontWeight: '700' }}>{ach.name}</div>
                                            <div style={{ color: '#888', fontSize: '0.9em', marginTop: '3px' }}>{ach.desc}</div>
                                            <div style={{ color: '#4caf50', marginTop: '5px' }}>+{ach.points} pts</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Match graph - ALWAYS show */}
                <div className="match-graph" style={{
                    minHeight: '80px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    position: 'relative'
                }}>
                    {player.matchHistory && player.matchHistory.length > 0 ? (
                        player.matchHistory.slice(0, 20).map((match, idx) => {
                            const result = typeof match === 'string' ? match : match.result;
                            const height = result === 'win' ? 70 : 40;
                            return <div key={idx} className={`match-bar ${result}`} style={{ height: `${height}px` }} />;
                        })
                    ) : (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#666',
                            fontSize: '0.8em',
                            textAlign: 'center'
                        }}>
                            No match history
                        </div>
                    )}
                </div>

                <div className="points-section">
                    <div className="points-value">{player.points || 0}</div>
                    <div className="points-label">⚔️ points</div>
                </div>

                <div className="win-loss-stats">
                    <div className="stat-box wins">
                        <div className="stat-icon">🗡️</div>
                        <div className="stat-value">{player.wins || 0}</div>
                        <div className="stat-label">Wins</div>
                    </div>
                    <div className="stat-box losses">
                        <div className="stat-icon">💀</div>
                        <div className="stat-value">{player.losses || 0}</div>
                        <div className="stat-label">Losses</div>
                    </div>
                </div>

                {player.discordTag && (
                    <div
                        className="discord-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(player.discordTag);
                            e.currentTarget.style.background = '#43B581';
                            setTimeout(() => {
                                e.currentTarget.style.background = '#5865F2';
                            }, 300);
                        }}
                        title="Нажмите, чтобы скопировать Discord тег"
                    >
                        <svg width="18" height="18" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0)">
                                <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white"/>
                            </g>
                            <defs>
                                <clipPath id="clip0">
                                    <rect width="71" height="55" fill="white"/>
                                </clipPath>
                            </defs>
                        </svg>
                        <span>{player.discordTag}</span>
                    </div>
                )}

                {hasQualified && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            right: '0',
                            background: 'linear-gradient(90deg, #f4e4b8 0%, #c9a961 50%, #f4e4b8 100%)',
                            color: '#1a1a1a',
                            padding: '8px 0',
                            fontSize: '0.75em',
                            fontWeight: '800',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            letterSpacing: '1.5px',
                            boxShadow: '0 -2px 10px rgba(201, 169, 97, 0.5)',
                            borderRadius: '0 0 12px 12px'
                        }}
                        title="Поздравляем! Вы прошли во второй тур! Администратор скоро назначит вам команду."
                    >
                        ✓ QUALIFIED
                    </div>
                )}
            </div>
        </div>
    );
}

// Memoize PlayerCard with custom comparison function
const MemoizedPlayerCard = React.memo(
    PlayerCard,
    (prevProps, nextProps) => {
        // Return true if props are equal (don't re-render), false if they differ (re-render)
        return (
            prevProps.player.battleTag === nextProps.player.battleTag &&
            prevProps.player.race === nextProps.player.race &&
            prevProps.player.selectedPortraitId === nextProps.player.selectedPortraitId &&
            prevProps.player.points === nextProps.player.points &&
            prevProps.player.wins === nextProps.player.wins &&
            prevProps.player.losses === nextProps.player.losses &&
            prevProps.rank === nextProps.rank &&
            prevProps.hasMultipleRaces === nextProps.hasMultipleRaces &&
            prevProps.onClick === nextProps.onClick &&
            prevProps.onToggleRace === nextProps.onToggleRace &&
            prevProps.portraits === nextProps.portraits
        );
    }
);

function Teams({ teams, players, allPlayers, teamMatches = [] }) {
    const [expandedTeam, setExpandedTeam] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [portraits, setPortraits] = useState([]);
    const [subTeamsTab, setSubTeamsTab] = useState('team-list');

    // Load portraits
    React.useEffect(() => {
        const fetchPortraits = async () => {
            try {
                const response = await fetch(`${API_BASE}/api/portraits`);
                const data = await response.json();
                setPortraits(data);
            } catch (error) {
                console.error('Error fetching portraits:', error);
            }
        };
        fetchPortraits();
    }, []);

    const getTeamPlayers = (teamId) => players.filter(p => p.teamId === teamId);

    const getTeamPointsFromMatches = (teamId) => {
        // Calculate total points from completed team matches with a winner
        const matches = (teamMatches || []).filter(m => {
            const matchTeam1Id = m.team1?.id || m.team1Id;
            const matchTeam2Id = m.team2?.id || m.team2Id;
            return (matchTeam1Id === teamId || matchTeam2Id === teamId) && m.status === 'completed' && m.winnerId;
        });

        return matches.reduce((sum, match) => {
            const winnerId = match.winnerId;
            // Determine which team the winner belongs to
            let winnerTeamId = null;

            if (winnerId === match.player1Id) {
                winnerTeamId = match.team1Id;
            } else if (winnerId === match.player2Id) {
                winnerTeamId = match.team2Id;
            }
            // Also handle old format where winnerId might be team ID (for backwards compatibility)
            else if (winnerId === match.team1Id) {
                winnerTeamId = match.team1Id;
            } else if (winnerId === match.team2Id) {
                winnerTeamId = match.team2Id;
            }

            // Add points only if we can determine the winner's team
            if (winnerTeamId === teamId) {
                return sum + (match.points || 0);
            }
            return sum;
        }, 0);
    };

    const getPlayerPointsFromSchedule = (playerId) => {
        // Calculate player's points from their 1v1 matches in teamMatches (Schedule tab)
        // Handle both modified IDs (with race suffix like "id_1") and original IDs
        const basePlayerId = playerId.includes('_') ? playerId.split('_')[0] : playerId;
        let totalPoints = 0;

        (teamMatches || []).forEach(match => {
            if (match.status === 'completed') {
                // Check if player participated (compare with base ID from database)
                if (match.player1Id === basePlayerId || match.player2Id === basePlayerId) {
                    let playerWon = false;

                    // Check if winnerId matches player ID directly (new format: player IDs)
                    if (match.winnerId === basePlayerId) {
                        playerWon = true;
                    }
                    // Check if winnerId matches team ID (old format from admin panel bug)
                    else if (match.winnerId === match.team1Id && match.player1Id === basePlayerId) {
                        playerWon = true;
                    }
                    else if (match.winnerId === match.team2Id && match.player2Id === basePlayerId) {
                        playerWon = true;
                    }

                    // Add or subtract points based on win/loss
                    if (playerWon) {
                        totalPoints += (match.points || 0);
                    }
                }
            }
        });

        return totalPoints;
    };

    const getTeamLeader = (teamId) => {
        const teamPlayers = getTeamPlayers(teamId);
        return teamPlayers.reduce((leader, player) => (player.points || 0) > (leader?.points || 0) ? player : leader, null);
    };

    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>Команды</h2>

            {/* Sub-tabs Navigation */}
            <div style={{
                display: 'flex',
                gap: '15px',
                marginBottom: '30px',
                borderBottom: '2px solid #333',
                paddingBottom: '10px'
            }}>
                <button
                    onClick={() => setSubTeamsTab('team-list')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '8px 8px 0 0',
                        background: subTeamsTab === 'team-list' ? '#c9a961' : '#2a2a2a',
                        color: subTeamsTab === 'team-list' ? '#000' : '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '1em',
                        transition: 'all 0.2s',
                        borderBottom: subTeamsTab === 'team-list' ? '3px solid #c9a961' : 'none'
                    }}
                >
                    📋 Список команд
                </button>
                <button
                    onClick={() => setSubTeamsTab('team-matches')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '8px 8px 0 0',
                        background: subTeamsTab === 'team-matches' ? '#c9a961' : '#2a2a2a',
                        color: subTeamsTab === 'team-matches' ? '#000' : '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '1em',
                        transition: 'all 0.2s',
                        borderBottom: subTeamsTab === 'team-matches' ? '3px solid #c9a961' : 'none'
                    }}
                >
                    ⚔️ Командные матчи
                </button>
                <button
                    onClick={() => setSubTeamsTab('team-stats')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '8px 8px 0 0',
                        background: subTeamsTab === 'team-stats' ? '#c9a961' : '#2a2a2a',
                        color: subTeamsTab === 'team-stats' ? '#000' : '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '1em',
                        transition: 'all 0.2s',
                        borderBottom: subTeamsTab === 'team-stats' ? '3px solid #c9a961' : 'none'
                    }}
                >
                    📊 Статистика
                </button>
            </div>

            {/* Team List Tab */}
            {subTeamsTab === 'team-list' && (
            <div>
            {teams.map(team => {
                const teamPlayers = getTeamPlayers(team.id);
                const leader = getTeamLeader(team.id);
                const captain = players.find(p => p.id === team.captainId) || allPlayers.find(p => p.id === team.captainId);
                const coaches = (team.coaches || []).map(coachId => {
                    return players.find(p => p.id === coachId) || allPlayers.find(p => p.id === coachId);
                }).filter(Boolean);
                const totalPoints = getTeamPointsFromMatches(team.id);

                return (
                    <div key={team.id} className="team-card" onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}>
                        <div className="team-header">
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {team.logo ? (
                                    <img
                                        src={team.logo}
                                        alt={team.name}
                                        className="team-emoji"
                                        style={{
                                            width: '102px',
                                            height: '102px',
                                            borderRadius: '10px',
                                            objectFit: 'cover'
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextElementSibling.style.display = 'inline';
                                        }}
                                    />
                                ) : null}
                                <span className="team-emoji" style={{ display: team.logo ? 'none' : 'inline' }}>{team.emoji}</span>
                                <div>
                                    <div className="team-name">{team.name}</div>
                                    <div style={{ color: '#888', fontSize: '1em' }}>{teamPlayers.length} игроков</div>
                                </div>
                            </div>
                            <div className="team-points">{totalPoints} pts</div>
                        </div>

                        <div className={`team-members-list ${expandedTeam === team.id ? 'expanded' : ''}`}>
                            {captain && (
                                <div className="member-section">
                                    <div className="section-title">👥 Капитан</div>
                                    <div
                                        className="member-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPlayer(captain);
                                        }}
                                        style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div>
                                            <span className="member-role-badge">CAPTAIN</span>
                                            <span style={{ fontWeight: '700', fontSize: '1.1em' }}>{captain.name}</span>
                                            <span style={{ color: '#888', marginLeft: '15px' }}>
                                                {raceNames[captain.race] || 'Random'} • {captain.mmr} MMR • {getPlayerPointsFromSchedule(captain.id)} pts
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {coaches.length > 0 && (
                                <div className="member-section">
                                    <div className="section-title">🎓 Тренеры</div>
                                    {coaches.map(coach => (
                                        <div
                                            key={coach.id}
                                            className="member-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPlayer(coach);
                                            }}
                                            style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div>
                                                <span className="member-role-badge">COACH</span>
                                                <span style={{ fontWeight: '700', fontSize: '1.1em' }}>{coach.name}</span>
                                                <span style={{ color: '#888', marginLeft: '15px' }}>
                                                    {raceNames[coach.race] || 'Random'} • {coach.mmr} MMR • {getPlayerPointsFromSchedule(coach.id)} pts
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="member-section">
                                <div className="section-title">⚔️ Игроки</div>
                                {teamPlayers
                                    .sort((a, b) => getPlayerPointsFromSchedule(b.id) - getPlayerPointsFromSchedule(a.id)) // Sort by Schedule points descending
                                    .map(player => (
                                    <div
                                        key={player.id}
                                        className="member-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPlayer(player);
                                        }}
                                        style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div>
                                            <span style={{ fontWeight: '700', fontSize: '1.1em' }}>{player.name}</span>
                                            <span style={{ color: '#888', marginLeft: '15px' }}>
                                                {raceNames[player.race] || 'Random'} • {player.mmr} MMR • {getPlayerPointsFromSchedule(player.id)} pts
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {leader && player.id === leader.id && (
                                                <span className="leader-badge">👑 LEADER</span>
                                            )}
                                            <div style={{ color: '#c9a961', fontWeight: '700', fontSize: '1.1em', minWidth: '80px', textAlign: 'right' }}>
                                                {getPlayerPointsFromSchedule(player.id)} pts
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
            {selectedPlayer && (
                <PlayerDetailModal
                    player={selectedPlayer}
                    portraits={portraits}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
            </div>
            )}

            {/* Team Matches Tab */}
            {subTeamsTab === 'team-matches' && (
                <TeamMatches teamMatches={teamMatches} teams={teams} allPlayers={allPlayers} />
            )}

            {/* Statistics Tab */}
            {subTeamsTab === 'team-stats' && (
                <Stats players={players} teams={teams} />
            )}
        </div>
    );
}

function Schedule({ schedule, teams, allPlayers, teamMatches, portraits = [], playerUser = null, playerSessionId = null, onUpdate = null }) {
    const [subTab, setSubTab] = React.useState('schedule');
    const [liveMatches, setLiveMatches] = React.useState([]);
    const [loadingLive, setLoadingLive] = React.useState(false);

    // Filters
    const [filterTeam, setFilterTeam] = React.useState('');
    const [filterPlayer, setFilterPlayer] = React.useState('');
    const [filterStatus, setFilterStatus] = React.useState(''); // '' = all, 'completed' = completed, 'pending' = pending

    // Modal states for match configuration
    const [showMatchModal, setShowMatchModal] = React.useState(false);
    const [selectedMatch, setSelectedMatch] = React.useState(null);
    const [matchDate, setMatchDate] = React.useState('');
    const [matchTime, setMatchTime] = React.useState('');
    const [matchFile, setMatchFile] = React.useState(null);
    const [uploadingFile, setUploadingFile] = React.useState(false);
    const [expandedMatchId, setExpandedMatchId] = React.useState(null);
    const [showTrophySelector, setShowTrophySelector] = React.useState(false);
    const [trophyMatchData, setTrophyMatchData] = React.useState(null);

    // Get current player data
    const currentPlayerData = React.useMemo(() => {
        if (!playerUser?.linkedBattleTag || !allPlayers) return null;
        const playerProfiles = allPlayers.filter(p => p.battleTag === playerUser.linkedBattleTag);
        if (playerProfiles.length === 0) return null;
        return playerProfiles.reduce((best, current) =>
            (current.points || 0) > (best.points || 0) ? current : best
        );
    }, [playerUser, allPlayers]);

    // Fetch live matches
    const fetchLiveMatches = async () => {
        setLoadingLive(true);
        try {
            const response = await fetch(`${API_BASE}/api/live-matches`);
            const data = await response.json();
            setLiveMatches(data.matches || []);
        } catch (error) {
            console.error('Error fetching live matches:', error);
            setLiveMatches([]);
        } finally {
            setLoadingLive(false);
        }
    };

    // Auto-refresh live matches every 30 seconds
    React.useEffect(() => {
        if (subTab === 'live') {
            fetchLiveMatches();
            const interval = setInterval(fetchLiveMatches, 30000);
            return () => clearInterval(interval);
        }
    }, [subTab]);

    // Generate unique color for each team based on ID
    const getTeamColor = (teamId) => {
        const colors = [
            { primary: '#4caf50', secondary: '#66bb6a' }, // Green
            { primary: '#2196f3', secondary: '#42a5f5' }, // Blue
            { primary: '#ff9800', secondary: '#ffb74d' }, // Orange
            { primary: '#9c27b0', secondary: '#ba68c8' }, // Purple
            { primary: '#f44336', secondary: '#ef5350' }, // Red
            { primary: '#00bcd4', secondary: '#26c6da' }, // Cyan
            { primary: '#ffeb3b', secondary: '#fff176' }, // Yellow
            { primary: '#e91e63', secondary: '#f06292' }, // Pink
        ];

        // Use team ID to consistently assign color
        const index = teams.findIndex(t => (t._id || t.id) === teamId);
        // Return default color if team not found
        if (index === -1) {
            return { primary: '#888888', secondary: '#aaaaaa' }; // Gray
        }
        return colors[index % colors.length];
    };

    // Calculate team points from completed matches
    const teamPoints = {};
    teams.forEach(team => {
        teamPoints[team._id || team.id] = 0;
    });

    teamMatches.filter(m => m.status === 'completed' && m.winnerId).forEach(match => {
        // Determine which team the winner belongs to
        let winnerTeamId = null;
        if (match.winnerId === match.player1Id) {
            winnerTeamId = match.team1Id;
        } else if (match.winnerId === match.player2Id) {
            winnerTeamId = match.team2Id;
        }

        // Add points only if we can determine the winner's team
        if (winnerTeamId && teamPoints[winnerTeamId] !== undefined) {
            teamPoints[winnerTeamId] += match.points || 0;
        }
    });
    
    // Group matches by teams
    const matchesByTeams = {};
    teamMatches.forEach(match => {
        const key = `${match.team1Id}-${match.team2Id}`;
        if (!matchesByTeams[key]) {
            matchesByTeams[key] = {
                team1: teams.find(t => (t._id || t.id) === match.team1Id),
                team2: teams.find(t => (t._id || t.id) === match.team2Id),
                team1Points: 0,
                team2Points: 0,
                matches: []
            };
        }
        matchesByTeams[key].matches.push(match);
        if (match.status === 'completed') {
            // Add points to winner only
            if (match.winnerId === match.player1Id) {
                matchesByTeams[key].team1Points += match.points || 0;
            } else if (match.winnerId === match.player2Id) {
                matchesByTeams[key].team2Points += match.points || 0;
            }
        }
    });
    
    const getPlayer = (playerId) => {
        if (!playerId) return null;
        // Convert to string for safe comparison
        const searchId = String(playerId);
        return allPlayers.find(p => {
            const pId = String(p.id || p._id);
            return pId === searchId;
        });
    };

    const getPlayerName = (playerId) => {
        const player = getPlayer(playerId);
        return player ? player.name : 'Unknown';
    };

    // Race icons for fallback (emoji)
    const raceIcons = {
        0: '🎲', // Random
        1: '🏰', // Human  
        2: '⚔️', // Orc
        4: '🌙', // Night Elf
        8: '💀'  // Undead
    };

    // Render single player card in bracket style (enlarged x2)
    const renderPlayerCard = (player, team, isWinner, isLeft, points = 0) => {
        const teamColor = getTeamColor(team?.id || team?._id);
        
        // Find selected portrait for player
        const selectedPortrait = player?.selectedPortraitId
            ? portraits.find(p => p.id === player.selectedPortraitId)
            : null;
        
        // Use portrait image if available, otherwise use race image from global raceImages
        const avatarImage = selectedPortrait ? selectedPortrait.imageUrl : raceImages[player?.race];
        
        return (
            <div style={{
                display: 'flex',
                flexDirection: isLeft ? 'row' : 'row-reverse',
                alignItems: 'stretch',
                width: '100%',
                maxWidth: '400px'
            }}>
                {/* Player portrait hexagon - enlarged */}
                <div style={{
                    width: '100px',
                    height: '115px',
                    background: isWinner ? `linear-gradient(135deg, ${teamColor.primary}, ${teamColor.secondary})` : '#2a2a2a',
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `3px solid ${isWinner ? '#c9a961' : '#444'}`,
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 2
                }}>
                    <div style={{
                        width: '88px',
                        height: '100px',
                        background: '#1a1a1a',
                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                    }}>
                        {avatarImage ? (
                            <img 
                                src={avatarImage} 
                                alt={player?.name || 'Player'} 
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover'
                                }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = `<span style="font-size: 2.5em">${raceIcons[player?.race] || '👤'}</span>`;
                                }}
                            />
                        ) : (
                            <span style={{ fontSize: '2.5em' }}>{raceIcons[player?.race] || '👤'}</span>
                        )}
                    </div>
                </div>
                
                {/* Player info card - enlarged */}
                <div style={{
                    flex: 1,
                    background: isWinner ? `linear-gradient(${isLeft ? '90deg' : '270deg'}, rgba(201, 169, 97, 0.2), #1a1a1a)` : '#1a1a1a',
                    border: `3px solid ${isWinner ? '#c9a961' : '#333'}`,
                    borderRadius: isLeft ? '0 12px 12px 0' : '12px 0 0 12px',
                    marginLeft: isLeft ? '-15px' : '0',
                    marginRight: isLeft ? '0' : '-15px',
                    padding: '12px 16px',
                    paddingLeft: isLeft ? '25px' : '16px',
                    paddingRight: isLeft ? '16px' : '25px',
                    paddingTop: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    position: 'relative',
                    minHeight: '90px'
                }}>
                    {/* Team logo overlaying the top border - CENTERED */}
                    <div style={{
                        position: 'absolute',
                        top: '-18px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: '#1a1a1a',
                        border: `2px solid ${isWinner ? '#c9a961' : teamColor.primary}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        zIndex: 3,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                    }}>
                        {team?.logo ? (
                            <img src={team.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '1.2em' }}>{team?.emoji}</span>
                        )}
                    </div>
                    
                    {/* Team name - centered */}
                    <div style={{
                        fontSize: '0.85em', 
                        color: teamColor.primary,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '6px',
                        textAlign: 'center'
                    }}>
                        {team?.name}
                    </div>
                    
                    {/* Player name - enlarged, centered */}
                    <div style={{
                        fontSize: '1.4em',
                        fontWeight: '700',
                        color: isWinner ? '#c9a961' : '#fff',
                        textAlign: 'center'
                    }}>
                        {player?.name || 'Unknown'}
                    </div>
                    
                    {/* Points for winner - enlarged, centered */}
                    {isWinner && parseInt(points) > 0 && (
                        <div style={{
                            fontSize: '1.1em',
                            color: '#4caf50',
                            fontWeight: '700',
                            textAlign: 'center',
                            marginTop: '8px',
                            padding: '4px 12px',
                            background: 'rgba(76, 175, 80, 0.15)',
                            borderRadius: '8px',
                            border: '1px solid #4caf50'
                        }}>
                            +{points} pts
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Render match bracket card - enlarged
    const renderMatchBracket = (match, team1, team2) => {
        const player1 = getPlayer(match.player1Id);
        const player2 = getPlayer(match.player2Id);
        const isCompleted = match.status === 'completed';
        const p1Won = isCompleted && match.winnerId === match.player1Id;
        const p2Won = isCompleted && match.winnerId === match.player2Id;
        const isHomePlayer = currentPlayerData && (match.player1Id === currentPlayerData.id || match.player2Id === currentPlayerData.id) && match.homePlayerId === currentPlayerData.id;

        return (
            <div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCompleted ? '30px' : '15px', // Smaller gap for pending
                    padding: isCompleted ? '25px' : '15px', // Smaller padding for pending
                    paddingTop: isCompleted ? '35px' : '25px', // Smaller top padding for pending
                    background: isCompleted ? 'rgba(201, 169, 97, 0.1)' : 'rgba(42, 42, 42, 0.5)',
                    borderRadius: '16px', // Increased from 12px
                    border: `3px solid ${isCompleted ? '#c9a961' : '#333'}`, // Swapped: completed=gold, pending=dark
                    marginBottom: '20px', // Increased from 15px
                    transform: isCompleted ? 'scale(1)' : 'scale(0.95)', // Smaller scale for pending
                    transformOrigin: 'center'
                }}>
                {/* Left player (Team 1) */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    {renderPlayerCard(player1, team1, p1Won, true, p1Won ? match.points : 0)}
                </div>
                
                {/* VS / Status - enlarged */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '100px' // Increased from 80px
                }}>
                    {isCompleted ? (
                        <React.Fragment>
                            <div style={{
                                width: '70px', // Increased from 50px
                                height: '70px', // Increased from 50px
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #c9a961, #8b7355)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2em', // Increased from 0.9em
                                fontWeight: '800',
                                color: '#000',
                                boxShadow: '0 4px 15px rgba(201, 169, 97, 0.3)'
                            }}>
                                VS
                            </div>
                        </React.Fragment>
                    ) : (
                        <React.Fragment>
                            <div style={{
                                width: '70px', // Increased from 50px
                                height: '70px', // Increased from 50px
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #c9a961, #8b7355)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2em', // Increased from 1.5em
                                boxShadow: '0 4px 15px rgba(201, 169, 97, 0.3)'
                            }}>
                                🕐
                            </div>
                            {match.scheduledDate && (
                                <div style={{
                                    marginTop: '10px',
                                    fontSize: '0.9em', // Increased from 0.75em
                                    color: '#888',
                                    textAlign: 'center'
                                }}>
                                    {new Date(match.scheduledDate).toLocaleDateString('ru-RU')}
                                </div>
                            )}
                        </React.Fragment>
                    )}
                </div>
                
                {/* Right player (Team 2) */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                    {renderPlayerCard(player2, team2, p2Won, false, p2Won ? match.points : 0)}
                </div>
                </div>

                {/* Action icons for home player */}
                {isHomePlayer && !isCompleted && (
                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        justifyContent: 'center',
                        marginTop: '15px'
                    }}>
                        {/* Calendar icon for setting time */}
                        <div
                            onClick={() => {
                                setSelectedMatch(match);
                                setMatchDate(match.scheduledDate ? new Date(match.scheduledDate).toISOString().split('T')[0] : '');
                                setMatchTime(match.scheduledTime || '');
                                setShowMatchModal(true);
                            }}
                            style={{
                                fontSize: '2em',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                padding: '10px',
                                borderRadius: '8px',
                                background: 'rgba(33, 150, 243, 0.1)',
                                border: '2px solid #2196f3'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                            title="Установить дату и время"
                        >
                            📅
                        </div>

                        {/* Trophy icon for marking winner */}
                        {match.status !== 'completed' && (
                        <div
                            onClick={() => {
                                const baseCurrentPlayerId = currentPlayerData.id.includes('_') ? currentPlayerData.id.split('_')[0] : currentPlayerData.id;
                                setTrophyMatchData({
                                    match,
                                    player1,
                                    player2,
                                    isPlayer1: match.player1Id === baseCurrentPlayerId
                                });
                                setShowTrophySelector(true);
                            }}
                            style={{
                                fontSize: '2em',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                padding: '10px',
                                borderRadius: '8px',
                                background: 'rgba(76, 175, 80, 0.1)',
                                border: '2px solid #4caf50'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                            title="Отметить победителя"
                        >
                            🏆
                        </div>
                        )}
                    </div>
                )}

                {/* Display uploaded match file */}
                {match.matchFile && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '15px',
                        marginTop: '15px',
                        padding: '12px',
                        background: 'rgba(76, 175, 80, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid #4caf50'
                    }}>
                        <span style={{ fontSize: '1.5em' }}>📄</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: '#4caf50', fontSize: '0.9em', fontWeight: '600' }}>
                                {match.matchFile.originalName}
                            </div>
                            <div style={{ color: '#888', fontSize: '0.8em' }}>
                                {(match.matchFile.size / 1024).toFixed(1)} кб
                            </div>
                        </div>
                        <a
                            href={`${API_BASE}/api/player-matches/${match.id}/download-file`}
                            download
                            style={{
                                padding: '8px 16px',
                                background: '#4caf50',
                                color: '#fff',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontSize: '0.85em',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'background 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#45a049'}
                            onMouseOut={(e) => e.target.style.background = '#4caf50'}
                        >
                            ⬇️ Скачать
                        </a>
                    </div>
                )}
            </div>
        );
    };
    
    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '20px', color: '#c9a961' }}>Расписание матчей</h2>

            {/* Sub-tabs */}
            <div style={{
                display: 'flex',
                gap: '15px',
                marginBottom: '20px',
                borderBottom: '2px solid #333',
                paddingBottom: '10px'
            }}>
                <button
                    onClick={() => setSubTab('schedule')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '8px 8px 0 0',
                        background: subTab === 'schedule' ? '#c9a961' : '#2a2a2a',
                        color: subTab === 'schedule' ? '#000' : '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '1em',
                        transition: 'all 0.3s ease'
                    }}
                >
                    📅 Расписание
                </button>
                <button
                    onClick={() => setSubTab('live')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '8px 8px 0 0',
                        background: subTab === 'live' ? '#c9a961' : '#2a2a2a',
                        color: subTab === 'live' ? '#000' : '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '1em',
                        transition: 'all 0.3s ease',
                        position: 'relative'
                    }}
                >
                    🔴 Live Games
                    {subTab === 'live' && liveMatches.length > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            background: '#f44336',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75em',
                            fontWeight: '700'
                        }}>
                            {liveMatches.length}
                        </span>
                    )}
                </button>
            </div>
            
            {/* Filters */}
            {subTab === 'schedule' && (
                <div style={{
                    display: 'flex',
                    gap: '20px',
                    marginBottom: '25px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    background: '#1a1a1a',
                    padding: '15px 20px',
                    borderRadius: '12px',
                    border: '1px solid #333'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#888', fontSize: '0.9em' }}>🏆 Команда:</span>
                        <select
                            value={filterTeam}
                            onChange={(e) => setFilterTeam(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #444',
                                background: '#2a2a2a',
                                color: '#fff',
                                fontSize: '0.95em',
                                minWidth: '180px'
                            }}
                        >
                            <option value="">Все команды</option>
                            {teams.map(team => (
                                <option key={team.id || team._id} value={team.id || team._id}>
                                    {team.emoji} {team.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#888', fontSize: '0.9em' }}>👤 Игрок:</span>
                        <input
                            type="text"
                            placeholder="Поиск по имени..."
                            value={filterPlayer}
                            onChange={(e) => setFilterPlayer(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #444',
                                background: '#2a2a2a',
                                color: '#fff',
                                fontSize: '0.95em',
                                minWidth: '180px'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#888', fontSize: '0.9em' }}>📊 Статус:</span>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #444',
                                background: '#2a2a2a',
                                color: '#fff',
                                fontSize: '0.95em',
                                minWidth: '180px'
                            }}
                        >
                            <option value="">Все матчи</option>
                            <option value="completed">✅ Сыграны</option>
                            <option value="pending">⏳ Ожидаются</option>
                        </select>
                    </div>
                    {(filterTeam || filterPlayer || filterStatus) && (
                        <button
                            onClick={() => { setFilterTeam(''); setFilterPlayer(''); setFilterStatus(''); }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#444',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '0.9em'
                            }}
                        >
                            ✕ Сбросить
                        </button>
                    )}
                </div>
            )}

            {subTab === 'schedule' && Object.values(matchesByTeams)
                .filter(matchup => {
                    // Filter by team
                    if (filterTeam) {
                        const team1Id = matchup.team1?.id || matchup.team1?._id;
                        const team2Id = matchup.team2?.id || matchup.team2?._id;
                        if (team1Id !== filterTeam && team2Id !== filterTeam) {
                            return false;
                        }
                    }
                    // Filter by player name - must have at least one match with this player
                    if (filterPlayer && filterPlayer.trim()) {
                        const searchLower = filterPlayer.toLowerCase().trim();
                        const hasPlayer = matchup.matches.some(m => {
                            const p1 = getPlayer(m.player1Id);
                            const p2 = getPlayer(m.player2Id);
                            const p1Name = p1?.name || '';
                            const p2Name = p2?.name || '';
                            return p1Name.toLowerCase().includes(searchLower) ||
                                   p2Name.toLowerCase().includes(searchLower);
                        });
                        if (!hasPlayer) return false;
                    }
                    // Filter by status
                    if (filterStatus) {
                        const hasStatus = matchup.matches.some(m => {
                            const isCompleted = m.status === 'completed';
                            return filterStatus === 'completed' ? isCompleted : !isCompleted;
                        });
                        if (!hasStatus) return false;
                    }
                    return true;
                })
                .map((matchup, idx) => {
                    // Filter individual matches by player name and status
                    let filteredMatches = matchup.matches;
                    if (filterPlayer && filterPlayer.trim()) {
                        const searchLower = filterPlayer.toLowerCase().trim();
                        filteredMatches = matchup.matches.filter(m => {
                            const p1 = getPlayer(m.player1Id);
                            const p2 = getPlayer(m.player2Id);
                            const p1Name = p1?.name || '';
                            const p2Name = p2?.name || '';
                            return p1Name.toLowerCase().includes(searchLower) ||
                                   p2Name.toLowerCase().includes(searchLower);
                        });
                    }
                    if (filterStatus) {
                        const isCompleted = filterStatus === 'completed';
                        filteredMatches = filteredMatches.filter(m =>
                            isCompleted ? m.status === 'completed' : m.status !== 'completed'
                        );
                    }

                    // Create temporary matchup with filtered matches
                    const filteredMatchup = { ...matchup, matches: filteredMatches };
                    if (filteredMatches.length === 0) return null;
                const totalPoints = matchup.team1Points + matchup.team2Points;
                const team1Percent = totalPoints > 0 ? (matchup.team1Points / totalPoints) * 100 : 50;
                const team2Percent = totalPoints > 0 ? (matchup.team2Points / totalPoints) * 100 : 50;

                // Get team colors
                const team1Color = getTeamColor(matchup.team1?._id || matchup.team1?.id);
                const team2Color = getTeamColor(matchup.team2?._id || matchup.team2?.id);

                return (
                    <div key={idx} style={{ marginBottom: '40px' }}>
                        {/* Team Header with logos */}
                        <div style={{
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
                            padding: '20px',
                            borderRadius: '15px',
                            marginBottom: '20px',
                            border: '2px solid #c9a961',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Decorative line */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '4px',
                                background: 'linear-gradient(90deg, #c9a961, #8b7355, #c9a961)'
                            }} />
                            
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                {/* Team 1 */}
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{
                                        width: '70px',
                                        height: '70px',
                                        borderRadius: '12px',
                                        background: `linear-gradient(135deg, ${team1Color.primary}, ${team1Color.secondary})`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: `0 4px 15px ${team1Color.primary}40`
                                    }}>
                                        {matchup.team1?.logo ? (
                                            <img src={matchup.team1.logo} alt={matchup.team1.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '2em' }}>{matchup.team1?.emoji}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '700', color: '#fff', fontSize: '1.3em' }}>{matchup.team1?.name}</div>
                                        <div style={{ color: '#c9a961', fontWeight: '800', fontSize: '1.5em' }}>{matchup.team1Points}</div>
                                    </div>
                                </div>
                                
                                {/* VS Badge */}
                                <div style={{
                                    padding: '15px 25px',
                                    background: 'linear-gradient(135deg, #c9a961, #8b7355)',
                                    borderRadius: '50px',
                                    fontSize: '1.2em',
                                    fontWeight: '800',
                                    color: '#000',
                                    boxShadow: '0 4px 15px rgba(201, 169, 97, 0.4)'
                                }}>
                                    VS
                                </div>
                                
                                {/* Team 2 */}
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'flex-end' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: '700', color: '#fff', fontSize: '1.3em' }}>{matchup.team2?.name}</div>
                                        <div style={{ color: '#c9a961', fontWeight: '800', fontSize: '1.5em' }}>{matchup.team2Points}</div>
                                    </div>
                                    <div style={{
                                        width: '70px',
                                        height: '70px',
                                        borderRadius: '12px',
                                        background: `linear-gradient(135deg, ${team2Color.primary}, ${team2Color.secondary})`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: `0 4px 15px ${team2Color.primary}40`
                                    }}>
                                        {matchup.team2?.logo ? (
                                            <img src={matchup.team2.logo} alt={matchup.team2.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '2em' }}>{matchup.team2?.emoji}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Points Progress Bar */}
                            <div style={{ 
                                marginTop: '20px',
                                display: 'flex', 
                                height: '8px', 
                                borderRadius: '4px', 
                                overflow: 'hidden',
                                background: '#333'
                            }}>
                                <div style={{
                                    width: `${team1Percent}%`,
                                    background: `linear-gradient(90deg, ${team1Color.primary}, ${team1Color.secondary})`,
                                    transition: 'width 0.5s ease'
                                }} />
                                <div style={{
                                    width: `${team2Percent}%`,
                                    background: `linear-gradient(90deg, ${team2Color.primary}, ${team2Color.secondary})`,
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>
                        
                        {/* Match Brackets */}
                        <div style={{
                            background: 'rgba(26, 26, 26, 0.5)',
                            padding: '20px',
                            borderRadius: '15px',
                            border: '1px solid #333'
                        }}>
                            <h3 style={{ 
                                color: '#c9a961', 
                                marginBottom: '20px', 
                                fontSize: '1.1em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                🏆 Турнирная сетка матчей
                            </h3>
                            
                            {filteredMatchup.matches.map(match => (
                                <div key={match.id || match._id}>
                                    {renderMatchBracket(match, matchup.team1, matchup.team2)}
                                </div>
                            ))}

                            {filteredMatchup.matches.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: '#666'
                                }}>
                                    Матчи ещё не назначены
                                </div>
                            )}
                        </div>
                    </div>
                );
            }).filter(Boolean)}

            {subTab === 'live' && (
                <div>
                    {loadingLive ? (
                        <div style={{
                            padding: '60px',
                            textAlign: 'center',
                            background: '#1a1a1a',
                            borderRadius: '15px',
                            border: '2px solid #c9a961'
                        }}>
                            <div style={{ fontSize: '3em', marginBottom: '20px' }}>⏳</div>
                            <div style={{ color: '#c9a961', fontSize: '1.2em' }}>Загрузка live матчей...</div>
                        </div>
                    ) : liveMatches.length === 0 ? (
                        <div style={{
                            padding: '60px',
                            textAlign: 'center',
                            background: '#1a1a1a',
                            borderRadius: '15px',
                            border: '2px solid #333'
                        }}>
                            <div style={{ fontSize: '3em', marginBottom: '20px' }}>😴</div>
                            <div style={{ color: '#888', fontSize: '1.2em', marginBottom: '10px' }}>
                                Сейчас никто из ваших игроков не играет
                            </div>
                            <div style={{ color: '#666', fontSize: '0.9em' }}>
                                Обновление каждые 30 секунд
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div style={{
                                marginBottom: '20px',
                                padding: '15px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: '12px',
                                color: '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '1.2em', fontWeight: '700' }}>
                                        🔴 {liveMatches.length} {liveMatches.length === 1 ? 'матч' : 'матчей'} в эфире
                                    </div>
                                    <div style={{ fontSize: '0.9em', opacity: 0.9 }}>
                                        Обновляется автоматически каждые 30 секунд
                                    </div>
                                </div>
                                <button
                                    onClick={fetchLiveMatches}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'rgba(255,255,255,0.2)',
                                        color: '#fff',
                                        border: '2px solid rgba(255,255,255,0.4)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.9em',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'rgba(255,255,255,0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'rgba(255,255,255,0.2)';
                                    }}
                                >
                                    🔄 Обновить
                                </button>
                            </div>

                            {liveMatches.map((match, idx) => {
                                // Find our player's battleTag for the link
                                const ourPlayer = match.teams.flatMap(t => t.players).find(p => p.isOurPlayer);
                                const ourPlayerBattleTag = ourPlayer?.battleTag || '';

                                return (
                                <div key={match.id || idx} style={{
                                    background: '#1a1a1a',
                                    padding: '25px',
                                    borderRadius: '15px',
                                    marginBottom: '20px',
                                    border: '2px solid #667eea',
                                    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                                }}>
                                    {/* Match info header */}
                                    <div style={{
                                        textAlign: 'center',
                                        marginBottom: '15px',
                                        padding: '10px',
                                        background: 'rgba(102, 126, 234, 0.1)',
                                        borderRadius: '8px'
                                    }}>
                                        <div style={{ color: '#667eea', fontSize: '0.9em', fontWeight: '600' }}>
                                            🗺️ {match.map || 'Unknown Map'} • {match.gameMode === 1 ? '1v1' : match.gameMode === 2 ? '2v2' : match.gameMode === 4 ? '4v4' : 'FFA'}
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '20px'
                                    }}>
                                        {match.teams.map((team, teamIdx) => (
                                            <div key={teamIdx} style={{ flex: 1, textAlign: teamIdx === 0 ? 'left' : 'right' }}>
                                                {team.players.map((player, playerIdx) => (
                                                    <div key={playerIdx} style={{
                                                        marginBottom: '10px',
                                                        padding: '10px',
                                                        background: player.isOurPlayer ? 'rgba(76, 175, 80, 0.15)' : 'transparent',
                                                        borderRadius: '8px',
                                                        border: player.isOurPlayer ? '2px solid #4caf50' : 'none'
                                                    }}>
                                                        <div style={{
                                                            color: player.isOurPlayer ? '#4caf50' : '#fff',
                                                            fontWeight: player.isOurPlayer ? '700' : '400',
                                                            fontSize: '1.1em',
                                                            marginBottom: '5px'
                                                        }}>
                                                            {player.isOurPlayer && '⭐ '}
                                                            {player.playerName}
                                                        </div>
                                                        <div style={{ color: '#888', fontSize: '0.85em' }}>
                                                            {player.currentMmr ? `MMR: ${player.currentMmr}` : 'MMR: Loading...'}
                                                        </div>
                                                        {player.race && (
                                                            <div style={{ color: '#c9a961', fontSize: '0.8em', marginTop: '3px' }}>
                                                                {player.race === 1 ? '🏰 Human' : player.race === 2 ? '⚔️ Orc' : player.race === 4 ? '🌙 Night Elf' : player.race === 8 ? '💀 Undead' : '❓ Random'}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        gap: '10px',
                                        justifyContent: 'center',
                                        marginTop: '20px'
                                    }}>
                                        {ourPlayerBattleTag && (
                                            <a
                                                href={`https://www.w3champions.com/player/${encodeURIComponent(ourPlayerBattleTag)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    padding: '12px 24px',
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    color: '#fff',
                                                    borderRadius: '10px',
                                                    textDecoration: 'none',
                                                    fontSize: '1em',
                                                    fontWeight: '700',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.5)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.transform = 'translateY(-3px)';
                                                    e.target.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.7)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.transform = 'translateY(0)';
                                                    e.target.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.5)';
                                                }}
                                            >
                                                📺 Смотреть профиль игрока
                                            </a>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Match Configuration Modal */}
            {showMatchModal && selectedMatch && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#1a1a1a',
                        borderRadius: '15px',
                        border: '2px solid #c9a961',
                        padding: '30px',
                        maxWidth: '500px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                    }}>
                        {selectedMatch.status === 'upcoming' ? (
                            // BEFORE MATCH: Set date and time
                            <>
                                <h3 style={{ color: '#c9a961', marginBottom: '20px', fontSize: '1.5em' }}>
                                    📅 Установить время матча
                                </h3>

                                {/* Match Info */}
                                <div style={{ marginBottom: '20px', padding: '15px', background: '#2a2a2a', borderRadius: '10px' }}>
                                    <div style={{ color: '#888', fontSize: '0.9em' }}>
                                        {getPlayer(selectedMatch.player1Id)?.name} vs {getPlayer(selectedMatch.player2Id)?.name}
                                    </div>
                                </div>

                                {/* Date Input */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', color: '#c9a961', marginBottom: '8px', fontWeight: '600' }}>
                                        📅 Дата матча
                                    </label>
                                    <input
                                        type="date"
                                        value={matchDate}
                                        onChange={(e) => setMatchDate(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #444',
                                            background: '#2a2a2a',
                                            color: '#fff',
                                            fontSize: '1em',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* Time Input */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', color: '#c9a961', marginBottom: '8px', fontWeight: '600' }}>
                                        🕐 Время матча
                                    </label>
                                    <input
                                        type="time"
                                        value={matchTime}
                                        onChange={(e) => setMatchTime(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #444',
                                            background: '#2a2a2a',
                                            color: '#fff',
                                            fontSize: '1em',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* Buttons */}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                                    <button
                                        onClick={async () => {
                                            if (!matchDate || !matchTime) {
                                                alert('❌ Заполните дату и время!');
                                                return;
                                            }

                                            setUploadingFile(true);
                                            try {
                                                const combinedDateTime = `${matchDate}T${matchTime}:00Z`;
                                                const updateData = {
                                                    playerId: currentPlayerData.id,
                                                    scheduledDate: new Date(combinedDateTime),
                                                    scheduledTime: matchTime
                                                };

                                                const response = await fetch(`${API_BASE}/api/player-matches/${selectedMatch.id}/report`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(updateData)
                                                });

                                                const data = await response.json();
                                                if (data.error) {
                                                    alert(`❌ Ошибка: ${data.error}`);
                                                } else {
                                                    alert(`✅ Дата и время установлены!`);
                                                    setShowMatchModal(false);
                                                    setMatchFile(null);
                                                    if (onUpdate) onUpdate();
                                                }
                                            } catch (error) {
                                                alert('Ошибка подключения к серверу');
                                            } finally {
                                                setUploadingFile(false);
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: '#4caf50',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            disabled: uploadingFile ? 'not-allowed' : 'pointer',
                                            opacity: uploadingFile ? 0.6 : 1
                                        }}
                                        disabled={uploadingFile}
                                    >
                                        {uploadingFile ? '⏳ Сохранение...' : '✅ Установить время'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMatchModal(false);
                                            setMatchFile(null);
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: '#444',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        ❌ Отмена
                                    </button>
                                </div>
                            </>
                        ) : (
                            // AFTER MATCH: Upload file
                            <>
                                <h3 style={{ color: '#c9a961', marginBottom: '20px', fontSize: '1.5em' }}>
                                    📁 Загрузить файл матча
                                </h3>

                                {/* Match Info */}
                                <div style={{ marginBottom: '20px', padding: '15px', background: '#2a2a2a', borderRadius: '10px' }}>
                                    <div style={{ color: '#888', fontSize: '0.9em' }}>
                                        {getPlayer(selectedMatch.player1Id)?.name} vs {getPlayer(selectedMatch.player2Id)?.name}
                                    </div>
                                </div>

                                {/* File Upload */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', color: '#c9a961', marginBottom: '8px', fontWeight: '600' }}>
                                        📁 Файл игры (макс. 700 кб)
                                    </label>
                                    <input
                                        type="file"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 700 * 1024) {
                                                    alert('❌ Файл больше 700 кб!');
                                                    return;
                                                }
                                                setMatchFile(file);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #444',
                                            background: '#2a2a2a',
                                            color: '#888',
                                            fontSize: '0.9em',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {matchFile && (
                                        <div style={{ marginTop: '10px', color: '#4caf50', fontSize: '0.9em' }}>
                                            ✓ Выбран: {matchFile.name}
                                        </div>
                                    )}
                                </div>

                                {/* Buttons */}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                                    <button
                                        onClick={async () => {
                                            setUploadingFile(true);
                                            try {
                                                if (matchFile) {
                                                    const formData = new FormData();
                                                    formData.append('matchFile', matchFile);
                                                    formData.append('playerId', currentPlayerData.id);
                                                    formData.append('matchId', selectedMatch.id);

                                                    const fileResponse = await fetch(`${API_BASE}/api/player-matches/${selectedMatch.id}/upload-file`, {
                                                        method: 'POST',
                                                        body: formData
                                                    });

                                                    const fileData = await fileResponse.json();
                                                    if (fileData.error) {
                                                        alert(`❌ Ошибка загрузки: ${fileData.error}`);
                                                    } else {
                                                        alert(`✅ Файл загружен!`);
                                                        setShowMatchModal(false);
                                                        setMatchFile(null);
                                                        if (onUpdate) onUpdate();
                                                    }
                                                } else {
                                                    alert('⚠️ Выберите файл');
                                                }
                                            } catch (error) {
                                                alert('Ошибка подключения к серверу');
                                            } finally {
                                                setUploadingFile(false);
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: '#4caf50',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            disabled: uploadingFile ? 'not-allowed' : 'pointer',
                                            opacity: uploadingFile ? 0.6 : 1
                                        }}
                                        disabled={uploadingFile}
                                    >
                                        {uploadingFile ? '⏳ Загрузка...' : '✅ Загрузить файл'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMatchModal(false);
                                            setMatchFile(null);
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: '#444',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        ❌ Отмена
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Trophy Selector Modal */}
            {showTrophySelector && trophyMatchData && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#1a1a1a',
                        border: '3px solid #c9a961',
                        borderRadius: '20px',
                        padding: '40px',
                        maxWidth: '600px',
                        width: '90%',
                        textAlign: 'center'
                    }}>
                        <h2 style={{
                            color: '#c9a961',
                            marginBottom: '30px',
                            fontSize: '1.5em'
                        }}>
                            🏆 Кто победил?
                        </h2>

                        <div style={{
                            display: 'flex',
                            gap: '30px',
                            justifyContent: 'center',
                            marginBottom: '30px'
                        }}>
                            {/* Left Player (Winner option 1) */}
                            <div
                                onClick={() => {
                                    const baseCurrentPlayerId = currentPlayerData.id.includes('_') ? currentPlayerData.id.split('_')[0] : currentPlayerData.id;
                                    const winnerId = trophyMatchData.isPlayer1 ? trophyMatchData.match.player1Id : trophyMatchData.match.player2Id;
                                    fetch(`${API_BASE}/api/player-matches/${trophyMatchData.match.id}/report`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ playerId: baseCurrentPlayerId, winnerId })
                                    }).then(res => res.json()).then(data => {
                                        if (data.error) {
                                            alert(`❌ Ошибка: ${data.error}`);
                                        } else if (data.points) {
                                            alert(`✅ Результат записан!\n\nОчки за победу: ${data.points}`);
                                        }
                                        if (onUpdate) onUpdate();
                                        setShowTrophySelector(false);
                                        setTrophyMatchData(null);
                                    });
                                }}
                                style={{
                                    flex: 1,
                                    padding: '30px',
                                    background: 'linear-gradient(135deg, #c9a961, #8b7355)',
                                    borderRadius: '15px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    border: '3px solid transparent'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.borderColor = '#fff';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <div style={{ fontSize: '4em', marginBottom: '15px' }}>🏆</div>
                                <div style={{ color: '#000', fontWeight: '700', fontSize: '1.2em' }}>
                                    {trophyMatchData.player1?.name}
                                </div>
                            </div>

                            {/* Right Player (Winner option 2) */}
                            <div
                                onClick={() => {
                                    const baseCurrentPlayerId = currentPlayerData.id.includes('_') ? currentPlayerData.id.split('_')[0] : currentPlayerData.id;
                                    const winnerId = trophyMatchData.isPlayer1 ? trophyMatchData.match.player2Id : trophyMatchData.match.player1Id;
                                    fetch(`${API_BASE}/api/player-matches/${trophyMatchData.match.id}/report`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ playerId: baseCurrentPlayerId, winnerId })
                                    }).then(res => res.json()).then(data => {
                                        if (data.error) {
                                            alert(`❌ Ошибка: ${data.error}`);
                                        } else if (data.points) {
                                            alert(`✅ Результат записан!\n\nОчки за победу: ${data.points}`);
                                        }
                                        if (onUpdate) onUpdate();
                                        setShowTrophySelector(false);
                                        setTrophyMatchData(null);
                                    });
                                }}
                                style={{
                                    flex: 1,
                                    padding: '30px',
                                    background: 'linear-gradient(135deg, #c9a961, #8b7355)',
                                    borderRadius: '15px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    border: '3px solid transparent'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.borderColor = '#fff';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <div style={{ fontSize: '4em', marginBottom: '15px' }}>🏆</div>
                                <div style={{ color: '#000', fontWeight: '700', fontSize: '1.2em' }}>
                                    {trophyMatchData.player2?.name}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setShowTrophySelector(false);
                                setTrophyMatchData(null);
                            }}
                            style={{
                                padding: '12px 30px',
                                background: '#444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '1em'
                            }}
                        >
                            ❌ Отмена
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Unified Stats and Team Matches Component with sub-tabs
function StatsAndMatches({ players, teams, teamMatches, allPlayers }) {
    const [subTab, setSubTab] = useState('team-points');

    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>📊 Статистика</h2>

            {/* Sub-navigation */}
            <div style={{
                display: 'flex',
                gap: '15px',
                marginBottom: '30px',
                borderBottom: '2px solid #333',
                paddingBottom: '10px'
            }}>
                <button
                    onClick={() => setSubTab('team-points')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '8px 8px 0 0',
                        background: subTab === 'team-points' ? '#c9a961' : '#2a2a2a',
                        color: subTab === 'team-points' ? '#000' : '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '1em',
                        transition: 'all 0.2s',
                        borderBottom: subTab === 'team-points' ? '3px solid #c9a961' : 'none'
                    }}
                >
                    📈 Индивидуальные очки команд
                </button>
                <button
                    onClick={() => setSubTab('team-matches')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '8px 8px 0 0',
                        background: subTab === 'team-matches' ? '#c9a961' : '#2a2a2a',
                        color: subTab === 'team-matches' ? '#000' : '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '1em',
                        transition: 'all 0.2s',
                        borderBottom: subTab === 'team-matches' ? '3px solid #c9a961' : 'none'
                    }}
                >
                    ⚔️ Командные матчи
                </button>
            </div>

            {/* Content based on active sub-tab */}
            {subTab === 'team-points' && (
                <Stats players={players} teams={teams} />
            )}
            {subTab === 'team-matches' && (
                <TeamMatches teamMatches={teamMatches} teams={teams} allPlayers={allPlayers} />
            )}
        </div>
    );
}


// Team Matches Component
function TeamMatches({ teamMatches = [], teams = [], allPlayers = [] }) {
    const [expandedTeamId, setExpandedTeamId] = useState(null);

    // Group matches by team
    const matchesByTeam = teams.map(team => {
        const teamMatches_ = (teamMatches || []).filter(m => {
            const team1Id = m.team1?.id || m.team1Id;
            const team2Id = m.team2?.id || m.team2Id;
            return (team1Id === team.id || team2Id === team.id) && m.status === 'completed' && m.winnerId;
        });

        const totalPoints = teamMatches_.reduce((sum, match) => {
            // Determine which team the winner belongs to
            let winnerTeamId = null;
            if (match.winnerId === match.player1Id) {
                winnerTeamId = match.team1Id;
            } else if (match.winnerId === match.player2Id) {
                winnerTeamId = match.team2Id;
            }

            if (winnerTeamId === team.id) {
                return sum + (match.points || 0);
            }
            return sum;
        }, 0);

        return { team, matches: teamMatches_, totalPoints };
    }).sort((a, b) => b.totalPoints - a.totalPoints).filter(t => t.matches.length > 0);

    return (
        <div style={{ paddingBottom: '20px' }}>
            <div style={{ fontSize: '2em', fontWeight: '800', textAlign: 'center', marginBottom: '30px', background: 'linear-gradient(135deg, #f4e4b8 0%, #c9a961 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ⚔️ КОМАНДНЫЕ МАТЧИ
            </div>

            {matchesByTeam.map((item, idx) => (
                <div
                    key={item.team.id}
                    onClick={() => setExpandedTeamId(expandedTeamId === item.team.id ? null : item.team.id)}
                    style={{
                        background: '#2a2a2a',
                        border: '2px solid #c9a961',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#333';
                        e.currentTarget.style.borderColor = '#ffd700';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#2a2a2a';
                        e.currentTarget.style.borderColor = '#c9a961';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    {/* Team Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: '2.5em' }}>
                                {item.team.logo ? (
                                    <img
                                        src={item.team.logo}
                                        alt={item.team.name}
                                        style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
                                    />
                                ) : item.team.emoji}
                            </span>
                            <div>
                                <div style={{ fontSize: '1.3em', fontWeight: '800', color: '#fff' }}>
                                    #{idx + 1} {item.team.name}
                                </div>
                                <div style={{ color: '#888', fontSize: '0.95em' }}>
                                    {item.matches.length} матчей
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.5em', fontWeight: '800', color: '#c9a961' }}>
                                {item.totalPoints} pts
                            </div>
                            <div style={{ color: '#888', fontSize: '0.8em', marginTop: '5px' }}>
                                {expandedTeamId === item.team.id ? '▼ Скрыть' : '▶ Показать'}
                            </div>
                        </div>
                    </div>

                    {/* Expanded Team Details */}
                    {expandedTeamId === item.team.id && (
                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #444' }}>
                            {item.matches.map((match, mIdx) => {
                                const p1 = allPlayers.find(p => p.id === match.player1Id);
                                const p2 = allPlayers.find(p => p.id === match.player2Id);
                                const p1Team = p1?.teamId;
                                const p2Team = p2?.teamId;
                                const teamPlayersIds = (item.team.players || []);

                                const isP1TeamPlayer = p1Team === item.team.id;
                                const p1Name = p1?.name || 'Unknown';
                                const p2Name = p2?.name || 'Unknown';

                                // Determine which team the winner belongs to
                                let winnerTeamId = null;
                                if (match.winnerId === match.player1Id) {
                                    winnerTeamId = match.team1Id;
                                } else if (match.winnerId === match.player2Id) {
                                    winnerTeamId = match.team2Id;
                                }
                                const isWinner = winnerTeamId === item.team.id;

                                return (
                                    <div
                                        key={match.id}
                                        style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            padding: '12px 15px',
                                            borderRadius: '8px',
                                            marginBottom: mIdx < item.matches.length - 1 ? '10px' : '0',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderLeft: `3px solid ${isWinner ? '#4caf50' : '#f44336'}`
                                        }}
                                    >
                                        <div>
                                            <span style={{ color: isWinner ? '#4caf50' : '#f44336', fontWeight: '600' }}>
                                                {isWinner ? '✅ Победа' : '❌ Поражение'}
                                            </span>
                                            <span style={{ color: '#888', margin: '0 10px' }}>
                                                {isP1TeamPlayer ? `${p1Name} vs ${p2Name}` : `${p2Name} vs ${p1Name}`}
                                            </span>
                                        </div>
                                        {isWinner && (
                                            <div style={{ color: '#4caf50', fontWeight: '700' }}>
                                                +{match.points || 0} pts
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}

            {matchesByTeam.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: '#888',
                    fontSize: '1.1em'
                }}>
                    <div style={{ marginBottom: '10px' }}>⚔️</div>
                    Командные матчи ещё не сыграны
                </div>
            )}
        </div>
    );
}

function Stats({ players, teams }) {
    const totalGames = players.reduce((sum, p) => sum + (p.wins || 0) + (p.losses || 0), 0);

    const teamStats = teams.map(team => {
        const teamPlayers = players.filter(p => p.teamId === team.id);
        const points = teamPlayers.reduce((sum, p) => sum + (p.points || 0), 0);
        const games = teamPlayers.reduce((sum, p) => sum + (p.wins || 0) + (p.losses || 0), 0);
        return { ...team, points, games };
    }).sort((a, b) => b.points - a.points);

    return (
        <div>
            <div className="team-stats-section">
                <div className="total-games">{totalGames} BNL GAMES PLAYED SINCE NOV 27, 2025!</div>
                <div style={{ fontSize: '2em', fontWeight: '800', textAlign: 'center', marginBottom: '30px', background: 'linear-gradient(135deg, #f4e4b8 0%, #c9a961 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    CURRENT BNL LADDER GODS
                </div>

                {teamStats.map((team, idx) => (
                    <div key={team.id} className="team-bar-container">
                        <div className="team-name-label">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                                {team.logo ? (
                                    <img
                                        src={team.logo}
                                        alt={team.name}
                                        style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '10px',
                                            objectFit: 'cover',
                                            border: '2px solid #c9a961'
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextElementSibling.style.display = 'inline';
                                        }}
                                    />
                                ) : null}
                                <span style={{ fontSize: '1.5em', display: team.logo ? 'none' : 'inline' }}>{team.emoji}</span>
                                <div>
                                    <span style={{ fontWeight: '800', fontSize: '1.2em' }}>#{idx + 1} {team.name}</span>
                                </div>
                            </div>
                            <span style={{ color: '#888' }}>{team.games} games • {team.points} points</span>
                        </div>
                        <div className="team-bar" style={{ width: teamStats[0].points > 0 ? `${(team.points / teamStats[0].points) * 100}%` : '0%' }}>
                            <div className="team-points-display">{team.points}</div>
                            <div style={{ fontSize: '1.1em', color: 'rgba(0,0,0,0.7)', fontWeight: '600' }}>⚔️ points</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Player Detail Modal
function PlayerDetailModal({ player, portraits = [], onClose }) {
    const totalGames = (player.wins || 0) + (player.losses || 0);
    const winRate = totalGames > 0 ? ((player.wins || 0) / totalGames * 100).toFixed(1) : 0;

    // Find selected portrait if player has one
    const selectedPortrait = player.selectedPortraitId
        ? portraits.find(p => p.id === player.selectedPortraitId)
        : null;

    // Use portrait image if available, otherwise use race image
    const avatarImage = selectedPortrait ? selectedPortrait.imageUrl : raceImages[player.race];

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#1a1a1a',
                    borderRadius: '20px',
                    maxWidth: '800px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    border: '2px solid #c9a961',
                    position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #c9a961 0%, #8b7355 100%)',
                    padding: '30px',
                    borderRadius: '18px 18px 0 0',
                    position: 'relative'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '15px',
                            right: '15px',
                            background: 'rgba(0,0,0,0.3)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '24px',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ×
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {avatarImage && (
                            <img
                                src={avatarImage}
                                alt={selectedPortrait ? selectedPortrait.name : raceNames[player.race]}
                                style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    border: '3px solid rgba(255,255,255,0.3)'
                                }}
                            />
                        )}
                        <div>
                            <h2 style={{ fontSize: '2.5em', fontWeight: '900', color: '#000', marginBottom: '5px' }}>
                                {player.name}
                                {player.race && player.race !== 0 && (
                                    <span style={{
                                        color: '#8b7355',
                                        marginLeft: '10px',
                                        fontSize: '0.75em'
                                    }}>
                                        ({raceNames[player.race]})
                                    </span>
                                )}
                            </h2>
                            <div style={{ fontSize: '1.1em', color: 'rgba(0,0,0,0.6)' }}>{player.battleTag}</div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '30px' }}>
                    {/* Stats Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '20px',
                        marginBottom: '30px'
                    }}>
                        <div style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '15px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.9em', color: '#888', marginBottom: '8px' }}>Очки</div>
                            <div style={{ fontSize: '2em', fontWeight: '800', color: '#c9a961' }}>
                                {player.points || 0}
                            </div>
                        </div>
                        <div style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '15px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.9em', color: '#888', marginBottom: '8px' }}>MMR</div>
                            <div style={{ fontSize: '2em', fontWeight: '800', color: '#4caf50' }}>
                                {player.mmr || 0}
                            </div>
                        </div>
                        <div style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '15px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.9em', color: '#888', marginBottom: '8px' }}>Винрейт</div>
                            <div style={{ fontSize: '2em', fontWeight: '800', color: '#2196f3' }}>
                                {winRate}%
                            </div>
                        </div>
                        <div style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '15px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.9em', color: '#888', marginBottom: '8px' }}>Игр</div>
                            <div style={{ fontSize: '2em', fontWeight: '800', color: '#fff' }}>
                                {totalGames}
                            </div>
                        </div>
                        <div style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '15px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.9em', color: '#888', marginBottom: '8px' }}>Побед</div>
                            <div style={{ fontSize: '2em', fontWeight: '800', color: '#4caf50' }}>
                                {player.wins || 0}
                            </div>
                        </div>
                        <div style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '15px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.9em', color: '#888', marginBottom: '8px' }}>Поражений</div>
                            <div style={{ fontSize: '2em', fontWeight: '800', color: '#f44336' }}>
                                {player.losses || 0}
                            </div>
                        </div>
                    </div>

                    {/* Race */}
                    <div style={{
                        background: '#2a2a2a',
                        padding: '20px',
                        borderRadius: '15px',
                        marginBottom: '30px'
                    }}>
                        <div style={{ fontSize: '1.2em', fontWeight: '700', marginBottom: '15px', color: '#c9a961' }}>
                            🎮 Раса
                        </div>
                        <div style={{ fontSize: '1.5em', fontWeight: '800', color: '#fff' }}>
                            {raceNames[player.race] || 'Unknown'}
                        </div>
                    </div>

                    {/* Achievements */}
                    {player.achievements && player.achievements.length > 0 && (
                        <div style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '15px',
                            marginBottom: '30px'
                        }}>
                            <div style={{ fontSize: '1.2em', fontWeight: '700', marginBottom: '15px', color: '#c9a961' }}>
                                🏆 Достижения
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                                {player.achievements.map(achKey => {
                                    const ach = achievements[achKey];
                                    if (!ach) return null;
                                    return (
                                        <div
                                            key={achKey}
                                            style={{
                                                background: '#1a1a1a',
                                                padding: '15px',
                                                borderRadius: '10px',
                                                border: '1px solid #c9a961',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px'
                                            }}
                                        >
                                            <span style={{ fontSize: '2em' }}>{ach.icon}</span>
                                            <div>
                                                <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.95em' }}>
                                                    {ach.name}
                                                </div>
                                                <div style={{ fontSize: '0.8em', color: '#888' }}>
                                                    {ach.desc}
                                                </div>
                                                <div style={{ fontSize: '0.85em', color: '#c9a961', marginTop: '3px' }}>
                                                    +{ach.points} pts
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Match History */}
                    {player.matchHistory && player.matchHistory.length > 0 && (
                        <div style={{
                            background: '#2a2a2a',
                            padding: '20px',
                            borderRadius: '15px'
                        }}>
                            <div style={{ fontSize: '1.2em', fontWeight: '700', marginBottom: '15px', color: '#c9a961' }}>
                                📜 История матчей (последние {Math.min(20, player.matchHistory.length)})
                            </div>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                {player.matchHistory.slice(0, 20).map((match, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '5px',
                                            background: match.result === 'win' ? '#4caf50' : '#f44336',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontWeight: '700',
                                            fontSize: '0.8em'
                                        }}
                                        title={`${match.result === 'win' ? 'Win' : 'Loss'} (${match.mmrDiff >= 0 ? '+' : ''}${match.mmrDiff} MMR diff)`}
                                    >
                                        {match.result === 'win' ? 'W' : 'L'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================== STREAMERS ====================
function Streamers() {
    const [streamers, setStreamers] = React.useState([]);
    const [liveStatus, setLiveStatus] = React.useState({});

    React.useEffect(() => {
        fetchStreamers();
    }, []);

    const fetchStreamers = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/streamers`);
            const data = await response.json();
            setStreamers(data);

            // Check live status for each streamer
            data.forEach(streamer => {
                checkLiveStatus(streamer.twitchUsername);
            });
        } catch (error) {
            console.error('Error fetching streamers:', error);
        }
    };

    const checkLiveStatus = async (twitchUsername) => {
        try {
            const response = await fetch(`${API_BASE}/api/streamers/live/${twitchUsername}`);
            const data = await response.json();
            setLiveStatus(prev => ({ ...prev, [twitchUsername]: data.isLive }));
        } catch (error) {
            console.error('Error checking live status:', error);
            setLiveStatus(prev => ({ ...prev, [twitchUsername]: false }));
        }
    };

    const handleStreamerClick = (twitchUsername) => {
        window.open(`https://twitch.tv/${twitchUsername}`, '_blank');
    };

    return (
        <div>
            <h2 style={{ fontSize: '2.5em', marginBottom: '30px', color: '#c9a961', textAlign: 'center' }}>
                📺 Наши стримеры
            </h2>

            {streamers.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    color: '#666', fontSize: '1.2em'
                }}>
                    Пока нет стримеров
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '25px',
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    {streamers.map(streamer => {
                        const isLive = liveStatus[streamer.twitchUsername];
                        return (
                            <div
                                key={streamer.id}
                                onClick={() => handleStreamerClick(streamer.twitchUsername)}
                                style={{
                                    background: '#1a1a1a',
                                    borderRadius: '15px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    border: isLive ? '2px solid #ff0000' : '2px solid #444',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(201, 169, 97, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {isLive && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '15px',
                                        right: '15px',
                                        background: '#ff0000',
                                        color: '#fff',
                                        padding: '5px 12px',
                                        borderRadius: '5px',
                                        fontWeight: '700',
                                        fontSize: '0.85em',
                                        zIndex: 10,
                                        boxShadow: '0 2px 10px rgba(255, 0, 0, 0.5)',
                                        animation: 'pulse 2s infinite'
                                    }}>
                                        🔴 LIVE
                                    </div>
                                )}

                                <div style={{
                                    width: '100%',
                                    height: '200px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isLive ? 'linear-gradient(135deg, #9146FF 0%, #772CE8 100%)' : '#2a2a2a'
                                }}>
                                    {streamer.avatarUrl ? (
                                        <img
                                            src={streamer.avatarUrl}
                                            alt={streamer.name}
                                            style={{
                                                width: '140px',
                                                height: '140px',
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                border: '4px solid #c9a961'
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '140px',
                                            height: '140px',
                                            borderRadius: '50%',
                                            background: '#c9a961',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '4em',
                                            border: '4px solid #8b7355'
                                        }}>
                                            📺
                                        </div>
                                    )}
                                </div>

                                <div style={{ padding: '20px' }}>
                                    <div style={{
                                        fontSize: '1.4em',
                                        fontWeight: '700',
                                        color: '#fff',
                                        marginBottom: '8px'
                                    }}>
                                        {streamer.name}
                                    </div>
                                    <div style={{
                                        color: '#9146FF',
                                        fontSize: '0.95em',
                                        fontWeight: '600'
                                    }}>
                                        twitch.tv/{streamer.twitchUsername}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ==================== LOGIN MODAL (ADMIN) ====================
function LoginModal({ onClose, onSuccess }) {
    const [login, setLogin] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password })
            });

            const data = await response.json();

            if (response.ok && data.sessionId) {
                onSuccess(data.sessionId);
            } else {
                setError(data.error || 'Неверный пароль');
            }
        } catch (error) {
            setError('Ошибка подключения к серверу');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                background: '#1a1a1a', borderRadius: '15px',
                padding: '30px', maxWidth: '400px', width: '90%',
                border: '2px solid #c9a961'
            }}>
                <h2 style={{ color: '#c9a961', marginBottom: '20px', textAlign: 'center' }}>
                    ⚙️ Вход в админку
                </h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        placeholder="Логин администратора"
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px',
                            border: '1px solid #444', background: '#2a2a2a',
                            color: '#fff', marginBottom: '15px'
                        }}
                        required
                        autoFocus
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Пароль администратора"
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px',
                            border: '1px solid #444', background: '#2a2a2a',
                            color: '#fff', marginBottom: '15px'
                        }}
                        required
                    />
                    {error && (
                        <div style={{
                            color: '#f44336', marginBottom: '15px',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '8px',
                                background: '#4caf50', color: '#fff',
                                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            {loading ? 'Вход...' : 'Войти'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '8px',
                                background: '#666', color: '#fff',
                                border: 'none', cursor: 'pointer', fontWeight: '600'
                            }}
                        >
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==================== PLAYER AUTH MODAL ====================
function PlayerAuthModal({ onClose, onSuccess }) {
    const [mode, setMode] = React.useState('login'); // 'login', 'register', 'reset', 'reset-confirm', 'admin'
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    // Reset password fields
    const [resetCode, setResetCode] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [generatedCode, setGeneratedCode] = React.useState('');

    // Admin login fields
    const [adminLogin, setAdminLogin] = React.useState('');
    const [adminPassword, setAdminPassword] = React.useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (mode === 'admin') {
                // Admin login
                const response = await fetch(`${API_BASE}/api/admin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login: adminLogin, password: adminPassword })
                });

                const data = await response.json();

                if (response.ok && data.sessionId) {
                    localStorage.setItem('adminSessionId', data.sessionId);
                    window.location.reload(); // Reload to apply admin session
                } else {
                    setError(data.error || 'Неверные учетные данные');
                }
            } else if (mode === 'reset') {
                // Request reset code
                const response = await fetch(`${API_BASE}/api/players/auth/request-reset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });

                const data = await response.json();

                if (response.ok) {
                    setGeneratedCode(data.resetCode); // For dev/testing only
                    setMode('reset-confirm');
                    setSuccess('Код сброса: ' + data.resetCode + ' (действителен 15 минут)');
                } else {
                    setError(data.error || 'Ошибка при запросе сброса');
                }
            } else if (mode === 'reset-confirm') {
                // Reset password with code
                const response = await fetch(`${API_BASE}/api/players/auth/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, resetCode, newPassword })
                });

                const data = await response.json();

                if (response.ok) {
                    setSuccess('Пароль успешно изменен! Войдите с новым паролем.');
                    setTimeout(() => {
                        setMode('login');
                        setPassword('');
                        setResetCode('');
                        setNewPassword('');
                        setGeneratedCode('');
                        setSuccess('');
                    }, 2000);
                } else {
                    setError(data.error || 'Ошибка при сбросе пароля');
                }
            } else {
                // Login or Register
                const endpoint = mode === 'login'
                    ? '/api/players/auth/login'
                    : '/api/players/auth/register';

                const response = await fetch(`${API_BASE}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok && data.sessionId) {
                    localStorage.setItem('playerSessionId', data.sessionId);
                    onSuccess(data.sessionId, data.user);
                } else {
                    setError(data.error || 'Ошибка при входе');
                }
            }
        } catch (error) {
            setError('Ошибка подключения к серверу');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                background: '#1a1a1a', borderRadius: '15px',
                padding: '30px', maxWidth: '400px', width: '90%',
                border: '2px solid #c9a961'
            }}>
                <h2 style={{ color: '#c9a961', marginBottom: '20px', textAlign: 'center' }}>
                    {mode === 'login' ? '🔐 Вход' :
                     mode === 'register' ? '📝 Регистрация' :
                     mode === 'admin' ? '⚙️ Админ' :
                     mode === 'reset' ? '🔑 Сброс пароля' :
                     '🔑 Подтверждение сброса'}
                </h2>

                {(mode === 'login' || mode === 'register' || mode === 'admin') && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <button
                            onClick={() => {
                                setMode('login');
                                setError('');
                                setSuccess('');
                            }}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '8px',
                                background: mode === 'login' ? '#c9a961' : '#2a2a2a',
                                color: mode === 'login' ? '#000' : '#fff',
                                border: 'none', cursor: 'pointer', fontWeight: '600'
                            }}
                        >
                            Вход
                        </button>
                        <button
                            onClick={() => {
                                setMode('register');
                                setError('');
                                setSuccess('');
                            }}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '8px',
                                background: mode === 'register' ? '#c9a961' : '#2a2a2a',
                                color: mode === 'register' ? '#000' : '#fff',
                                border: 'none', cursor: 'pointer', fontWeight: '600'
                            }}
                        >
                            Регистрация
                        </button>
                        <button
                            onClick={() => {
                                setMode('admin');
                                setError('');
                                setSuccess('');
                            }}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '8px',
                                background: mode === 'admin' ? '#c9a961' : '#2a2a2a',
                                color: mode === 'admin' ? '#000' : '#fff',
                                border: 'none', cursor: 'pointer', fontWeight: '600'
                            }}
                        >
                            ⚙️ Админ
                        </button>
                    </div>
                )}

                {(mode === 'reset' || mode === 'reset-confirm') && (
                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                        <button
                            onClick={() => {
                                setMode('login');
                                setError('');
                                setSuccess('');
                                setResetCode('');
                                setNewPassword('');
                                setGeneratedCode('');
                            }}
                            style={{
                                background: 'transparent',
                                color: '#c9a961',
                                border: 'none',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            ← Вернуться к входу
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {mode === 'admin' ? (
                        <>
                            <input
                                type="text"
                                value={adminLogin}
                                onChange={(e) => setAdminLogin(e.target.value)}
                                placeholder="Логин администратора"
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a',
                                    color: '#fff', marginBottom: '15px'
                                }}
                                required
                                autoFocus
                            />
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                placeholder="Пароль администратора"
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a',
                                    color: '#fff', marginBottom: '15px'
                                }}
                                required
                            />
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Имя пользователя"
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a',
                                    color: '#fff', marginBottom: '15px'
                                }}
                                required
                                autoFocus
                            />

                            {(mode === 'login' || mode === 'register') && (
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Пароль"
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '8px',
                                        border: '1px solid #444', background: '#2a2a2a',
                                        color: '#fff', marginBottom: '15px'
                                    }}
                                    required
                                />
                            )}
                        </>
                    )}

                    {mode === 'reset-confirm' && (
                        <>
                            <input
                                type="text"
                                value={resetCode}
                                onChange={(e) => setResetCode(e.target.value)}
                                placeholder="Код сброса (6 цифр)"
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a',
                                    color: '#fff', marginBottom: '15px'
                                }}
                                required
                                maxLength={6}
                            />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Новый пароль"
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a',
                                    color: '#fff', marginBottom: '15px'
                                }}
                                required
                            />
                        </>
                    )}

                    {error && (
                        <div style={{
                            color: '#f44336', marginBottom: '15px',
                            textAlign: 'center', fontSize: '0.9em'
                        }}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{
                            color: '#4caf50', marginBottom: '15px',
                            textAlign: 'center', fontSize: '0.9em',
                            padding: '10px',
                            background: 'rgba(76, 175, 80, 0.1)',
                            borderRadius: '8px'
                        }}>
                            {success}
                        </div>
                    )}

                    {mode === 'login' && (
                        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('reset');
                                    setError('');
                                    setSuccess('');
                                }}
                                style={{
                                    background: 'transparent',
                                    color: '#c9a961',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    fontSize: '0.9em'
                                }}
                            >
                                Забыли пароль?
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '8px',
                                background: '#4caf50', color: '#fff',
                                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            {loading ? '...' :
                             mode === 'login' ? 'Войти' :
                             mode === 'register' ? 'Зарегистрироваться' :
                             mode === 'admin' ? '⚙️ Войти как Админ' :
                             mode === 'reset' ? 'Получить код' :
                             'Сбросить пароль'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '8px',
                                background: '#666', color: '#fff',
                                border: 'none', cursor: 'pointer', fontWeight: '600'
                            }}
                        >
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));

// ==================== PLAYER PROFILE ====================
function PlayerProfile({ playerUser, playerSessionId, allPlayers, onUpdate, onLogout, teams = [], teamMatches = [] }) {
    const [battleTag, setBattleTag] = React.useState('');
    const [linkError, setLinkError] = React.useState('');
    const [linkSuccess, setLinkSuccess] = React.useState('');
    const [linkLoading, setLinkLoading] = React.useState(false);

    const [playerData, setPlayerData] = React.useState(null);
    const [portraits, setPortraits] = React.useState([]);
    const [selectedPortrait, setSelectedPortrait] = React.useState(null);
    const [myMatches, setMyMatches] = React.useState([]);

    React.useEffect(() => {
        fetchPlayerData();
        fetchPortraits();
    }, [playerUser, allPlayers]);

    // Load player's matches
    React.useEffect(() => {
        if (playerData?.id) {
            // Filter team matches where this player participates
            const matches = teamMatches.filter(m =>
                m.player1Id === playerData.id || m.player2Id === playerData.id
            );
            console.log(`Found ${matches.length} matches for player ${playerData.id} (${playerData.name})`);
            if (matches.length === 0 && teamMatches.length > 0) {
                console.warn('No matches found. Player ID:', playerData.id, 'TeamMatch player IDs:', teamMatches.slice(0, 3).map(m => `[${m.player1Id}, ${m.player2Id}]`));
            }
            setMyMatches(matches);
        } else {
            setMyMatches([]);
        }
    }, [playerData, teamMatches]);

    const fetchPlayerData = () => {
        // Find player data from DB players (not W3Champions profiles)
        if (!playerUser.linkedBattleTag) {
            console.warn('No linkedBattleTag');
            setPlayerData(null);
            return;
        }

        if (!allPlayers || allPlayers.length === 0) {
            console.warn('allPlayers is empty or null:', { allPlayers });
            setPlayerData(null);
            return;
        }

        // Find player from database (use DB player ID for teamMatches compatibility)
        let playerProfiles = allPlayers.filter(p => p.battleTag === playerUser.linkedBattleTag);

        if (playerProfiles.length > 0) {
            // Find the main player object (with DB info like mainRace)
            const mainPlayer = playerProfiles[0];

            // Filter by main race if set
            if (mainPlayer.mainRace !== undefined && mainPlayer.mainRace !== null) {
                playerProfiles = playerProfiles.filter(p => p.race === mainPlayer.mainRace);
            }

            if (playerProfiles.length === 0) {
                // If main race filter resulted in no profiles, use highest points
                playerProfiles = allPlayers.filter(p => p.battleTag === playerUser.linkedBattleTag);
            }

            // Use the profile with highest points
            const bestProfile = playerProfiles.reduce((best, current) =>
                (current.points || 0) > (best.points || 0) ? current : best
            );
            setPlayerData(bestProfile);
            console.log('Player data found:', bestProfile, 'ID:', bestProfile.id, 'Main Race:', mainPlayer.mainRace);
        } else {
            console.warn('No player profiles found for battleTag:', playerUser.linkedBattleTag);
            setPlayerData(null);
        }
    };

    const fetchPortraits = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/portraits`);
            const data = await response.json();
            setPortraits(data);
        } catch (error) {
            console.error('Error fetching portraits:', error);
        }
    };

    const handleLinkBattleTag = async (e) => {
        e.preventDefault();
        setLinkLoading(true);
        setLinkError('');
        setLinkSuccess('');

        try {
            const response = await fetch(`${API_BASE}/api/players/auth/link-battletag`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-player-session-id': playerSessionId
                },
                body: JSON.stringify({ battleTag })
            });

            const data = await response.json();

            if (response.ok) {
                setLinkSuccess('BattleTag успешно привязан!');
                setBattleTag('');
                onUpdate();
                fetchPlayerData();
            } else {
                setLinkError(data.error || 'Ошибка привязки BattleTag');
            }
        } catch (error) {
            setLinkError('Ошибка подключения к серверу');
        } finally {
            setLinkLoading(false);
        }
    };

    const handleUnlinkBattleTag = async () => {
        if (!confirm('Вы уверены, что хотите отвязать свой BattleTag? Вы потеряете доступ к своей статистике.')) {
            return;
        }

        setLinkLoading(true);
        setLinkError('');
        setLinkSuccess('');

        try {
            const response = await fetch(`${API_BASE}/api/players/auth/unlink-battletag`, {
                method: 'DELETE',
                headers: {
                    'x-player-session-id': playerSessionId
                }
            });

            const data = await response.json();

            if (response.ok) {
                setLinkSuccess('BattleTag успешно отвязан!');
                setPlayerData(null);
                onUpdate();
            } else {
                setLinkError(data.error || 'Ошибка отвязки BattleTag');
            }
        } catch (error) {
            setLinkError('Ошибка подключения к серверу');
        } finally {
            setLinkLoading(false);
        }
    };

    const handleSelectPortrait = async (portraitId) => {
        // Find the portrait to check points requirement
        const portrait = portraits.find(p => p.id === portraitId);
        if (!portrait) {
            alert('Портрет не найден');
            return;
        }

        // Check if player has enough points
        const playerPoints = playerData?.points || 0;
        if (playerPoints < portrait.pointsRequired) {
            alert(`❌ Недостаточно очков!\n\nДля этого портрета требуется: ${portrait.pointsRequired} очков\nУ вас сейчас: ${playerPoints} очков\n\nЗаработайте еще ${portrait.pointsRequired - playerPoints} очков, чтобы разблокировать этот портрет!`);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/players/auth/select-portrait`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-player-session-id': playerSessionId
                },
                body: JSON.stringify({ portraitId })
            });

            const data = await response.json();

            if (response.ok) {
                setSelectedPortrait(portraitId);
                // Refresh player data in main app so portrait shows in Players tab
                onUpdate();
                fetchPlayerData();
                alert('✅ Портрет успешно выбран!');
            } else {
                alert(data.error || 'Ошибка выбора портрета');
            }
        } catch (error) {
            alert('Ошибка подключения к серверу');
        }
    };

    const raceNames = {
        0: '🎲 Рандом',
        1: '👑 Хумы',
        2: '⚔️ Орки',
        4: '🌙 Эльфы',
        8: '💀 Андеды'
    };

    const getAvailablePortraits = () => {
        if (!playerData) return [];

        const playerRace = playerData.race;

        // Show ALL portraits for player's race (not just unlocked ones)
        return portraits.filter(portrait => {
            // Check race - each portrait is only available for its specific race
            // Race 0 (Random) portraits are only for Random players
            if (portrait.race !== playerRace) return false;

            return true;
        }).sort((a, b) => a.pointsRequired - b.pointsRequired);
    };

    const isPortraitUnlocked = (portrait) => {
        if (!playerData) return false;
        const playerPoints = playerData.points || 0;
        return playerPoints >= portrait.pointsRequired;
    };

    return (
        <div>
            <h2 style={{ fontSize: '2.5em', marginBottom: '30px', color: '#c9a961', textAlign: 'center' }}>
                👤 Профиль игрока
            </h2>

            <div style={{
                maxWidth: '800px', margin: '0 auto',
                background: '#1a1a1a', padding: '30px', borderRadius: '15px',
                border: '2px solid #c9a961', marginBottom: '30px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <div style={{ fontSize: '1.8em', fontWeight: '700', color: '#c9a961', marginBottom: '10px' }}>
                            {playerUser.username}
                        </div>
                        {playerUser.linkedBattleTag && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ color: '#4caf50', fontSize: '1.1em' }}>
                                    ✓ Привязан к {playerUser.linkedBattleTag}
                                </div>
                                <button
                                    onClick={handleUnlinkBattleTag}
                                    disabled={linkLoading}
                                    style={{
                                        padding: '6px 12px', borderRadius: '6px',
                                        background: '#ff9800', color: '#fff',
                                        border: 'none', cursor: linkLoading ? 'not-allowed' : 'pointer',
                                        fontWeight: '600', fontSize: '0.85em',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseOver={(e) => e.target.style.background = '#f57c00'}
                                    onMouseOut={(e) => e.target.style.background = '#ff9800'}
                                >
                                    {linkLoading ? '⏳' : '🔓 Отвязать'}
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onLogout}
                        style={{
                            padding: '12px 24px', borderRadius: '8px',
                            background: '#f44336', color: '#fff',
                            border: 'none', cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        🚪 Выход
                    </button>
                </div>

                {linkError && (
                    <div style={{ color: '#f44336', marginBottom: '15px', padding: '12px', background: '#2a2a2a', borderRadius: '8px' }}>
                        {linkError}
                    </div>
                )}
                {linkSuccess && (
                    <div style={{ color: '#4caf50', marginBottom: '15px', padding: '12px', background: '#2a2a2a', borderRadius: '8px' }}>
                        {linkSuccess}
                    </div>
                )}

                {!playerUser.linkedBattleTag ? (
                    <div style={{
                        background: '#2a2a2a', padding: '25px', borderRadius: '12px',
                        border: '1px solid #c9a961'
                    }}>
                        <h3 style={{ color: '#c9a961', marginBottom: '15px' }}>
                            Привяжите свой BattleTag
                        </h3>
                        <p style={{ color: '#e0e0e0', marginBottom: '20px' }}>
                            Введите ваш BattleTag (например: PlayerName#1234), чтобы связать ваш профиль с вашим игроком в лиге.
                        </p>
                        <form onSubmit={handleLinkBattleTag}>
                            <input
                                type="text"
                                value={battleTag}
                                onChange={(e) => setBattleTag(e.target.value)}
                                placeholder="PlayerName#1234"
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#1a1a1a',
                                    color: '#fff', marginBottom: '15px'
                                }}
                                required
                            />
                            {linkError && (
                                <div style={{ color: '#f44336', marginBottom: '15px' }}>
                                    {linkError}
                                </div>
                            )}
                            {linkSuccess && (
                                <div style={{ color: '#4caf50', marginBottom: '15px' }}>
                                    {linkSuccess}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={linkLoading}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    background: '#4caf50', color: '#fff',
                                    border: 'none', cursor: linkLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                {linkLoading ? 'Привязка...' : '🔗 Привязать BattleTag'}
                            </button>
                        </form>
                    </div>
                ) : playerData ? (
                    <div>
                        <div style={{
                            background: '#2a2a2a', padding: '20px', borderRadius: '12px',
                            marginBottom: '30px'
                        }}>
                            <h3 style={{ color: '#c9a961', marginBottom: '15px' }}>Статистика</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                                <div>
                                    <div style={{ color: '#888', fontSize: '0.9em' }}>Раса</div>
                                    <div style={{ color: '#fff', fontSize: '1.3em', fontWeight: '700' }}>
                                        {raceNames[playerData.race] || 'Неизвестно'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: '#888', fontSize: '0.9em' }}>Очки</div>
                                    <div style={{ color: '#c9a961', fontSize: '1.3em', fontWeight: '700' }}>
                                        {playerData.points || 0}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: '#888', fontSize: '0.9em' }}>MMR</div>
                                    <div style={{ color: '#fff', fontSize: '1.3em', fontWeight: '700' }}>
                                        {playerData.mmr || playerData.currentMmr || 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: '#888', fontSize: '0.9em' }}>Побед/Поражений</div>
                                    <div style={{ color: '#fff', fontSize: '1.3em', fontWeight: '700' }}>
                                        {playerData.wins || 0}/{playerData.losses || 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Race Selection */}
                        <div style={{
                            background: '#2a2a2a', padding: '20px', borderRadius: '12px',
                            marginBottom: '30px',
                            border: '2px solid #c9a961'
                        }}>
                            <h3 style={{ color: '#c9a961', marginBottom: '15px', fontSize: '1.2em' }}>
                                ⚔️ Меин раса (для подсчета статистики)
                            </h3>
                            <p style={{ color: '#888', marginBottom: '15px', fontSize: '0.9em' }}>
                                Выберите расу, на которой вы играете больше всего. Статистика будет считаться только по матчам на этой расе.
                            </p>
                            <select
                                value={playerData.mainRace || ''}
                                onChange={async (e) => {
                                    const mainRace = parseInt(e.target.value);
                                    if (mainRace === undefined) return;

                                    try {
                                        const response = await fetch(`${API_BASE}/api/players/auth/select-main-race`, {
                                            method: 'PUT',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'x-player-session-id': playerSessionId
                                            },
                                            body: JSON.stringify({ mainRace })
                                        });

                                        const data = await response.json();
                                        if (response.ok) {
                                            // Refresh all player data from server and wait for completion
                                            if (onUpdate) {
                                                await onUpdate();
                                                // Give React time to process the state update before fetching player data
                                                setTimeout(() => {
                                                    fetchPlayerData();
                                                }, 100);
                                            }
                                            alert('✅ Меин раса выбрана! Статистика и портреты обновлены.');
                                        } else {
                                            alert(data.error || 'Ошибка выбора расы');
                                        }
                                    } catch (error) {
                                        console.error('Error selecting main race:', error);
                                        alert('Ошибка подключения к серверу');
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '2px solid #c9a961',
                                    background: '#1a1a1a',
                                    color: '#c9a961',
                                    fontSize: '1em',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">-- Выберите расу --</option>
                                <option value="0">🎲 Рандом</option>
                                <option value="1">👑 Хумы</option>
                                <option value="2">⚔️ Орки</option>
                                <option value="4">🌙 Эльфы</option>
                                <option value="8">💀 Андеды</option>
                            </select>
                            {playerData.mainRace !== undefined && playerData.mainRace !== null && (
                                <div style={{ color: '#4caf50', marginTop: '10px', fontSize: '0.9em', fontWeight: '600' }}>
                                    ✓ Меин раса: {raceNames[playerData.mainRace]}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 style={{ color: '#c9a961', marginBottom: '20px', fontSize: '1.5em' }}>
                                🖼️ Выбор портрета
                            </h3>
                            {getAvailablePortraits().length === 0 ? (
                                <div style={{
                                    background: '#2a2a2a', padding: '30px', borderRadius: '12px',
                                    textAlign: 'center', color: '#888'
                                }}>
                                    Нет доступных портретов. Зарабатывайте очки, чтобы разблокировать портреты!
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                    gap: '15px'
                                }}>
                                    {getAvailablePortraits().map(portrait => {
                                        const unlocked = isPortraitUnlocked(portrait);
                                        const isSelected = playerData.selectedPortraitId === portrait.id;

                                        return (
                                            <div
                                                key={portrait.id}
                                                onClick={() => handleSelectPortrait(portrait.id)}
                                                style={{
                                                    background: '#2a2a2a',
                                                    padding: '15px',
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    border: isSelected
                                                        ? '3px solid #4caf50'
                                                        : unlocked
                                                        ? '2px solid #444'
                                                        : '2px solid #ff9800',
                                                    transition: 'transform 0.2s, border-color 0.2s',
                                                    opacity: unlocked ? 1 : 0.6,
                                                    position: 'relative'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.borderColor = unlocked ? '#c9a961' : '#ff9800';
                                                    }
                                                    e.currentTarget.style.transform = 'scale(1.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.borderColor = unlocked ? '#444' : '#ff9800';
                                                    }
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                }}
                                            >
                                                {!unlocked && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '10px',
                                                        right: '10px',
                                                        background: 'rgba(255, 152, 0, 0.9)',
                                                        color: '#fff',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75em',
                                                        fontWeight: '700',
                                                        zIndex: 1
                                                    }}>
                                                        🔒 {portrait.pointsRequired}
                                                    </div>
                                                )}
                                                <img
                                                    src={portrait.imageUrl}
                                                    alt={portrait.name}
                                                    style={{
                                                        width: '100%',
                                                        height: '100px',
                                                        objectFit: 'cover',
                                                        borderRadius: '8px',
                                                        marginBottom: '10px',
                                                        filter: unlocked ? 'none' : 'brightness(0.5) grayscale(0.5)'
                                                    }}
                                                />
                                                <div style={{
                                                    color: '#fff',
                                                    fontSize: '0.85em',
                                                    fontWeight: '600',
                                                    textAlign: 'center',
                                                    marginBottom: '5px'
                                                }}>
                                                    {portrait.name}
                                                </div>
                                            <div style={{
                                                color: '#c9a961',
                                                fontSize: '0.75em',
                                                textAlign: 'center'
                                            }}>
                                                {portrait.pointsRequired} очков
                                            </div>
                                            {isSelected && (
                                                <div style={{
                                                    color: '#4caf50',
                                                    fontSize: '0.75em',
                                                    textAlign: 'center',
                                                    marginTop: '5px',
                                                    fontWeight: '700'
                                                }}>
                                                    ✓ Выбран
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{
                        background: '#2a2a2a', padding: '30px', borderRadius: '12px',
                        textAlign: 'center', color: '#888'
                    }}>
                        Загрузка данных игрока...
                    </div>
                )}
            </div>

            {/* Upcoming matches section */}
            {playerData && myMatches.length > 0 && (
                <div style={{
                    maxWidth: '800px', margin: '0 auto',
                    background: '#1a1a1a', padding: '30px', borderRadius: '15px',
                    border: '2px solid #c9a961'
                }}>
                    <h3 style={{ color: '#c9a961', marginBottom: '20px', fontSize: '1.5em' }}>
                        ⚔️ Мои матчи
                    </h3>
                    
                    {/* Debug: Log home matches */}
                    {myMatches.length > 0 && (
                        <div style={{ color: '#888', fontSize: '0.8em', marginBottom: '10px', padding: '10px', background: '#2a2a2a', borderRadius: '5px' }}>
                            📊 Debug: {myMatches.length} матчей найдено, домашних: {myMatches.filter(m => m.homePlayerId === playerData.id).length}, гостевых: {myMatches.filter(m => m.homePlayerId !== playerData.id).length}
                        </div>
                    )}

                    {/* Upcoming matches where this player is home */}
                    {myMatches.filter(m => m.status === 'upcoming' && m.homePlayerId === playerData.id).length > 0 && (
                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ color: '#4caf50', marginBottom: '15px', fontSize: '1.1em' }}>
                                🏠 Домашние матчи (вы организатор)
                            </h4>
                            {myMatches.filter(m => m.status === 'upcoming' && m.homePlayerId === playerData.id).map(match => {
                                const isPlayer1 = match.player1Id === playerData.id;
                                const opponent = allPlayers.find(p => p.id === (isPlayer1 ? match.player2Id : match.player1Id));
                                const myTeam = teams.find(t => t.id === (isPlayer1 ? match.team1Id : match.team2Id));
                                const opponentTeam = teams.find(t => t.id === (isPlayer1 ? match.team2Id : match.team1Id));
                                
                                return (
                                    <div key={match.id} style={{
                                        background: '#2a2a2a', padding: '15px', borderRadius: '10px',
                                        marginBottom: '10px', border: '2px solid #4caf50'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <div>
                                                <span style={{ color: '#c9a961', fontWeight: '600' }}>{playerData.name}</span>
                                                <span style={{ color: '#888' }}> ({myTeam?.name}) </span>
                                                <span style={{ color: '#c9a961', margin: '0 10px' }}>VS</span>
                                                <span style={{ color: '#fff', fontWeight: '600' }}>{opponent?.name || 'Unknown'}</span>
                                                <span style={{ color: '#888' }}> ({opponentTeam?.name})</span>
                                            </div>
                                            {match.scheduledDate && (
                                                <div style={{ color: '#c9a961', fontSize: '0.9em' }}>
                                                    📅 {new Date(match.scheduledDate).toLocaleString('ru-RU')}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => {
                                                    // Verify this is the home player
                                                    if (match.homePlayerId !== playerData.id) {
                                                        alert('❌ Только организатор матча может установить время!');
                                                        return;
                                                    }
                                                    const date = prompt('Введите дату и время (ГГГГ-ММ-ДД ЧЧ:ММ):',
                                                        match.scheduledDate ? new Date(match.scheduledDate).toISOString().slice(0, 16).replace('T', ' ') : '');
                                                    if (date) {
                                                        fetch(`${API_BASE}/api/player-matches/${match.id}/report`, {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ playerId: playerData.id, scheduledDate: new Date(date.replace(' ', 'T')) })
                                                        }).then(res => res.json()).then(data => {
                                                            if (data.error) {
                                                                alert(`❌ Ошибка: ${data.error}`);
                                                            } else {
                                                                alert('✅ Дата и время установлены!');
                                                            }
                                                            onUpdate();
                                                        });
                                                    }
                                                }}
                                                style={{
                                                    padding: '8px 16px', borderRadius: '8px',
                                                    background: '#2196f3', color: '#fff',
                                                    border: 'none', cursor: 'pointer', fontSize: '0.9em'
                                                }}
                                            >
                                                📅 Назначить время
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // Verify this is the home player
                                                    if (match.homePlayerId !== playerData.id) {
                                                        alert('❌ Только организатор матча может отметить победителя!');
                                                        return;
                                                    }
                                                    const winner = confirm(`Кто победил?\n\nОК - Я победил (${playerData.name})\nОтмена - Победил соперник (${opponent?.name})`);
                                                    const winnerId = winner ? (isPlayer1 ? match.player1Id : match.player2Id) : (isPlayer1 ? match.player2Id : match.player1Id);

                                                    fetch(`${API_BASE}/api/player-matches/${match.id}/report`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ playerId: playerData.id, winnerId })
                                                    }).then(res => res.json()).then(data => {
                                                        if (data.error) {
                                                            alert(`❌ Ошибка: ${data.error}`);
                                                        } else if (data.points) {
                                                            alert(`✅ Результат записан!\n\nОчки за победу: ${data.points}`);
                                                        }
                                                        onUpdate();
                                                    });
                                                }}
                                                style={{
                                                    padding: '8px 16px', borderRadius: '8px',
                                                    background: '#4caf50', color: '#fff',
                                                    border: 'none', cursor: 'pointer', fontSize: '0.9em'
                                                }}
                                            >
                                                🏆 Отметить победителя
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {/* Other upcoming matches */}
                    {myMatches.filter(m => m.status === 'upcoming' && m.homePlayerId !== playerData.id).length > 0 && (
                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ color: '#2196f3', marginBottom: '15px', fontSize: '1.1em' }}>
                                🎮 Предстоящие гостевые матчи
                            </h4>
                            {myMatches.filter(m => m.status === 'upcoming' && m.homePlayerId !== playerData.id).map(match => {
                                const isPlayer1 = match.player1Id === playerData.id;
                                const opponent = allPlayers.find(p => p.id === (isPlayer1 ? match.player2Id : match.player1Id));
                                const homePlayer = allPlayers.find(p => p.id === match.homePlayerId);
                                const myTeam = teams.find(t => t.id === (isPlayer1 ? match.team1Id : match.team2Id));
                                const opponentTeam = teams.find(t => t.id === (isPlayer1 ? match.team2Id : match.team1Id));
                                
                                return (
                                    <div key={match.id} style={{
                                        background: '#2a2a2a', padding: '15px', borderRadius: '10px',
                                        marginBottom: '10px', border: '1px solid #444'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ color: '#c9a961', fontWeight: '600' }}>{playerData.name}</span>
                                                <span style={{ color: '#888' }}> ({myTeam?.name}) </span>
                                                <span style={{ color: '#c9a961', margin: '0 10px' }}>VS</span>
                                                <span style={{ color: '#fff', fontWeight: '600' }}>{opponent?.name || 'Unknown'}</span>
                                                <span style={{ color: '#888' }}> ({opponentTeam?.name})</span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                {match.scheduledDate && (
                                                    <div style={{ color: '#c9a961', fontSize: '0.9em' }}>
                                                        📅 {new Date(match.scheduledDate).toLocaleString('ru-RU')}
                                                    </div>
                                                )}
                                                <div style={{ color: '#888', fontSize: '0.8em', marginTop: '5px' }}>
                                                    🏠 Организатор: {homePlayer?.name || 'Не определён'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {/* Completed matches */}
                    {myMatches.filter(m => m.status === 'completed').length > 0 && (
                        <div>
                            <h4 style={{ color: '#888', marginBottom: '15px', fontSize: '1.1em' }}>
                                ✅ Завершённые матчи
                            </h4>
                            {myMatches.filter(m => m.status === 'completed').slice(0, 5).map(match => {
                                const isPlayer1 = match.player1Id === playerData.id;
                                const opponent = allPlayers.find(p => p.id === (isPlayer1 ? match.player2Id : match.player1Id));
                                const iWon = (isPlayer1 && match.winnerId === match.player1Id) || (!isPlayer1 && match.winnerId === match.player2Id);
                                
                                return (
                                    <div key={match.id} style={{
                                        background: '#2a2a2a', padding: '12px 15px', borderRadius: '8px',
                                        marginBottom: '8px', display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', borderLeft: `3px solid ${iWon ? '#4caf50' : '#f44336'}`
                                    }}>
                                        <div>
                                            <span style={{ color: iWon ? '#4caf50' : '#f44336', fontWeight: '600' }}>
                                                {iWon ? '✅ Победа' : '❌ Поражение'}
                                            </span>
                                            <span style={{ color: '#888' }}> против </span>
                                            <span style={{ color: '#fff' }}>{opponent?.name}</span>
                                        </div>
                                        {iWon && match.points > 0 && (
                                            <div style={{ color: '#4caf50', fontWeight: '600' }}>
                                                +{match.points} pts
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
