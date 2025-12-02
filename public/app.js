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

// Achievements
const achievements = {
    winStreak3: { icon: "🔥", name: "On Fire", desc: "3 wins in a row", points: 30 },
    winStreak5: { icon: "🔥🔥", name: "Hot Streak", desc: "5 wins in a row", points: 50 },
    loseStreak3: { icon: "💪", name: "Не расстраивайся дави на газ", desc: "3 losses in a row", points: 10 },
    giantSlayer: { icon: "⚔️", name: "И кто тут папа?", desc: "Beat opponent with +50 MMR", points: 25 },
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
    const [error, setError] = useState(null);
    
    // Admin states
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [sessionId, setSessionId] = useState(localStorage.getItem('adminSessionId'));
    
    // Data from backend
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
        try {
            // Загружаем игроков из API (добавленных через админку)
            const playersResponse = await fetch(`${API_BASE}/api/players`);
            const apiPlayers = await playersResponse.json();
            
            const loadedPlayers = [];

            // Если игроков нет в админке, используем дефолтных
            const playersToLoad = apiPlayers.length > 0 ? apiPlayers : [
                { battleTag: "ZugZugMaster#1399", name: "ZugZugMaster", teamId: null },
                { battleTag: "ЖИВОТНОЕ#21901", name: "ЖИВОТНОЕ", teamId: null },
                { battleTag: "jabker#2902", name: "jabker", teamId: null }
            ];

            for (let i = 0; i < playersToLoad.length; i++) {
                const player = playersToLoad[i];
                const tag = player.battleTag;

                console.log(`Loading player ${i+1}/${playersToLoad.length}:`, {
                    battleTag: tag,
                    dbRace: player.race,
                    dbMmr: player.currentMmr,
                    teamId: player.teamId
                });

                try {
                    const response = await fetch(`${API_BASE}/api/matches/${encodeURIComponent(tag)}?gateway=20&season=23&pageSize=100`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const matchesData = await response.json();
                    console.log(`✅ Matches loaded for ${tag}: ${matchesData.count} matches`);

                    // processMatches now returns array of profiles (one per race)
                    const playerProfiles = processMatches(tag, matchesData.matches || []);
                    console.log(`Profiles created for ${tag}:`, playerProfiles.length);

                    // Create a card for each race profile
                    playerProfiles.forEach((profile, profileIndex) => {
                        const finalPlayer = {
                            id: `${player.id || (i + 1)}_${profile.race}`,
                            name: player.name || tag.split('#')[0],
                            battleTag: tag,
                            ...profile,
                            // Use race from profile
                            race: profile.race || player.race || 0,
                            // Use MMR from profile or DB
                            mmr: profile.mmr || player.currentMmr || 0,
                            teamId: player.teamId || null,
                        };

                        console.log(`Final player card for ${tag} - ${raceNames[profile.race]}:`, {
                            race: finalPlayer.race,
                            mmr: finalPlayer.mmr,
                            wins: finalPlayer.wins,
                            points: finalPlayer.points
                        });

                        loadedPlayers.push(finalPlayer);
                    });
                } catch (error) {
                    console.error(`❌ Error loading ${tag}:`, error);
                    // Use data from database when API fails
                    const fallbackPlayer = {
                        id: player.id || (i + 1),
                        name: player.name || tag.split('#')[0],
                        battleTag: tag,
                        race: player.race || 0,
                        mmr: player.currentMmr || 0,
                        wins: 0,
                        losses: 0,
                        points: 0,
                        achievements: [],
                        teamId: player.teamId || null,
                        matchHistory: [],
                        activityData: generateActivityData(),
                        error: true
                    };

                    console.log(`Using fallback data for ${tag}:`, {
                        race: fallbackPlayer.race,
                        mmr: fallbackPlayer.mmr
                    });

                    loadedPlayers.push(fallbackPlayer);
                }
            }
            setPlayers(loadedPlayers);
        } catch (error) {
            console.error('Error loading players:', error);
        } finally {
            setLoading(false);
        }
    };

    // Process matches from API and calculate points
    // Returns array of profiles - one per race played
    const processMatches = (battleTag, matches) => {
        if (!matches || matches.length === 0) {
            return [{
                race: 0,
                mmr: 0,
                wins: 0,
                losses: 0,
                points: 0,
                achievements: [],
                matchHistory: [],
                activityData: generateActivityData()
            }];
        }

        // Filter matches from November 27, 2025
        const cutoffDate = new Date('2025-11-27T00:00:00Z');
        const recentMatches = matches.filter(match => {
            const matchDate = new Date(match.startTime);
            return matchDate >= cutoffDate;
        });

        // Group matches by race
        const matchesByRace = {};
        const mmrByRace = {};

        recentMatches.forEach(match => {
            // Find player's team
            const playerTeam = match.teams.find(team =>
                team.players.some(p => p.battleTag === battleTag)
            );

            if (!playerTeam) {
                console.log(`Player ${battleTag} not found in match`);
                return;
            }

            const player = playerTeam.players.find(p => p.battleTag === battleTag);
            if (!player || !player.race) return;

            const race = player.race;

            // Initialize race data if not exists
            if (!matchesByRace[race]) {
                matchesByRace[race] = [];
                mmrByRace[race] = player.currentMmr || 0;
            }

            matchesByRace[race].push(match);
        });

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
                activityData: generateActivityData()
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
                const playerTeam = match.teams.find(team =>
                    team.players.some(p => p.battleTag === battleTag)
                );

                if (!playerTeam) return;

                const player = playerTeam.players.find(p => p.battleTag === battleTag);
                const opponentTeam = match.teams.find(team => team !== playerTeam);

                if (!player || !opponentTeam) return;

                const opponent = opponentTeam.players[0];
                const won = playerTeam.won;

                // Calculate MMR difference
                const playerMMR = player.oldMmr || player.currentMmr || 1500;
                const opponentMMR = opponent.oldMmr || opponent.currentMmr || 1500;
                const mmrDiff = opponentMMR - playerMMR;

                // Points calculation based on MMR difference
                let matchPoints = 0;

                if (won) {
                    wins++;
                    matchHistory.push({ result: 'win', mmrDiff, playerMMR, opponentMMR });

                    if (mmrDiff >= 20) {
                        matchPoints = 40 + Math.floor(mmrDiff / 10);
                    } else if (mmrDiff <= -20) {
                        matchPoints = 10 + Math.floor(Math.abs(mmrDiff) / 20);
                    } else {
                        matchPoints = 25;
                    }
                } else {
                    losses++;
                    matchHistory.push({ result: 'loss', mmrDiff, playerMMR, opponentMMR });
                    matchPoints = 0;
                }

                totalPoints += matchPoints;
            });

            // Determine achievements for this race
            const achs = determineAchievements(wins, losses, totalPoints, raceMatches.length, matchHistory);

            // Add achievement bonuses
            achs.forEach(achKey => {
                totalPoints += achievements[achKey].points;
            });

            console.log(`Profile for ${battleTag} - ${raceNames[raceInt]}:`, {
                wins,
                losses,
                points: totalPoints,
                mmr: mmrByRace[race]
            });

            profiles.push({
                race: raceInt,
                mmr: mmrByRace[race],
                wins: wins,
                losses: losses,
                points: totalPoints,
                achievements: achs,
                matchHistory: matchHistory.slice(0, 100).reverse(),
                activityData: generateActivityData()
            });
        }

        return profiles;
    };

    const determineAchievements = (wins, losses, points, totalGames, matchHistory = []) => {
        const achs = [];

        // Basic achievements
        if (wins >= 100) achs.push('centurion');
        if (wins >= 10) achs.push('gladiator');
        if (totalGames >= 500) achs.push('veteran');
        if (points >= 1000) achs.push('goldRush');

        // Analyze streaks (check last 10 matches)
        const recentMatches = matchHistory.slice(0, 10);

        // Check for 3+ win streak
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

        if (maxWinStreak >= 5) achs.push('winStreak5');
        else if (maxWinStreak >= 3) achs.push('winStreak3');

        // Check for 3+ loss streak
        let currentLossStreak = 0;
        for (const match of recentMatches) {
            if (match.result === 'loss') {
                currentLossStreak++;
                if (currentLossStreak >= 3) {
                    achs.push('loseStreak3');
                    break;
                }
            } else {
                currentLossStreak = 0;
            }
        }

        // Check for giant slayer (win against +50 MMR opponent)
        for (const match of recentMatches) {
            if (match.result === 'win' && match.mmrDiff >= 50) {
                achs.push('giantSlayer');
                break;
            }
        }

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
                <Nav 
                    activeTab={activeTab} 
                    setActiveTab={setActiveTab} 
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
            <Header />
            <Nav 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                isAdmin={isAdmin} 
                setShowLoginModal={setShowLoginModal} 
            />
            <div className="app">
                {activeTab === 'players' && <Players players={players} />}
                {activeTab === 'teams' && <Teams teams={teams} players={players} allPlayers={allPlayers} />}
                {activeTab === 'schedule' && <Schedule schedule={schedule} teams={teams} allPlayers={allPlayers} teamMatches={teamMatches} />}
                {activeTab === 'stats' && <Stats players={players} teams={teams} />}
                {activeTab === 'team-matches' && <TeamMatches teamMatches={teamMatches} teams={teams} allPlayers={allPlayers} />}
                {activeTab === 'rules' && <Rules />}
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
                            setActiveTab('players');
                        }}
                    />
                )}
            </div>
            {showLoginModal && (
                <LoginModal 
                    onClose={() => {
                        console.log('Closing login modal');
                        setShowLoginModal(false);
                    }}
                    onSuccess={(newSessionId) => {
                        console.log('Login successful, sessionId:', newSessionId);
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
                <img
                    src="/images/banner.png"
                    alt="Welcome to BNL - Warcraft Battle Newbie League"
                    style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        borderRadius: '15px',
                        boxShadow: '0 10px 40px rgba(201, 169, 97, 0.3)'
                    }}
                    onError={(e) => {
                        // Fallback to text if image not found
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'block';
                    }}
                />
                <div style={{ display: 'none' }}>
                    <h1 className="league-title">CURRENT BNL</h1>
                    <div style={{ color: '#888', marginTop: '10px' }}>📅 Season 23 • Starting Nov 27, 2025</div>
                </div>
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
                <button className={`nav-btn ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>📜 Правила</button>
                {isAdmin ? (
                    <button className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>⚙️ Админка</button>
                ) : (
                    <button className="nav-btn" onClick={() => {
                        console.log('Login button clicked, showLoginModal will be set to true');
                        setShowLoginModal(true);
                    }}>🔐 Вход</button>
                )}
            </div>
        </div>
    );
}

function Rules() {
    return (
        <div>
            <h2 style={{ fontSize: '2.5em', marginBottom: '30px', color: '#c9a961', textAlign: 'center' }}>
                📜 Правила Battle Newbie League
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
                            <li style={{ marginBottom: '10px' }}>
                                <strong style={{ color: '#c9a961' }}>Бонус</strong> — дополнительные очки за каждую ачивку
                            </li>
                        </ul>
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
    // Sort by points (descending)
    const sortedPlayers = [...players].sort((a, b) => (b.points || 0) - (a.points || 0));

    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>Профили игроков</h2>
            <div className="players-grid">
                {sortedPlayers.map((player, index) => (
                    <PlayerCard
                        key={player.id}
                        player={player}
                        rank={index + 1}
                        onClick={() => setSelectedPlayer(player)}
                    />
                ))}
            </div>
            {selectedPlayer && (
                <PlayerDetailModal
                    player={selectedPlayer}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
        </div>
    );
}

function PlayerCard({ player, rank, onClick }) {
    const raceImage = raceImages[player.race];

    // Debug logging
    React.useEffect(() => {
        console.log(`PlayerCard for ${player.name}:`, {
            race: player.race,
            raceName: raceNames[player.race],
            raceImage: raceImage,
            hasImage: !!raceImage
        });
    }, [player.race]);

    const hasQualified = (player.points || 0) >= 500;

    return (
        <div className="player-card" onClick={onClick} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
            {hasQualified && (
                <div
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '-35px',
                        background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                        color: '#fff',
                        padding: '5px 45px',
                        transform: 'rotate(45deg)',
                        fontSize: '0.75em',
                        fontWeight: '800',
                        zIndex: 10,
                        boxShadow: '0 2px 10px rgba(76, 175, 80, 0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}
                    title="Поздравляем! Вы прошли во второй тур! Администратор скоро назначит вам команду."
                >
                    ✓ QUALIFIED
                </div>
            )}
            <div className="player-card-inner">
                <div className="player-header">
                    <div className="player-title">
                        <div className="player-avatar">
                            {raceImage ? (
                                <img src={raceImage} alt={raceNames[player.race] || 'Race'} onError={(e) => {
                                    console.error(`Failed to load image for ${player.name}:`, raceImage);
                                    e.target.style.display = 'none';
                                }} />
                            ) : (
                                <span>{raceIcons[player.race] || '🎲'}</span>
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
                        <div className="rating-stars">
                            {[...Array(5)].map((_, i) => (
                                <span key={i} style={{ color: '#c9a961', fontSize: '1.3em' }}>⭐</span>
                            ))}
                        </div>
                    </div>
                </div>

                {player.achievements && player.achievements.length > 0 && (
                    <div className="achievement-icons" style={{
                        display: 'flex',
                        gap: '8px',
                        padding: '10px 15px',
                        flexWrap: 'wrap',
                        borderTop: '1px solid rgba(201, 169, 97, 0.2)',
                        borderBottom: '1px solid rgba(201, 169, 97, 0.2)',
                        margin: '10px 0'
                    }}>
                        {player.achievements.map(achKey => {
                            const ach = achievements[achKey];
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
                    </div>
                )}

                {player.matchHistory && player.matchHistory.length > 0 && (
                    <div className="match-graph">
                        {player.matchHistory.slice(0, 20).map((match, idx) => {
                            const result = typeof match === 'string' ? match : match.result;
                            const height = 20 + Math.random() * 60;
                            return <div key={idx} className={`match-bar ${result}`} style={{ height: `${height}px` }} />;
                        })}
                    </div>
                )}

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
            </div>
        </div>
    );
}

function Teams({ teams, players, allPlayers }) {
    const [expandedTeam, setExpandedTeam] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    const getTeamPlayers = (teamId) => players.filter(p => p.teamId === teamId);
    const getTeamLeader = (teamId) => {
        const teamPlayers = getTeamPlayers(teamId);
        return teamPlayers.reduce((leader, player) => (player.points || 0) > (leader?.points || 0) ? player : leader, null);
    };

    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>Команды</h2>
            {teams.map(team => {
                const teamPlayers = getTeamPlayers(team.id);
                const leader = getTeamLeader(team.id);
                const captain = players.find(p => p.id === team.captainId) || allPlayers.find(p => p.id === team.captainId);
                const coaches = (team.coaches || []).map(coachId => {
                    return players.find(p => p.id === coachId) || allPlayers.find(p => p.id === coachId);
                }).filter(Boolean);
                const totalPoints = teamPlayers.reduce((sum, p) => sum + (p.points || 0), 0);

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
                                            width: '60px',
                                            height: '60px',
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
                                                {raceNames[captain.race] || 'Random'} • {captain.mmr} MMR • {captain.points} pts
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
                                                    {raceNames[coach.race] || 'Random'} • {coach.mmr} MMR • {coach.points} pts
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="member-section">
                                <div className="section-title">⚔️ Игроки</div>
                                {teamPlayers.map(player => (
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
                                                {raceNames[player.race] || 'Random'} • {player.mmr} MMR • {player.points} pts
                                            </span>
                                        </div>
                                        {leader && player.id === leader.id && (
                                            <span className="leader-badge">👑 LEADER</span>
                                        )}
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
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
        </div>
    );
}

function Schedule({ schedule, teams, allPlayers, teamMatches }) {
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
        return colors[index % colors.length];
    };

    // Calculate team points from completed matches
    const teamPoints = {};
    teams.forEach(team => {
        teamPoints[team._id || team.id] = 0;
    });
    
    teamMatches.filter(m => m.status === 'completed').forEach(match => {
        if (match.winnerId && teamPoints[match.winnerId] !== undefined) {
            teamPoints[match.winnerId] += match.points || 0;
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
            if (match.winnerId === match.team1Id) {
                matchesByTeams[key].team1Points += match.points || 0;
            } else if (match.winnerId === match.team2Id) {
                matchesByTeams[key].team2Points += match.points || 0;
            }
        }
    });
    
    const getPlayerName = (playerId) => {
        const player = allPlayers.find(p => (p._id || p.id) === playerId);
        return player ? player.name : 'Unknown';
    };
    
    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>Расписание матчей</h2>
            
            {Object.values(matchesByTeams).map((matchup, idx) => {
                const totalPoints = matchup.team1Points + matchup.team2Points;
                const team1Percent = totalPoints > 0 ? (matchup.team1Points / totalPoints) * 100 : 50;
                const team2Percent = totalPoints > 0 ? (matchup.team2Points / totalPoints) * 100 : 50;

                // Get team colors
                const team1Color = getTeamColor(matchup.team1?._id || matchup.team1?.id);
                const team2Color = getTeamColor(matchup.team2?._id || matchup.team2?.id);

                return (
                    <div key={idx} style={{ marginBottom: '40px' }}>
                        {/* Team vs Team Header */}
                        <div style={{
                            background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                            marginBottom: '15px', border: '2px solid #c9a961'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div style={{ flex: 1, textAlign: 'center' }}>
                                    {matchup.team1?.logo ? (
                                        <img
                                            src={matchup.team1.logo}
                                            alt={matchup.team1.name}
                                            style={{
                                                width: '80px',
                                                height: '80px',
                                                borderRadius: '10px',
                                                objectFit: 'cover',
                                                margin: '0 auto 10px'
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextElementSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : null}
                                    <div style={{ fontSize: '2em', marginBottom: '10px', display: matchup.team1?.logo ? 'none' : 'block' }}>{matchup.team1?.emoji}</div>
                                    <div style={{ fontSize: '1.3em', fontWeight: '700', color: '#fff' }}>
                                        {matchup.team1?.name}
                                    </div>
                                    <div style={{ color: '#c9a961', fontSize: '1.5em', fontWeight: '800', marginTop: '10px' }}>
                                        {matchup.team1Points}
                                    </div>
                                </div>
                                <div style={{ fontSize: '2em', fontWeight: '800', color: '#c9a961', padding: '0 30px' }}>
                                    VS
                                </div>
                                <div style={{ flex: 1, textAlign: 'center' }}>
                                    {matchup.team2?.logo ? (
                                        <img
                                            src={matchup.team2.logo}
                                            alt={matchup.team2.name}
                                            style={{
                                                width: '80px',
                                                height: '80px',
                                                borderRadius: '10px',
                                                objectFit: 'cover',
                                                margin: '0 auto 10px'
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextElementSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : null}
                                    <div style={{ fontSize: '2em', marginBottom: '10px', display: matchup.team2?.logo ? 'none' : 'block' }}>{matchup.team2?.emoji}</div>
                                    <div style={{ fontSize: '1.3em', fontWeight: '700', color: '#fff' }}>
                                        {matchup.team2?.name}
                                    </div>
                                    <div style={{ color: '#c9a961', fontSize: '1.5em', fontWeight: '800', marginTop: '10px' }}>
                                        {matchup.team2Points}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Points Bar */}
                            <div style={{ display: 'flex', height: '30px', borderRadius: '15px', overflow: 'hidden', marginBottom: '10px' }}>
                                <div style={{
                                    width: `${team1Percent}%`,
                                    background: `linear-gradient(90deg, ${team1Color.primary}, ${team1Color.secondary})`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: '700',
                                    fontSize: '0.9em'
                                }}>
                                    {matchup.team1Points > 0 && `${matchup.team1Points} pts`}
                                </div>
                                <div style={{
                                    width: `${team2Percent}%`,
                                    background: `linear-gradient(90deg, ${team2Color.primary}, ${team2Color.secondary})`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: '700',
                                    fontSize: '0.9em'
                                }}>
                                    {matchup.team2Points > 0 && `${matchup.team2Points} pts`}
                                </div>
                            </div>
                        </div>
                        
                        {/* Individual Matches */}
                        {matchup.matches.map(match => (
                            <div key={match._id || match.id} style={{
                                background: '#2a2a2a', padding: '15px', borderRadius: '10px',
                                marginBottom: '10px', border: `1px solid ${match.status === 'upcoming' ? '#c9a961' : '#333'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            color: match.winnerId === match.team1Id ? '#4caf50' : '#888',
                                            fontWeight: match.winnerId === match.team1Id ? '700' : '400'
                                        }}>
                                            {getPlayerName(match.player1Id)}
                                            {match.winnerId === match.team1Id && ' ✅'}
                                        </div>
                                    </div>
                                    <div style={{ padding: '0 20px' }}>
                                        <div style={{
                                            padding: '5px 15px',
                                            background: match.status === 'upcoming' ? '#c9a961' : '#333',
                                            color: match.status === 'upcoming' ? '#000' : '#fff',
                                            borderRadius: '20px',
                                            fontSize: '0.9em',
                                            fontWeight: '600'
                                        }}>
                                            {match.status === 'upcoming' ? '🕐 Предстоит' : `+${match.points} pts`}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'right' }}>
                                        <div style={{
                                            color: match.winnerId === match.team2Id ? '#4caf50' : '#888',
                                            fontWeight: match.winnerId === match.team2Id ? '700' : '400'
                                        }}>
                                            {match.winnerId === match.team2Id && '✅ '}
                                            {getPlayerName(match.player2Id)}
                                        </div>
                                    </div>
                                </div>
                                {match.scheduledDate && (
                                    <div style={{ color: '#888', fontSize: '0.85em', marginTop: '10px', textAlign: 'center' }}>
                                        📅 {new Date(match.scheduledDate).toLocaleString('ru-RU')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                );
            })}
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
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>Статистика лиги</h2>

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
function PlayerDetailModal({ player, onClose }) {
    const totalGames = (player.wins || 0) + (player.losses || 0);
    const winRate = totalGames > 0 ? ((player.wins || 0) / totalGames * 100).toFixed(1) : 0;

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
                        {raceImages[player.race] && (
                            <img
                                src={raceImages[player.race]}
                                alt={raceNames[player.race]}
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

ReactDOM.render(<App />, document.getElementById('root'));
