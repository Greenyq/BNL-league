// Login Modal Component
function LoginModal({ onClose, onSuccess }) {
    const [login, setLogin] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                onSuccess(data.sessionId);
            } else {
                setError('Неверный логин или пароль');
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
                background: '#1a1a1a', padding: '40px', borderRadius: '15px',
                maxWidth: '400px', width: '90%', border: '2px solid #c9a961'
            }}>
                <h2 style={{ color: '#c9a961', marginBottom: '20px', textAlign: 'center' }}>
                    🔐 Вход в админ панель
                </h2>
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Логин</label>
                        <input
                            type="text"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                border: '1px solid #444', background: '#2a2a2a',
                                color: '#fff', fontSize: '16px'
                            }}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Пароль</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                border: '1px solid #444', background: '#2a2a2a',
                                color: '#fff', fontSize: '16px'
                            }}
                            required
                        />
                    </div>
                    {error && (
                        <div style={{
                            padding: '12px', background: '#f44336', color: '#fff',
                            borderRadius: '8px', marginBottom: '20px', textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '8px',
                                border: '1px solid #444', background: '#2a2a2a',
                                color: '#fff', cursor: 'pointer', fontSize: '16px'
                            }}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '8px',
                                border: 'none', background: '#c9a961',
                                color: '#000', cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '16px', fontWeight: '600'
                            }}
                        >
                            {loading ? 'Вход...' : 'Войти'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Team Matches Page Component
function TeamMatches({ teamMatches, teams, allPlayers }) {
    // Calculate team rankings based on custom points
    const teamRankings = React.useMemo(() => {
        const rankings = {};
        
        teams.forEach(team => {
            rankings[team.id] = {
                team: team,
                totalPoints: 0,
                wins: 0,
                losses: 0,
                matches: 0
            };
        });

        teamMatches.forEach(match => {
            if (match.team1Id && rankings[match.team1Id]) {
                rankings[match.team1Id].matches++;
                if (match.winnerId === match.team1Id) {
                    rankings[match.team1Id].wins++;
                    rankings[match.team1Id].totalPoints += match.points || 0;
                } else if (match.winnerId === match.team2Id) {
                    rankings[match.team1Id].losses++;
                }
            }
            
            if (match.team2Id && rankings[match.team2Id]) {
                rankings[match.team2Id].matches++;
                if (match.winnerId === match.team2Id) {
                    rankings[match.team2Id].wins++;
                    rankings[match.team2Id].totalPoints += match.points || 0;
                } else if (match.winnerId === match.team1Id) {
                    rankings[match.team2Id].losses++;
                }
            }
        });

        return Object.values(rankings).sort((a, b) => b.totalPoints - a.totalPoints);
    }, [teamMatches, teams]);

    const getPlayerName = (playerId) => {
        const player = allPlayers.find(p => p.id === playerId);
        return player ? player.name : 'Unknown';
    };

    const getTeamName = (teamId) => {
        const team = teams.find(t => t.id === teamId);
        return team ? team.name : 'Unknown';
    };

    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>
                ⚔️ Командные матчи - Рейтинг
            </h2>
            
            <div style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.5em', marginBottom: '20px', color: '#c9a961' }}>
                    🏆 Рейтинг команд (Custom Points)
                </h3>
                {teamRankings.map((ranking, index) => (
                    <div key={ranking.team.id} style={{
                        background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
                        padding: '20px', borderRadius: '15px', marginBottom: '15px',
                        border: index === 0 ? '2px solid #c9a961' : '1px solid #333'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <span style={{ fontSize: '2em', fontWeight: '800', color: '#c9a961' }}>
                                    #{index + 1}
                                </span>
                                <span style={{ fontSize: '2em' }}>{ranking.team.emoji}</span>
                                <div>
                                    <div style={{ fontSize: '1.3em', fontWeight: '700', color: '#fff' }}>
                                        {ranking.team.name}
                                    </div>
                                    <div style={{ color: '#888', marginTop: '5px' }}>
                                        {ranking.wins}W - {ranking.losses}L • {ranking.matches} матчей
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '2em', fontWeight: '800', color: '#c9a961' }}>
                                    {ranking.totalPoints}
                                </div>
                                <div style={{ color: '#888', fontSize: '0.9em' }}>очков</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div>
                <h3 style={{ fontSize: '1.5em', marginBottom: '20px', color: '#c9a961' }}>
                    📜 История матчей
                </h3>
                {teamMatches.length === 0 && (
                    <div style={{
                        padding: '40px', textAlign: 'center', color: '#888',
                        background: '#1a1a1a', borderRadius: '15px'
                    }}>
                        Матчей пока нет
                    </div>
                )}
                {teamMatches.slice().reverse().map(match => {
                    const team1 = teams.find(t => t.id === match.team1Id);
                    const team2 = teams.find(t => t.id === match.team2Id);
                    const isTeam1Winner = match.winnerId === match.team1Id;
                    
                    return (
                        <div key={match.id} style={{
                            background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                            marginBottom: '15px', border: '1px solid #333'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div style={{ color: '#888', fontSize: '0.9em' }}>
                                    {new Date(match.createdAt).toLocaleDateString('ru-RU')}
                                </div>
                                <div style={{
                                    padding: '5px 15px', background: '#c9a961',
                                    color: '#000', borderRadius: '20px', fontWeight: '600'
                                }}>
                                    +{match.points} pts
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1, textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>{team1?.emoji}</div>
                                    <div style={{
                                        fontWeight: isTeam1Winner ? '700' : '400',
                                        color: isTeam1Winner ? '#4caf50' : '#888',
                                        marginBottom: '5px'
                                    }}>
                                        {team1?.name || 'Unknown'}
                                    </div>
                                    <div style={{ color: '#c9a961', fontSize: '0.9em' }}>
                                        {getPlayerName(match.player1Id)}
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '2em', fontWeight: '800', color: '#c9a961',
                                    padding: '0 30px'
                                }}>
                                    VS
                                </div>
                                <div style={{ flex: 1, textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>{team2?.emoji}</div>
                                    <div style={{
                                        fontWeight: !isTeam1Winner ? '700' : '400',
                                        color: !isTeam1Winner ? '#4caf50' : '#888',
                                        marginBottom: '5px'
                                    }}>
                                        {team2?.name || 'Unknown'}
                                    </div>
                                    <div style={{ color: '#c9a961', fontSize: '0.9em' }}>
                                        {getPlayerName(match.player2Id)}
                                    </div>
                                </div>
                            </div>
                            {match.notes && (
                                <div style={{
                                    marginTop: '15px', padding: '10px', background: '#2a2a2a',
                                    borderRadius: '8px', color: '#888', fontSize: '0.9em'
                                }}>
                                    📝 {match.notes}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Admin Panel Component
function AdminPanel({ teams, allPlayers, teamMatches, sessionId, onUpdate }) {
    const [activeSection, setActiveSection] = React.useState('teams');

    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>
                ⚙️ Админ панель
            </h2>
            
            <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setActiveSection('teams')}
                        style={{
                            padding: '12px 24px', borderRadius: '8px',
                            background: activeSection === 'teams' ? '#c9a961' : '#2a2a2a',
                            color: activeSection === 'teams' ? '#000' : '#fff',
                            border: 'none', cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        👥 Команды
                    </button>
                    <button
                        onClick={() => setActiveSection('players')}
                        style={{
                            padding: '12px 24px', borderRadius: '8px',
                            background: activeSection === 'players' ? '#c9a961' : '#2a2a2a',
                            color: activeSection === 'players' ? '#000' : '#fff',
                            border: 'none', cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        ⚔️ Игроки
                    </button>
                    <button
                        onClick={() => setActiveSection('matches')}
                        style={{
                            padding: '12px 24px', borderRadius: '8px',
                            background: activeSection === 'matches' ? '#c9a961' : '#2a2a2a',
                            color: activeSection === 'matches' ? '#000' : '#fff',
                            border: 'none', cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        🎮 Командные матчи
                    </button>
                </div>
            </div>

            {activeSection === 'teams' && (
                <AdminTeams teams={teams} allPlayers={allPlayers} sessionId={sessionId} onUpdate={onUpdate} />
            )}
            {activeSection === 'players' && (
                <AdminPlayers players={allPlayers} sessionId={sessionId} onUpdate={onUpdate} />
            )}
            {activeSection === 'matches' && (
                <AdminMatches teams={teams} allPlayers={allPlayers} teamMatches={teamMatches} sessionId={sessionId} onUpdate={onUpdate} />
            )}
        </div>
    );
}
