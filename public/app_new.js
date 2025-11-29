const { useState, useEffect } = React;

// Race mapping - W3Champions API
const raceIcons = {
    0: '🎲', 1: '👑', 2: '⚔️', 4: '💀', 8: '🌙',
};

const raceNames = {
    0: 'Random', 1: 'Human', 2: 'Orc', 4: 'Undead', 8: 'Night Elf',
};

const achievements = {
    winStreak3: { icon: "🔥", name: "On Fire", desc: "3 wins in a row", points: 15 },
    winStreak5: { icon: "🔥🔥", name: "Hot Streak", desc: "5 wins in a row", points: 25 },
    centurion: { icon: "💯", name: "Centurion", desc: "100 total wins", points: 50 },
    gladiator: { icon: "🏛️", name: "Gladiator", desc: "10+ wins this week", points: 20 },
    goldRush: { icon: "💰", name: "Gold Rush", desc: "1000+ points", points: 30 },
    comeback: { icon: "↩️", name: "Comeback", desc: "Win after 3 losses", points: 20 },
    veteran: { icon: "🎖️", name: "Veteran", desc: "500+ total games", points: 35 },
};

const API_BASE = '';

function App() {
    const [activeTab, setActiveTab] = useState('players');
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [sessionId, setSessionId] = useState(localStorage.getItem('adminSessionId'));

    const [teams, setTeams] = useState([]);
    const [allPlayers, setAllPlayers] = useState([]);
    const [teamMatches, setTeamMatches] = useState([]);

    const [schedule] = useState([
        { id: 1, team1: "Chinese Panda", team2: "Elite Warriors", date: "2025-12-01 18:00", status: "upcoming" },
        { id: 2, team1: "Chinese Panda", team2: "Elite Warriors", date: "2025-11-28 20:00", status: "live" }
    ]);

    useEffect(() => {
        loadPlayers();
        loadTeams();
        loadAllPlayers();
        loadTeamMatches();
        if (sessionId) {
            verifySession();
        }
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

    const loadPlayers = async () => {
        const battleTags = ["ZugZugMaster#1399", "ЖИВОТНОЕ#21901", "jabker#2902"];
        const loadedPlayers = [];

        for (let i = 0; i < battleTags.length; i++) {
            const tag = battleTags[i];
            try {
                const response = await fetch(`${API_BASE}/api/matches/${encodeURIComponent(tag)}?gateway=20&season=23&pageSize=100`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const matchesData = await response.json();
                const playerStats = processMatches(tag, matchesData.matches || []);

                loadedPlayers.push({
                    id: i + 1,
                    name: tag.split('#')[0],
                    battleTag: tag,
                    ...playerStats,
                    teamId: i < 2 ? 1 : 2,
                });
            } catch (error) {
                console.error(`Error loading ${tag}:`, error);
                loadedPlayers.push({
                    id: i + 1,
                    name: tag.split('#')[0],
                    battleTag: tag,
                    race: 0, mmr: 0, wins: 0, losses: 0, points: 0,
                    achievements: [], teamId: i < 2 ? 1 : 2,
                    matchHistory: [], activityData: generateActivityData(), error: true
                });
            }
        }
        setPlayers(loadedPlayers);
        setLoading(false);
    };

    const processMatches = (battleTag, matches) => {
        if (!matches || matches.length === 0) {
            return {
                race: 0, mmr: 0, wins: 0, losses: 0, points: 0,
                achievements: [], matchHistory: [], activityData: generateActivityData()
            };
        }

        const cutoffDate = new Date('2025-11-27T00:00:00Z');
        const recentMatches = matches.filter(match => {
            const matchDate = new Date(match.startTime);
            return matchDate >= cutoffDate;
        });

        let wins = 0, losses = 0, totalPoints = 0, currentMMR = 0, playerRace = 0;
        const matchHistory = [];
        const raceCounts = {};

        if (recentMatches.length > 0) {
            const firstMatch = recentMatches[0];
            const firstPlayerTeam = firstMatch.teams.find(team =>
                team.players.some(p => p.battleTag === battleTag)
            );
            if (firstPlayerTeam) {
                const firstPlayer = firstPlayerTeam.players.find(p => p.battleTag === battleTag);
                if (firstPlayer) {
                    currentMMR = firstPlayer.currentMmr || 0;
                }
            }
        }

        recentMatches.forEach(match => {
            const playerTeam = match.teams.find(team =>
                team.players.some(p => p.battleTag === battleTag)
            );
            if (!playerTeam) return;

            const player = playerTeam.players.find(p => p.battleTag === battleTag);
            const opponentTeam = match.teams.find(team => team !== playerTeam);
            if (!player || !opponentTeam) return;

            const opponent = opponentTeam.players[0];
            const won = playerTeam.won;

            if (player.race) {
                raceCounts[player.race] = (raceCounts[player.race] || 0) + 1;
            }

            const playerMMR = player.oldMmr || player.currentMmr || 1500;
            const opponentMMR = opponent.oldMmr || opponent.currentMmr || 1500;
            const mmrDiff = opponentMMR - playerMMR;

            let matchPoints = 0;
            if (won) {
                wins++;
                matchHistory.push('win');
                if (mmrDiff >= 20) {
                    matchPoints = 40 + Math.floor(mmrDiff / 10);
                } else if (mmrDiff <= -20) {
                    matchPoints = 10 + Math.floor(Math.abs(mmrDiff) / 20);
                } else {
                    matchPoints = 25;
                }
            } else {
                losses++;
                matchHistory.push('loss');
                matchPoints = 0;
            }
            totalPoints += matchPoints;
        });

        let mostPlayedRace = 0, maxCount = 0;
        for (const [race, count] of Object.entries(raceCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostPlayedRace = parseInt(race);
            }
        }
        playerRace = mostPlayedRace;

        const achs = determineAchievements(wins, losses, totalPoints, recentMatches.length);
        achs.forEach(achKey => {
            totalPoints += achievements[achKey].points;
        });

        return {
            race: playerRace, mmr: currentMMR, wins, losses, points: totalPoints,
            achievements: achs, matchHistory: matchHistory.slice(0, 100).reverse(),
            activityData: generateActivityData()
        };
    };

    const determineAchievements = (wins, losses, points, totalGames) => {
        const achs = [];
        if (wins >= 100) achs.push('centurion');
        if (wins >= 10) achs.push('gladiator');
        if (totalGames >= 500) achs.push('veteran');
        if (points >= 1000) achs.push('goldRush');
        return achs;
    };

    const generateActivityData = () => {
        return Array(7).fill(0).map(() =>
            Array(20).fill(0).map(() => Math.random() > 0.4)
        );
    };

    if (loading) {
        return (
            <div>
                <Header />
                <Nav activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} setShowLoginModal={setShowLoginModal} />
                <div className="app">
                    <div className="loading">⚔️ Загрузка матчей с W3Champions...<br />Подсчет очков с 27.11.2025...</div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Header />
            <Nav activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} setShowLoginModal={setShowLoginModal} />
            <div className="app">
                {activeTab === 'players' && <Players players={players} />}
                {activeTab === 'teams' && <Teams teams={teams} players={players} />}
                {activeTab === 'schedule' && <Schedule schedule={schedule} />}
                {activeTab === 'stats' && <Stats players={players} teams={teams} />}
                {activeTab === 'team-matches' && <TeamMatches teamMatches={teamMatches} teams={teams} allPlayers={allPlayers} />}
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
                    />
                )}
            </div>
            {showLoginModal && (
                <LoginModal 
                    onClose={() => setShowLoginModal(false)}
                    onSuccess={(newSessionId) => {
                        setSessionId(newSessionId);
                        setIsAdmin(true);
                        localStorage.setItem('adminSessionId', newSessionId);
                        setShowLoginModal(false);
                        setActiveTab('admin');
                    }}
                />
            )}
        </div>
    );
}

function Header() {
    return (
        <div className="header">
            <div className="header-content">
                <h1 className="league-title">CURRENT GNL</h1>
                <div style={{ color: '#888', marginTop: '10px' }}>📅 Season 23 • Starting Nov 27, 2025</div>
            </div>
        </div>
    );
}

function Nav({ activeTab, setActiveTab, isAdmin, setShowLoginModal }) {
    return (
        <div className="nav">
            <div className="nav-container">
                <button className={`nav-btn ${activeTab === 'players' ? 'active' : ''}`} onClick={() => setActiveTab('players')}>Игроки</button>
                <button className={`nav-btn ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>Команды</button>
                <button className={`nav-btn ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Расписание</button>
                <button className={`nav-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Статистика</button>
                <button className={`nav-btn ${activeTab === 'team-matches' ? 'active' : ''}`} onClick={() => setActiveTab('team-matches')}>Командные матчи</button>
                {isAdmin ? (
                    <button className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>⚙️ Админка</button>
                ) : (
                    <button className="nav-btn" onClick={() => setShowLoginModal(true)}>🔐 Вход</button>
                )}
            </div>
        </div>
    );
}

// Остальные компоненты остаются без изменений (Players, PlayerCard, Teams, Schedule, Stats)
// Добавлю новые компоненты ниже
