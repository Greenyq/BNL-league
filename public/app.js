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
    1: '/images/human.jpg',
    2: '/images/orc.jpg',
    4: '/images/nightelf.jpg',
    8: '/images/undead.jpg',
};

// Achievements
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

                    const playerStats = processMatches(tag, matchesData.matches || []);
                    console.log(`Stats processed for ${tag}:`, { 
                        statsRace: playerStats.race, 
                        statsMmr: playerStats.mmr,
                        wins: playerStats.wins,
                        losses: playerStats.losses 
                    });

                    const finalPlayer = {
                        id: player.id || (i + 1),
                        name: player.name || tag.split('#')[0],
                        battleTag: tag,
                        ...playerStats,
                        // Use race from DB if processMatches returned 0 (Random) or undefined
                        race: playerStats.race || player.race || 0,
                        // Use MMR from DB if API didn't return valid MMR
                        mmr: playerStats.mmr || player.currentMmr || 0,
                        teamId: player.teamId || null,
                    };
                    
                    console.log(`Final player data for ${tag}:`, {
                        race: finalPlayer.race,
                        mmr: finalPlayer.mmr,
                        wins: finalPlayer.wins
                    });
                    
                    loadedPlayers.push(finalPlayer);
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
    const processMatches = (battleTag, matches) => {
        if (!matches || matches.length === 0) {
            return {
                race: 0,
                mmr: 0,
                wins: 0,
                losses: 0,
                points: 0,
                achievements: [],
                matchHistory: [],
                activityData: generateActivityData()
            };
        }

        // Filter matches from November 27, 2025
        const cutoffDate = new Date('2025-11-27T00:00:00Z');
        const recentMatches = matches.filter(match => {
            const matchDate = new Date(match.startTime);
            return matchDate >= cutoffDate;
        });

        let wins = 0;
        let losses = 0;
        let totalPoints = 0;
        let currentMMR = 0;
        let playerRace = 0;
        const matchHistory = [];
        const raceCounts = {}; // Track race usage frequency

        // Get current MMR from the most recent match (first in array)
        if (recentMatches.length > 0) {
            const firstMatch = recentMatches[0];
            const firstPlayerTeam = firstMatch.teams.find(team =>
                team.players.some(p => p.battleTag === battleTag)
            );
            if (firstPlayerTeam) {
                const firstPlayer = firstPlayerTeam.players.find(p => p.battleTag === battleTag);
                if (firstPlayer) {
                    currentMMR = firstPlayer.currentMmr || 0;
                    console.log(`Current MMR for ${battleTag}: ${currentMMR}`);
                }
            }
        }

        // Process each match
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
            const opponentTeam = match.teams.find(team => team !== playerTeam);

            if (!player || !opponentTeam) return;

            const opponent = opponentTeam.players[0];
            const won = playerTeam.won;

            // Track race usage
            if (player.race) {
                raceCounts[player.race] = (raceCounts[player.race] || 0) + 1;
            }

            // Calculate MMR difference (note: API uses camelCase)
            const playerMMR = player.oldMmr || player.currentMmr || 1500;
            const opponentMMR = opponent.oldMmr || opponent.currentMmr || 1500;
            const mmrDiff = opponentMMR - playerMMR;

            // Points calculation based on MMR difference
            let matchPoints = 0;

            if (won) {
                wins++;
                matchHistory.push('win');

                if (mmrDiff >= 20) {
                    // Opponent stronger (+20-30 MMR)
                    matchPoints = 40 + Math.floor(mmrDiff / 10); // 40-50 points
                } else if (mmrDiff <= -20) {
                    // Opponent weaker (-20-30 MMR)
                    matchPoints = 10 + Math.floor(Math.abs(mmrDiff) / 20); // 10-20 points
                } else {
                    // Similar MMR (±20)
                    matchPoints = 25; // 25 points
                }
            } else {
                losses++;
                matchHistory.push('loss');
                matchPoints = 0; // No points for losses
            }

            totalPoints += matchPoints;
        });

        // Determine most played race
        let mostPlayedRace = 0;
        let maxCount = 0;
        for (const [race, count] of Object.entries(raceCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostPlayedRace = parseInt(race);
            }
        }
        playerRace = mostPlayedRace;
        console.log(`Most played race for ${battleTag}:`, playerRace, raceNames[playerRace]);

        // Determine achievements
        const achs = determineAchievements(wins, losses, totalPoints, recentMatches.length);

        // Add achievement bonuses
        achs.forEach(achKey => {
            totalPoints += achievements[achKey].points;
        });

        return {
            race: playerRace,
            mmr: currentMMR,
            wins: wins,
            losses: losses,
            points: totalPoints,
            achievements: achs,
            matchHistory: matchHistory.slice(0, 100).reverse(), // Latest 100 matches
            activityData: generateActivityData()
        };
    };

    const determineAchievements = (wins, losses, points, totalGames) => {
        const achs = [];
        if (wins >= 100) achs.push('centurion');
        if (wins >= 10) achs.push('gladiator');
        if (totalGames >= 500) achs.push('veteran');
        if (points >= 1000) achs.push('goldRush');
        // Can add winStreak detection by analyzing matchHistory
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
                <h1 className="league-title">CURRENT BNL</h1>
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
                    <button className="nav-btn" onClick={() => {
                        console.log('Login button clicked, showLoginModal will be set to true');
                        setShowLoginModal(true);
                    }}>🔐 Вход</button>
                )}
            </div>
        </div>
    );
}

function Players({ players }) {
    // Sort by points (descending)
    const sortedPlayers = [...players].sort((a, b) => (b.points || 0) - (a.points || 0));

    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>Профили игроков</h2>
            <div className="players-grid">
                {sortedPlayers.map((player, index) => (
                    <PlayerCard key={player.id} player={player} rank={index + 1} />
                ))}
            </div>
        </div>
    );
}

function PlayerCard({ player, rank }) {
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
    
    return (
        <div className="player-card">
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
                            <div className="player-name">{player.name}</div>
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

                <div className="achievement-icons">
                    {player.achievements && player.achievements.map(achKey => {
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

                {player.matchHistory && player.matchHistory.length > 0 && (
                    <div className="match-graph">
                        {player.matchHistory.map((result, idx) => {
                            const height = 30 + Math.random() * 120;
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

function Teams({ teams, players }) {
    const [expandedTeam, setExpandedTeam] = useState(null);

    const getTeamPlayers = (teamId) => players.filter(p => p.teamId === teamId);
    const getTeamLeader = (teamId) => {
        const teamPlayers = getTeamPlayers(teamId);
        return teamPlayers.reduce((leader, player) => player.mmr > (leader?.mmr || 0) ? player : leader, null);
    };

    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>Команды</h2>
            {teams.map(team => {
                const teamPlayers = getTeamPlayers(team.id);
                const leader = getTeamLeader(team.id);
                const captain = teamPlayers[0];
                const totalPoints = teamPlayers.reduce((sum, p) => sum + (p.points || 0), 0);

                return (
                    <div key={team.id} className="team-card" onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}>
                        <div className="team-header">
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span className="team-emoji">{team.emoji}</span>
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
                                    <div className="member-item">
                                        <div>
                                            <span className="member-role-badge">CAPTAIN</span>
                                            <span style={{ fontWeight: '700', fontSize: '1.1em' }}>{captain.name}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="member-section">
                                <div className="section-title">🎓 Тренеры</div>
                                {team.coaches.map(coach => (
                                    <div key={coach.id} className="member-item">
                                        <div>
                                            <span className="member-role-badge">COACH</span>
                                            <span style={{ fontWeight: '700', fontSize: '1.1em' }}>{coach.name}</span>
                                        </div>
                                        <span style={{ color: '#888' }}>Expertise: {coach.expertise}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="member-section">
                                <div className="section-title">⚔️ Игроки</div>
                                {teamPlayers.map(player => (
                                    <div key={player.id} className="member-item">
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
        </div>
    );
}

function Schedule({ schedule }) {
    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>Расписание матчей</h2>
            {schedule.map(match => (
                <div key={match.id} className="match-item">
                    <div className="match-header-schedule">
                        <div style={{ color: '#888' }}>📅 {match.date}</div>
                        <div className={`match-status status-${match.status}`}>
                            {match.status === 'upcoming' && 'Предстоит'}
                            {match.status === 'live' && '🔴 LIVE'}
                        </div>
                    </div>
                    <div className="match-teams">
                        <div className="team-name-match">{match.team1}</div>
                        <div className="vs-text">VS</div>
                        <div className="team-name-match">{match.team2}</div>
                    </div>
                </div>
            ))}
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
                            <span style={{ fontWeight: '800', fontSize: '1.2em' }}>#{idx + 1} {team.name}</span>
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

ReactDOM.render(<App />, document.getElementById('root'));
