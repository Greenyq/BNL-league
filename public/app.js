const { useState, useEffect } = React;

// Race icons
const raceIcons = {
    human: '👑', hu: '👑',
    orc: '⚔️',
    undead: '💀', ud: '💀',
    nightelf: '🌙', ne: '🌙',
    random: '🎲'
};

// Achievements
const achievements = {
    winStreak3: { icon: "🔥", name: "On Fire", desc: "3 wins in a row", points: 15 },
    centurion: { icon: "💯", name: "Centurion", desc: "100 total wins", points: 50 },
    gladiator: { icon: "🏛️", name: "Gladiator", desc: "Win 10 games this week", points: 20 },
    goldRush: { icon: "💰", name: "Gold Rush", desc: "Earn 1000 points", points: 30 },
    veteran: { icon: "🎖️", name: "Veteran", desc: "500 total games", points: 35 },
};

// API Base URL
const API_BASE = '';  // Same server

function App() {
    const [activeTab, setActiveTab] = useState('players');
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [teams] = useState([
        {
            id: 1,
            name: "Chinese Panda",
            emoji: "🐼",
            coaches: [
                { id: 101, name: "RobotNinja", expertise: "Night Elf" },
                { id: 102, name: "Daedalius", expertise: "Orc" }
            ]
        },
        {
            id: 2,
            name: "Elite Warriors",
            emoji: "⚔️",
            coaches: [
                { id: 103, name: "MasterCoach", expertise: "Human" }
            ]
        }
    ]);
    
    const [schedule] = useState([
        { id: 1, team1: "Chinese Panda", team2: "Elite Warriors", date: "2025-12-01 18:00", status: "upcoming" },
        { id: 2, team1: "Chinese Panda", team2: "Elite Warriors", date: "2025-11-28 20:00", status: "live" }
    ]);

    useEffect(() => {
        loadPlayers();
    }, []);

    const loadPlayers = async () => {
        const battleTags = [
            "ZugZugMaster#1399",
            "ЖИВОТНОЕ#21901",
            "jabker#2902"
        ];

        const loadedPlayers = [];

        for (let i = 0; i < battleTags.length; i++) {
            const tag = battleTags[i];
            
            try {
                const response = await fetch(`${API_BASE}/api/player/${encodeURIComponent(tag)}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }
                
                const playerData = await response.json();
                
                loadedPlayers.push({
                    id: i + 1,
                    name: tag.split('#')[0],
                    battleTag: tag,
                    race: playerData.selectedRace || 'random',
                    mmr: playerData.mmr || 1500,
                    wins: playerData.wins || 0,
                    losses: playerData.losses || 0,
                    achievements: determineAchievements(playerData.wins || 0, playerData.losses || 0),
                    teamId: i < 2 ? 1 : 2,
                    matchHistory: generateMatchHistory(playerData.wins || 0, playerData.losses || 0),
                    activityData: generateActivityData()
                });
            } catch (error) {
                console.error(`Error loading ${tag}:`, error);
                setError(`Failed to load data for ${tag}`);
            }
        }

        setPlayers(loadedPlayers);
        setLoading(false);
    };

    const determineAchievements = (wins, losses) => {
        const achs = [];
        if (wins >= 100) achs.push('centurion');
        if (wins >= 150) achs.push('gladiator');
        if (wins + losses >= 500) achs.push('veteran');
        if (wins * 10 >= 1000) achs.push('goldRush');
        return achs;
    };

    const generateMatchHistory = (wins, losses) => {
        const total = wins + losses;
        const history = [];
        for (let i = 0; i < Math.min(total, 100); i++) {
            history.push(Math.random() < (wins / total) ? 'win' : 'loss');
        }
        return history;
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
                <Nav activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="app">
                    <div className="loading">⚔️ Загрузка данных с W3Champions...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <Header />
                <Nav activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="app">
                    <div className="error">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Header />
            <Nav activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="app">
                {activeTab === 'players' && <Players players={players} />}
                {activeTab === 'teams' && <Teams teams={teams} players={players} />}
                {activeTab === 'schedule' && <Schedule schedule={schedule} />}
                {activeTab === 'stats' && <Stats players={players} teams={teams} />}
            </div>
        </div>
    );
}

function Header() {
    return (
        <div className="header">
            <div className="header-content">
                <h1 className="league-title">CURRENT GNL</h1>
            </div>
        </div>
    );
}

function Nav({ activeTab, setActiveTab }) {
    return (
        <div className="nav">
            <div className="nav-container">
                <button className={`nav-btn ${activeTab === 'players' ? 'active' : ''}`} onClick={() => setActiveTab('players')}>Игроки</button>
                <button className={`nav-btn ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>Команды</button>
                <button className={`nav-btn ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Расписание</button>
                <button className={`nav-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Статистика</button>
            </div>
        </div>
    );
}

function Players({ players }) {
    const calculatePoints = (player) => {
        let points = player.wins * 10 - player.losses * 5;
        player.achievements.forEach(achKey => {
            points += achievements[achKey].points;
        });
        return points;
    };

    const sortedPlayers = [...players].sort((a, b) => calculatePoints(b) - calculatePoints(a));

    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>Профили игроков</h2>
            {sortedPlayers.map((player, index) => (
                <PlayerCard key={player.id} player={player} totalPoints={calculatePoints(player)} rank={index + 1} />
            ))}
        </div>
    );
}

function PlayerCard({ player, totalPoints, rank }) {
    return (
        <div className="player-card">
            <div className="player-card-inner">
                <div className="player-header">
                    <div className="player-title">
                        <div className="player-avatar">
                            {raceIcons[player.race.toLowerCase()] || '🎲'}
                        </div>
                        <div>
                            <div className="player-name">
                                {player.name}
                                <div className="battle-tag">{player.battleTag}</div>
                            </div>
                        </div>
                    </div>
                    <div className="rank-mmr">
                        <div className="rank-label">Rank</div>
                        <div className="rank-number">#{rank}</div>
                        <div className="mmr-display">{player.mmr} MMR</div>
                        <div className="rating-stars">
                            {[...Array(5)].map((_, i) => (
                                <span key={i} style={{ color: '#c9a961', fontSize: '1.3em' }}>⭐</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="achievement-icons">
                    {player.achievements.map(achKey => {
                        const ach = achievements[achKey];
                        return (
                            <div key={achKey} className="achievement-icon">
                                {ach.icon}
                                <div className="achievement-tooltip">
                                    <div style={{ fontWeight: '700' }}>{ach.name}</div>
                                    <div style={{ color: '#4caf50' }}>+{ach.points} pts</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="match-graph">
                    {player.matchHistory.map((result, idx) => {
                        const height = 30 + Math.random() * 120;
                        return <div key={idx} className={`match-bar ${result}`} style={{ height: `${height}px` }} />;
                    })}
                </div>

                <div className="points-section">
                    <div className="points-value">{totalPoints}</div>
                    <div className="points-label">⚔️ points</div>
                </div>

                <div className="win-loss-stats">
                    <div className="stat-box wins">
                        <div className="stat-icon">🗡️</div>
                        <div className="stat-value">{player.wins}</div>
                        <div className="stat-label">Wins</div>
                    </div>
                    <div className="stat-box losses">
                        <div className="stat-icon">💀</div>
                        <div className="stat-value">{player.losses}</div>
                        <div className="stat-label">Losses</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Teams({ teams, players }) {
    const [expandedTeam, setExpandedTeam] = useState(null);

    const calculatePoints = (player) => {
        let points = player.wins * 10 - player.losses * 5;
        player.achievements.forEach(achKey => {
            points += achievements[achKey].points;
        });
        return points;
    };

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
                const totalPoints = teamPlayers.reduce((sum, p) => sum + calculatePoints(p), 0);

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
                                                {player.race.toUpperCase()} • {player.mmr} MMR
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
    const calculatePoints = (player) => {
        let points = player.wins * 10 - player.losses * 5;
        player.achievements.forEach(achKey => {
            points += achievements[achKey].points;
        });
        return points;
    };

    const totalGames = players.reduce((sum, p) => sum + p.wins + p.losses, 0);
    
    const teamStats = teams.map(team => {
        const teamPlayers = players.filter(p => p.teamId === team.id);
        const points = teamPlayers.reduce((sum, p) => sum + calculatePoints(p), 0);
        const games = teamPlayers.reduce((sum, p) => sum + p.wins + p.losses, 0);
        return { ...team, points, games };
    }).sort((a, b) => b.points - a.points);

    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>Статистика лиги</h2>
            
            <div className="team-stats-section">
                <div className="total-games">{totalGames} GNL LADDER GAMES WERE PLAYED THIS SEASON!</div>
                <div style={{ fontSize: '2em', fontWeight: '800', textAlign: 'center', marginBottom: '30px', background: 'linear-gradient(135deg, #f4e4b8 0%, #c9a961 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    CURRENT GNL LADDER GODS
                </div>

                {teamStats.map((team, idx) => (
                    <div key={team.id} className="team-bar-container">
                        <div className="team-name-label">
                            <span style={{ fontWeight: '800', fontSize: '1.2em' }}>#{idx + 1} {team.name}</span>
                            <span style={{ color: '#888' }}>{team.games} games</span>
                        </div>
                        <div className="team-bar" style={{ width: `${(team.points / teamStats[0].points) * 100}%` }}>
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
