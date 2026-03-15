// API Base URL (empty string for same domain)
const API_BASE = '';

// ==================== LOGIN MODAL ====================
function LoginModal({ onClose, onSuccess }) {
    const [login, setLogin] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    console.log('LoginModal rendered');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        console.log('Attempting login with:', login);

        try {
            const response = await fetch(`${API_BASE}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password })
            });

            const data = await response.json();
            console.log('Login response:', data);
            
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

// ==================== TEAM MATCHES PAGE ====================
function TeamMatches({ teamMatches, teams, allPlayers }) {
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
            // Only count completed matches with a winner
            if (match.status !== 'completed' || !match.winnerId) {
                return;
            }

            // Determine which team the winner belongs to
            let winnerTeamId = null;
            if (match.winnerId === match.player1Id) {
                winnerTeamId = match.team1Id;
            } else if (match.winnerId === match.player2Id) {
                winnerTeamId = match.team2Id;
            }
            // Also handle old format where winnerId might be team ID (for backwards compatibility)
            else if (match.winnerId === match.team1Id) {
                winnerTeamId = match.team1Id;
            } else if (match.winnerId === match.team2Id) {
                winnerTeamId = match.team2Id;
            }

            // Only count if we can determine the winner
            if (!winnerTeamId) {
                return;
            }

            if (match.team1Id && rankings[match.team1Id]) {
                rankings[match.team1Id].matches++;
                if (winnerTeamId === match.team1Id) {
                    rankings[match.team1Id].wins++;
                    rankings[match.team1Id].totalPoints += match.points || 0;
                } else if (winnerTeamId === match.team2Id) {
                    rankings[match.team1Id].losses++;
                }
            }

            if (match.team2Id && rankings[match.team2Id]) {
                rankings[match.team2Id].matches++;
                if (winnerTeamId === match.team2Id) {
                    rankings[match.team2Id].wins++;
                    rankings[match.team2Id].totalPoints += match.points || 0;
                } else if (winnerTeamId === match.team1Id) {
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

    return (
        <div>
            <h2 style={{ fontSize: '2em', marginBottom: '30px', color: '#c9a961' }}>
                ⚔️ Командные матчи - Рейтинг
            </h2>
            
            <div style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.5em', marginBottom: '20px', color: '#c9a961' }}>
                    🏆 Рейтинг команд (Custom Points)
                </h3>
                {teamRankings.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888', background: '#1a1a1a', borderRadius: '15px' }}>
                        Команд пока нет. Админ должен создать команды.
                    </div>
                )}
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
                                {ranking.team.logo ? (
                                    <img
                                        src={ranking.team.logo}
                                        alt={ranking.team.name}
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
                                <span style={{ fontSize: '2em', display: ranking.team.logo ? 'none' : 'inline' }}>{ranking.team.emoji}</span>
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

            {/* Анонс - Upcoming Matches */}
            <div style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.5em', marginBottom: '20px', color: '#c9a961' }}>
                    📅 Анонс
                </h3>
                {teamMatches.filter(m => m.status === 'upcoming').length === 0 && (
                    <div style={{
                        padding: '40px', textAlign: 'center', color: '#888',
                        background: '#1a1a1a', borderRadius: '15px'
                    }}>
                        Предстоящих матчей пока нет.
                    </div>
                )}
                {teamMatches.filter(m => m.status === 'upcoming').slice().reverse().map(match => {
                    const team1 = teams.find(t => t.id === match.team1Id);
                    const team2 = teams.find(t => t.id === match.team2Id);

                    return (
                        <div key={match.id} style={{
                            background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                            marginBottom: '15px', border: '2px solid #2196f3'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div>
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '4px 12px',
                                        background: '#2196f3',
                                        color: '#fff',
                                        borderRadius: '15px',
                                        fontSize: '0.85em',
                                        fontWeight: '600',
                                        marginBottom: '5px'
                                    }}>
                                        🕐 Предстоящий
                                    </div>
                                    {match.scheduledDate && (
                                        <div style={{ color: '#c9a961', fontSize: '0.9em', marginTop: '5px' }}>
                                            📅 {new Date(match.scheduledDate).toLocaleString('ru-RU', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1, textAlign: 'center' }}>
                                    {team1?.logo ? (
                                        <img
                                            src={team1.logo}
                                            alt={team1.name}
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '10px',
                                                objectFit: 'cover',
                                                margin: '0 auto 5px'
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextElementSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : null}
                                    <div style={{ fontSize: '1.5em', marginBottom: '5px', display: team1?.logo ? 'none' : 'block' }}>{team1?.emoji}</div>
                                    <div style={{
                                        fontWeight: '700',
                                        color: '#fff',
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
                                    {team2?.logo ? (
                                        <img
                                            src={team2.logo}
                                            alt={team2.name}
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '10px',
                                                objectFit: 'cover',
                                                margin: '0 auto 5px'
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextElementSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : null}
                                    <div style={{ fontSize: '1.5em', marginBottom: '5px', display: team2?.logo ? 'none' : 'block' }}>{team2?.emoji}</div>
                                    <div style={{
                                        fontWeight: '700',
                                        color: '#fff',
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

            {/* История матчей - Completed Matches */}
            <div>
                <h3 style={{ fontSize: '1.5em', marginBottom: '20px', color: '#c9a961' }}>
                    📜 История матчей
                </h3>
                {teamMatches.filter(m => m.status === 'completed').length === 0 && (
                    <div style={{
                        padding: '40px', textAlign: 'center', color: '#888',
                        background: '#1a1a1a', borderRadius: '15px'
                    }}>
                        Завершенных матчей пока нет.
                    </div>
                )}
                {teamMatches.filter(m => m.status === 'completed' && m.winnerId).slice().reverse().map(match => {
                    const team1 = teams.find(t => t.id === match.team1Id);
                    const team2 = teams.find(t => t.id === match.team2Id);

                    // Determine which team the winner belongs to
                    let winnerTeamId = null;
                    if (match.winnerId === match.player1Id) {
                        winnerTeamId = match.team1Id;
                    } else if (match.winnerId === match.player2Id) {
                        winnerTeamId = match.team2Id;
                    }
                    const isTeam1Winner = winnerTeamId === match.team1Id;

                    return (
                        <div key={match.id} style={{
                            background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                            marginBottom: '15px', border: '2px solid #4caf50'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div>
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '4px 12px',
                                        background: '#4caf50',
                                        color: '#fff',
                                        borderRadius: '15px',
                                        fontSize: '0.85em',
                                        fontWeight: '600',
                                        marginBottom: '5px'
                                    }}>
                                        ✅ Завершён
                                    </div>
                                    <div style={{ color: '#888', fontSize: '0.9em', marginTop: '5px' }}>
                                        {new Date(match.createdAt).toLocaleDateString('ru-RU')}
                                    </div>
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
                                    {team1?.logo ? (
                                        <img
                                            src={team1.logo}
                                            alt={team1.name}
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '10px',
                                                objectFit: 'cover',
                                                margin: '0 auto 5px'
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextElementSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : null}
                                    <div style={{ fontSize: '1.5em', marginBottom: '5px', display: team1?.logo ? 'none' : 'block' }}>{team1?.emoji}</div>
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
                                    {team2?.logo ? (
                                        <img
                                            src={team2.logo}
                                            alt={team2.name}
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '10px',
                                                objectFit: 'cover',
                                                margin: '0 auto 5px'
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextElementSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : null}
                                    <div style={{ fontSize: '1.5em', marginBottom: '5px', display: team2?.logo ? 'none' : 'block' }}>{team2?.emoji}</div>
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

// ==================== ADMIN PANEL ====================
function AdminPanel({ teams, allPlayers, teamMatches, sessionId, onUpdate, onLogout }) {
    const [activeSection, setActiveSection] = React.useState('teams');
    const [verified, setVerified] = React.useState(false);

    React.useEffect(() => {
        const verify = async () => {
            if (!sessionId) {
                onLogout();
                return;
            }
            try {
                const response = await fetch(`${API_BASE}/api/admin/verify`, {
                    headers: { 'x-session-id': sessionId }
                });
                const data = await response.json();
                if (!data.isAuthenticated) {
                    onLogout();
                } else {
                    setVerified(true);
                }
            } catch (error) {
                onLogout();
            }
        };
        verify();
    }, []);

    if (!verified) {
        return null;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '2em', margin: 0, color: '#c9a961' }}>
                    ⚙️ Админ панель
                </h2>
                <button
                    onClick={onLogout}
                    style={{
                        padding: '10px 20px', borderRadius: '8px',
                        background: '#f44336', color: '#fff',
                        border: 'none', cursor: 'pointer', fontWeight: '600',
                        fontSize: '14px'
                    }}
                >
                    🚪 Выход
                </button>
            </div>

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
                    <button
                        onClick={() => setActiveSection('streamers')}
                        style={{
                            padding: '12px 24px', borderRadius: '8px',
                            background: activeSection === 'streamers' ? '#c9a961' : '#2a2a2a',
                            color: activeSection === 'streamers' ? '#000' : '#fff',
                            border: 'none', cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        📺 Стримеры
                    </button>
                    <button
                        onClick={() => setActiveSection('portraits')}
                        style={{
                            padding: '12px 24px', borderRadius: '8px',
                            background: activeSection === 'portraits' ? '#c9a961' : '#2a2a2a',
                            color: activeSection === 'portraits' ? '#000' : '#fff',
                            border: 'none', cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        🖼️ Портреты
                    </button>
                    <button
                        onClick={() => setActiveSection('points')}
                        style={{
                            padding: '12px 24px', borderRadius: '8px',
                            background: activeSection === 'points' ? '#c9a961' : '#2a2a2a',
                            color: activeSection === 'points' ? '#000' : '#fff',
                            border: 'none', cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        💎 Очки
                    </button>
                    <button
                        onClick={() => setActiveSection('cache')}
                        style={{
                            padding: '12px 24px', borderRadius: '8px',
                            background: activeSection === 'cache' ? '#c9a961' : '#2a2a2a',
                            color: activeSection === 'cache' ? '#000' : '#fff',
                            border: 'none', cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        🔄 Кэш
                    </button>
                </div>
            </div>

            {activeSection === 'teams' && (
                <AdminTeams teams={teams} allPlayers={allPlayers} sessionId={sessionId} onUpdate={onUpdate} />
            )}
            {activeSection === 'players' && (
                <AdminPlayers players={allPlayers} teams={teams} sessionId={sessionId} onUpdate={onUpdate} />
            )}
            {activeSection === 'matches' && (
                <AdminMatches teams={teams} allPlayers={allPlayers} teamMatches={teamMatches} sessionId={sessionId} onUpdate={onUpdate} />
            )}
            {activeSection === 'streamers' && (
                <AdminStreamers sessionId={sessionId} onUpdate={onUpdate} />
            )}
            {activeSection === 'portraits' && (
                <AdminPortraits sessionId={sessionId} onUpdate={onUpdate} />
            )}
            {activeSection === 'points' && (
                <AdminPoints players={allPlayers} sessionId={sessionId} onUpdate={onUpdate} />
            )}
            {activeSection === 'cache' && (
                <AdminCache sessionId={sessionId} onUpdate={onUpdate} />
            )}
        </div>
    );
}

// ==================== ADMIN TEAMS ====================
function AdminTeams({ teams, allPlayers, sessionId, onUpdate }) {
    const [showForm, setShowForm] = React.useState(false);
    const [formData, setFormData] = React.useState({
        name: '', emoji: '', logo: '', captainId: null, coaches: []
    });
    const [editingId, setEditingId] = React.useState(null);
    const [selectedPlayer, setSelectedPlayer] = React.useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingId ? `${API_BASE}/api/admin/teams/${editingId}` : `${API_BASE}/api/admin/teams`;
            const method = editingId ? 'PUT' : 'POST';
            
            // Create team first
            const teamData = {
                name: formData.name,
                emoji: '👥', // Default emoji
                captainId: formData.captainId || null,
                coaches: formData.coaches || []
            };
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify(teamData)
            });

            if (response.ok) {
                const team = await response.json();

                // Upload logo if file selected
                if (formData.logoFile) {
                    const formDataFile = new FormData();
                    formDataFile.append('logo', formData.logoFile);

                    const uploadResponse = await fetch(`${API_BASE}/api/admin/teams/${team.id}/upload-logo`, {
                        method: 'POST',
                        headers: {
                            'x-session-id': sessionId
                        },
                        body: formDataFile
                    });

                    if (!uploadResponse.ok) {
                        alert('Ошибка при загрузке логотипа');
                        return;
                    }
                }

                setShowForm(false);
                setFormData({ name: '', emoji: '', logo: '', logoFile: null, captainId: null, coaches: [] });
                setEditingId(null);
                await onUpdate();
            }
        } catch (error) {
            alert('Ошибка при сохранении команды');
        }
    };

    const handleEdit = (team) => {
        setFormData({
            name: team.name,
            emoji: team.emoji,
            logo: team.logo || '',
            captainId: team.captainId || null,
            coaches: team.coaches || []
        });
        setEditingId(team.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Удалить команду?')) return;
        
        try {
            await fetch(`${API_BASE}/api/admin/teams/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId }
            });
            onUpdate();
        } catch (error) {
            alert('Ошибка при удалении команды');
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        padding: '12px 24px', borderRadius: '8px',
                        background: '#4caf50', color: '#fff',
                        border: 'none', cursor: 'pointer', fontWeight: '600'
                    }}
                >
                    {showForm ? '❌ Отмена' : '➕ Добавить команду'}
                </button>
            </div>

            {showForm && (
                <div style={{
                    background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                    marginBottom: '20px', border: '1px solid #c9a961'
                }}>
                    <h3 style={{ color: '#c9a961', marginBottom: '20px' }}>
                        {editingId ? 'Редактировать команду' : 'Новая команда'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Название команды</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Загрузить логотип команды</label>
                            {editingId && formData.logo && !formData.logoFile && (
                                <div style={{ marginBottom: '10px' }}>
                                    <img
                                        src={formData.logo}
                                        alt="Current logo"
                                        style={{
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '10px',
                                            objectFit: 'cover',
                                            border: '2px solid #c9a961'
                                        }}
                                    />
                                    <div style={{ color: '#888', fontSize: '0.9em', marginTop: '5px' }}>
                                        Текущий логотип
                                    </div>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={(e) => setFormData({...formData, logoFile: e.target.files[0]})}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                            />
                            <small style={{ color: '#888', fontSize: '0.85em', marginTop: '5px', display: 'block' }}>
                                JPEG/JPG или PNG, максимум 20MB
                            </small>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Капитан</label>
                            <select
                                value={formData.captainId || ''}
                                onChange={(e) => setFormData({...formData, captainId: e.target.value || null})}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                            >
                                <option value="">Без капитана</option>
                                {allPlayers.map(player => (
                                    <option key={player.id} value={player.id}>{player.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Тренеры</label>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                {(formData.coaches || []).map((coachId, idx) => {
                                    const coachPlayer = allPlayers.find(p => p.id === coachId);
                                    const coachName = coachPlayer ? coachPlayer.name : coachId;
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                background: '#2a2a2a',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                border: '1px solid #444'
                                            }}
                                        >
                                            <span style={{ color: '#fff' }}>{coachName}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newCoaches = formData.coaches.filter((_, i) => i !== idx);
                                                    setFormData({...formData, coaches: newCoaches});
                                                }}
                                                style={{
                                                    background: '#f44336',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '2px 6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8em'
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select
                                    id="coachSelect"
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #444',
                                        background: '#2a2a2a',
                                        color: '#fff'
                                    }}
                                >
                                    <option value="">Выберите тренера...</option>
                                    {allPlayers
                                        .filter(player => !(formData.coaches || []).includes(player.id))
                                        .map(player => (
                                            <option key={player.id} value={player.id}>{player.name}</option>
                                        ))
                                    }
                                </select>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const select = document.getElementById('coachSelect');
                                        if (select.value) {
                                            setFormData({
                                                ...formData,
                                                coaches: [...(formData.coaches || []), select.value]
                                            });
                                            select.value = '';
                                        }
                                    }}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        background: '#2196f3',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    ➕ Добавить
                                </button>
                            </div>
                            <small style={{ color: '#888', fontSize: '0.85em', marginTop: '5px', display: 'block' }}>
                                Выберите игрока из списка и нажмите "Добавить"
                            </small>
                        </div>
                        <button
                            type="submit"
                            style={{
                                padding: '12px 24px', borderRadius: '8px',
                                background: '#c9a961', color: '#000',
                                border: 'none', cursor: 'pointer', fontWeight: '600'
                            }}
                        >
                            {editingId ? 'Сохранить изменения' : 'Создать команду'}
                        </button>
                    </form>
                </div>
            )}

            <div>
                {teams.length === 0 && (
                    <div style={{
                        padding: '40px', textAlign: 'center', color: '#888',
                        background: '#1a1a1a', borderRadius: '15px'
                    }}>
                        Команд пока нет
                    </div>
                )}
                {teams.map(team => (
                    <div key={team.id} style={{
                        background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                        marginBottom: '15px', border: '1px solid #333'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                {team.logo ? (
                                    <img
                                        src={team.logo}
                                        alt={team.name}
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
                                <span style={{ fontSize: '2em', display: team.logo ? 'none' : 'inline' }}>{team.emoji}</span>
                                <div>
                                    <div style={{ fontSize: '1.3em', fontWeight: '700', color: '#fff' }}>
                                        {team.name}
                                    </div>
                                    {team.captainId && (
                                        <div style={{ color: '#c9a961', fontSize: '0.9em', marginTop: '5px' }}>
                                            👑 Капитан: {allPlayers.find(p => p.id === team.captainId)?.name || 'Unknown'}
                                        </div>
                                    )}
                                    {team.coaches && team.coaches.length > 0 && (
                                        <div style={{ marginTop: '10px' }}>
                                            <div style={{ color: '#c9a961', fontSize: '0.95em', marginBottom: '8px', fontWeight: '600' }}>
                                                🎓 Тренеры:
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {team.coaches.map((coachId, idx) => {
                                                    const coach = allPlayers.find(p => p.id === coachId);
                                                    if (!coach) return null;
                                                    return (
                                                        <div
                                                            key={idx}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedPlayer(coach);
                                                            }}
                                                            style={{
                                                                background: '#2a2a2a',
                                                                padding: '10px 15px',
                                                                borderRadius: '10px',
                                                                cursor: 'pointer',
                                                                border: '1px solid #444',
                                                                transition: 'all 0.2s',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#3a3a3a';
                                                                e.currentTarget.style.borderColor = '#c9a961';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = '#2a2a2a';
                                                                e.currentTarget.style.borderColor = '#444';
                                                            }}
                                                        >
                                                            <div>
                                                                <div style={{ color: '#fff', fontWeight: '600', marginBottom: '3px' }}>
                                                                    {coach.name}
                                                                </div>
                                                                <div style={{ color: '#888', fontSize: '0.85em' }}>
                                                                    {coach.battleTag}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ color: '#c9a961', fontSize: '0.9em' }}>
                                                                    ⚔️ {coach.points || 0} pts
                                                                </div>
                                                                <div style={{ color: '#4caf50', fontSize: '0.85em' }}>
                                                                    {coach.mmr || 0} MMR
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => handleEdit(team)}
                                    style={{
                                        padding: '8px 16px', borderRadius: '8px',
                                        background: '#2196f3', color: '#fff',
                                        border: 'none', cursor: 'pointer'
                                    }}
                                >
                                    ✏️ Изменить
                                </button>
                                <button
                                    onClick={() => handleDelete(team.id)}
                                    style={{
                                        padding: '8px 16px', borderRadius: '8px',
                                        background: '#f44336', color: '#fff',
                                        border: 'none', cursor: 'pointer'
                                    }}
                                >
                                    🗑️ Удалить
                                </button>
                            </div>
                        </div>
                    </div>
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

// ==================== PLAYER DETAIL MODAL ====================
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
                                                border: '1px solid #c9a961'
                                            }}
                                        >
                                            <div style={{ fontSize: '2em', marginBottom: '10px' }}>{ach.icon}</div>
                                            <div style={{ fontWeight: '700', color: '#fff', marginBottom: '5px' }}>{ach.name}</div>
                                            <div style={{ color: '#888', fontSize: '0.9em', marginBottom: '8px' }}>{ach.desc}</div>
                                            <div style={{ color: '#4caf50', fontWeight: '600' }}>+{ach.points} pts</div>
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
                                📊 Последние матчи
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '5px',
                                height: '150px',
                                alignItems: 'flex-end',
                                padding: '10px',
                                background: '#1a1a1a',
                                borderRadius: '10px'
                            }}>
                                {player.matchHistory.slice(0, 20).map((match, idx) => {
                                    const result = typeof match === 'string' ? match : match.result;
                                    const height = 30 + Math.random() * 120;
                                    const barColor = result === 'win' ? '#4caf50' : '#f44336';
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                flex: 1,
                                                height: `${height}px`,
                                                background: barColor,
                                                borderRadius: '4px 4px 0 0',
                                                minWidth: '8px',
                                                opacity: 0.8,
                                                transition: 'opacity 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                                        />
                                    );
                                })}
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginTop: '15px',
                                fontSize: '0.9em'
                            }}>
                                <div style={{ color: '#4caf50' }}>🗡️ Победы</div>
                                <div style={{ color: '#f44336' }}>💀 Поражения</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================== ADMIN PLAYERS ====================
function AdminPlayers({ players, teams, sessionId, onUpdate }) {
    const [showForm, setShowForm] = React.useState(false);
    const [battleTag, setBattleTag] = React.useState('');
    const [searchResult, setSearchResult] = React.useState(null);
    const [searching, setSearching] = React.useState(false);
    const [editingPlayer, setEditingPlayer] = React.useState(null);
    const [discordInputs, setDiscordInputs] = React.useState({});
    const [showManualForm, setShowManualForm] = React.useState(false);
    const [manualData, setManualData] = React.useState({ name: '', race: 0, currentMmr: 0 });

    const handleSearch = async (e) => {
        e.preventDefault();
        setSearching(true);
        setSearchResult(null);

        try {
            const response = await fetch(`${API_BASE}/api/admin/players/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify({ battleTag })
            });

            const data = await response.json();
            setSearchResult(data);
        } catch (error) {
            alert('Ошибка при поиске игрока');
        } finally {
            setSearching(false);
        }
    };

    const handleAdd = async () => {
        if (!searchResult || !searchResult.found) return;

        try {
            const response = await fetch(`${API_BASE}/api/admin/players`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify({
                    battleTag: searchResult.battleTag,
                    name: searchResult.name,
                    race: searchResult.race,
                    currentMmr: searchResult.currentMmr
                })
            });

            if (response.ok) {
                setShowForm(false);
                setBattleTag('');
                setSearchResult(null);
                onUpdate();
            }
        } catch (error) {
            alert('Ошибка при добавлении игрока');
        }
    };

    const handleManualAdd = async () => {
        if (!battleTag.trim() || !manualData.name.trim()) return;
        try {
            const response = await fetch(`${API_BASE}/api/admin/players`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify({
                    battleTag: battleTag.trim(),
                    name: manualData.name.trim(),
                    race: parseInt(manualData.race) || 0,
                    currentMmr: parseInt(manualData.currentMmr) || 0
                })
            });

            if (response.ok) {
                setShowForm(false);
                setBattleTag('');
                setSearchResult(null);
                setShowManualForm(false);
                setManualData({ name: '', race: 0, currentMmr: 0 });
                onUpdate();
            } else {
                const data = await response.json();
                alert(data.error || 'Ошибка при добавлении игрока');
            }
        } catch (error) {
            alert('Ошибка при добавлении игрока');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Удалить игрока?')) return;

        try {
            await fetch(`${API_BASE}/api/admin/players/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId }
            });
            onUpdate();
        } catch (error) {
            alert('Ошибка при удалении игрока');
        }
    };

    const handleUpdateTeam = async (playerId, teamId) => {
        try {
            const player = players.find(p => p.id === playerId);
            if (!player) {
                console.error('Player not found:', playerId);
                alert('Игрок не найден');
                return;
            }

            const response = await fetch(`${API_BASE}/api/admin/players/${playerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify({
                    battleTag: player.battleTag,
                    name: player.name,
                    race: player.race,
                    currentMmr: player.currentMmr,
                    teamId: teamId || null
                })
            });

            if (response.ok) {
                await onUpdate();
            } else {
                const errorData = await response.json();
                console.error('Failed to update player team:', errorData);
                alert('Ошибка при обновлении команды игрока');
            }
        } catch (error) {
            console.error('Error updating player team:', error);
            alert('Ошибка при обновлении команды игрока');
        }
    };

    const handleUpdateDiscord = async (playerId, discordTag, shouldUpdate = false) => {
        // If not saving, just update local state
        if (!shouldUpdate) {
            setDiscordInputs(prev => ({ ...prev, [playerId]: discordTag }));
            return;
        }

        // Save to backend on blur
        try {
            const player = players.find(p => p.id === playerId);
            if (!player) {
                console.error('Player not found:', playerId);
                return;
            }

            const response = await fetch(`${API_BASE}/api/admin/players/${playerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify({
                    battleTag: player.battleTag,
                    name: player.name,
                    race: player.race,
                    currentMmr: player.currentMmr,
                    teamId: player.teamId || null,
                    discordTag: discordTag || null
                })
            });

            if (response.ok) {
                await onUpdate();
                // Clear local input state after successful save
                setDiscordInputs(prev => {
                    const newState = { ...prev };
                    delete newState[playerId];
                    return newState;
                });
            } else {
                const errorData = await response.json();
                console.error('Failed to update player Discord:', errorData);
                alert('Ошибка при обновлении Discord тега');
            }
        } catch (error) {
            console.error('Error updating player Discord:', error);
            alert('Ошибка при обновлении Discord тега');
        }
    };

    const raceIcons = {
        0: '🎲', 1: '👑', 2: '⚔️', 4: '🌙', 8: '💀',
    };

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        padding: '12px 24px', borderRadius: '8px',
                        background: '#4caf50', color: '#fff',
                        border: 'none', cursor: 'pointer', fontWeight: '600'
                    }}
                >
                    {showForm ? '❌ Отмена' : '➕ Добавить игрока'}
                </button>
            </div>

            {showForm && (
                <div style={{
                    background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                    marginBottom: '20px', border: '1px solid #c9a961'
                }}>
                    <h3 style={{ color: '#c9a961', marginBottom: '20px' }}>
                        Поиск игрока в W3Champions
                    </h3>
                    <form onSubmit={handleSearch}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                                BattleTag (например: ZugZugMaster#1399)
                            </label>
                            <input
                                type="text"
                                value={battleTag}
                                onChange={(e) => setBattleTag(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                placeholder="PlayerName#1234"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={searching}
                            style={{
                                padding: '12px 24px', borderRadius: '8px',
                                background: '#2196f3', color: '#fff',
                                border: 'none', cursor: searching ? 'not-allowed' : 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            {searching ? '🔍 Поиск...' : '🔍 Найти игрока'}
                        </button>
                    </form>

                    {searchResult && (
                        <div style={{
                            marginTop: '20px', padding: '20px',
                            background: searchResult.found ? '#2a2a2a' : '#f44336',
                            borderRadius: '10px'
                        }}>
                            {searchResult.found ? (
                                <div>
                                    <h4 style={{ color: '#4caf50', marginBottom: '15px' }}>✅ Игрок найден!</h4>
                                    <div style={{ color: '#fff', marginBottom: '10px' }}>
                                        <strong>Имя:</strong> {searchResult.name}
                                    </div>
                                    <div style={{ color: '#fff', marginBottom: '10px' }}>
                                        <strong>BattleTag:</strong> {searchResult.battleTag}
                                    </div>
                                    <div style={{ color: '#fff', marginBottom: '10px' }}>
                                        <strong>Раса:</strong> {raceIcons[searchResult.race]} ({searchResult.race})
                                    </div>
                                    <div style={{ color: '#fff', marginBottom: '10px' }}>
                                        <strong>MMR:</strong> {searchResult.currentMmr}
                                    </div>
                                    <div style={{ color: '#fff', marginBottom: '15px' }}>
                                        <strong>Матчей:</strong> {searchResult.matchCount}
                                    </div>
                                    <button
                                        onClick={handleAdd}
                                        style={{
                                            padding: '12px 24px', borderRadius: '8px',
                                            background: '#4caf50', color: '#fff',
                                            border: 'none', cursor: 'pointer', fontWeight: '600'
                                        }}
                                    >
                                        ➕ Добавить этого игрока
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <h4 style={{ color: '#fff', marginBottom: '10px' }}>❌ Игрок не найден на W3Champions</h4>
                                    <div style={{ color: '#fff', marginBottom: '15px' }}>{searchResult.message}</div>
                                    {!showManualForm ? (
                                        <button
                                            onClick={() => {
                                                setShowManualForm(true);
                                                setManualData({ name: battleTag.split('#')[0], race: 0, currentMmr: 0 });
                                            }}
                                            style={{
                                                padding: '10px 20px', borderRadius: '8px',
                                                background: '#ff9800', color: '#fff',
                                                border: 'none', cursor: 'pointer', fontWeight: '600'
                                            }}
                                        >
                                            Добавить вручную
                                        </button>
                                    ) : (
                                        <div style={{ marginTop: '15px', padding: '15px', background: '#333', borderRadius: '8px' }}>
                                            <h4 style={{ color: '#ff9800', marginBottom: '15px' }}>Ручное добавление</h4>
                                            <div style={{ marginBottom: '10px' }}>
                                                <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>BattleTag:</label>
                                                <div style={{ color: '#fff', fontWeight: '600' }}>{battleTag}</div>
                                            </div>
                                            <div style={{ marginBottom: '10px' }}>
                                                <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Имя:</label>
                                                <input
                                                    type="text"
                                                    value={manualData.name}
                                                    onChange={(e) => setManualData({...manualData, name: e.target.value})}
                                                    style={{
                                                        padding: '8px 12px', borderRadius: '6px', border: '1px solid #555',
                                                        background: '#1a1a1a', color: '#fff', width: '100%'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '10px' }}>
                                                <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Раса:</label>
                                                <select
                                                    value={manualData.race}
                                                    onChange={(e) => setManualData({...manualData, race: parseInt(e.target.value)})}
                                                    style={{
                                                        padding: '8px 12px', borderRadius: '6px', border: '1px solid #555',
                                                        background: '#1a1a1a', color: '#fff', width: '100%'
                                                    }}
                                                >
                                                    <option value={0}>Random / Неизвестно</option>
                                                    <option value={1}>Human</option>
                                                    <option value={2}>Orc</option>
                                                    <option value={4}>Night Elf</option>
                                                    <option value={8}>Undead</option>
                                                </select>
                                            </div>
                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>MMR:</label>
                                                <input
                                                    type="number"
                                                    value={manualData.currentMmr}
                                                    onChange={(e) => setManualData({...manualData, currentMmr: parseInt(e.target.value) || 0})}
                                                    style={{
                                                        padding: '8px 12px', borderRadius: '6px', border: '1px solid #555',
                                                        background: '#1a1a1a', color: '#fff', width: '100%'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button
                                                    onClick={handleManualAdd}
                                                    style={{
                                                        padding: '10px 20px', borderRadius: '8px',
                                                        background: '#4caf50', color: '#fff',
                                                        border: 'none', cursor: 'pointer', fontWeight: '600'
                                                    }}
                                                >
                                                    Добавить
                                                </button>
                                                <button
                                                    onClick={() => setShowManualForm(false)}
                                                    style={{
                                                        padding: '10px 20px', borderRadius: '8px',
                                                        background: '#666', color: '#fff',
                                                        border: 'none', cursor: 'pointer', fontWeight: '600'
                                                    }}
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div>
                {players.length === 0 && (
                    <div style={{
                        padding: '40px', textAlign: 'center', color: '#888',
                        background: '#1a1a1a', borderRadius: '15px'
                    }}>
                        Игроков пока нет
                    </div>
                )}
                {players.map(player => {
                    const playerTeam = teams.find(t => t.id === player.teamId);
                    return (
                        <div key={player.id} style={{
                            background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                            marginBottom: '15px', border: '1px solid #333'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                                    <span style={{ fontSize: '2em' }}>{raceIcons[player.race]}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '1.3em', fontWeight: '700', color: '#fff' }}>
                                            {player.name}
                                        </div>
                                        <div style={{ color: '#888', fontSize: '0.9em', marginTop: '5px' }}>
                                            {player.battleTag} • {player.currentMmr} MMR
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(player.id)}
                                    style={{
                                        padding: '8px 16px', borderRadius: '8px',
                                        background: '#f44336', color: '#fff',
                                        border: 'none', cursor: 'pointer'
                                    }}
                                >
                                    🗑️ Удалить
                                </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <label style={{ color: '#fff', minWidth: '100px' }}>Команда:</label>
                                <select
                                    value={player.teamId || ''}
                                    onChange={(e) => handleUpdateTeam(player.id, e.target.value)}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '8px',
                                        border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                    }}
                                >
                                    <option value="">Без команды</option>
                                    {teams.map(team => (
                                        <option key={team.id} value={team.id}>
                                            {team.emoji} {team.name}
                                        </option>
                                    ))}
                                </select>
                                {playerTeam && (
                                    <div style={{
                                        padding: '5px 10px', background: '#c9a961',
                                        color: '#000', borderRadius: '5px', fontSize: '0.9em', fontWeight: '600'
                                    }}>
                                        {playerTeam.emoji} {playerTeam.name}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label style={{ color: '#fff', minWidth: '100px' }}>Discord:</label>
                                <input
                                    type="text"
                                    value={discordInputs[player.id] !== undefined ? discordInputs[player.id] : (player.discordTag || '')}
                                    placeholder="username#1234"
                                    onChange={(e) => handleUpdateDiscord(player.id, e.target.value)}
                                    onBlur={(e) => handleUpdateDiscord(player.id, e.target.value, true)}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '8px',
                                        border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                    }}
                                />
                                {player.discordTag && (
                                    <div style={{
                                        padding: '5px 10px', background: '#5865F2',
                                        color: '#fff', borderRadius: '5px', fontSize: '0.9em', fontWeight: '600',
                                        display: 'flex', alignItems: 'center', gap: '5px'
                                    }}>
                                        <svg width="14" height="14" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <g clipPath="url(#clip0)">
                                                <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white"/>
                                            </g>
                                            <defs>
                                                <clipPath id="clip0">
                                                    <rect width="71" height="55" fill="white"/>
                                                </clipPath>
                                            </defs>
                                        </svg>
                                        {player.discordTag}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ==================== ADMIN MATCHES ====================
function AdminMatches({ teams, allPlayers, teamMatches, sessionId, onUpdate }) {
    const [showForm, setShowForm] = React.useState(false);
    const [showGridGenerator, setShowGridGenerator] = React.useState(false);
    const [gridTeam1Id, setGridTeam1Id] = React.useState(null);
    const [gridTeam2Id, setGridTeam2Id] = React.useState(null);
    const [generatingGrid, setGeneratingGrid] = React.useState(false);
    // Smart MMR matchmaking state
    const [showSmartMatchmaking, setShowSmartMatchmaking] = React.useState(false);
    const [smartSelectedTeams, setSmartSelectedTeams] = React.useState([]);
    const [smartMaxMmrDiff, setSmartMaxMmrDiff] = React.useState(500);
    const [smartPreview, setSmartPreview] = React.useState(null);
    const [smartLoading, setSmartLoading] = React.useState(false);
    const [smartCreating, setSmartCreating] = React.useState(false);
    const [formData, setFormData] = React.useState({
        team1Id: null, team2Id: null,
        player1Id: null, player2Id: null,
        homePlayerId: null,
        winnerId: null, points: 50, notes: '',
        status: 'upcoming', scheduledDate: '',
        w3championsMatchId: ''
    });
    const [matchFilter, setMatchFilter] = React.useState('');
    const [filterStatus, setFilterStatus] = React.useState('all');
    const [deadline, setDeadline] = React.useState(null);
    const [deadlineMinutes, setDeadlineMinutes] = React.useState(20);
    const [deadlineRemaining, setDeadlineRemaining] = React.useState('');

    // Fetch and track deadline
    React.useEffect(() => {
        const fetchDeadline = async () => {
            try {
                const resp = await fetch(`${API_BASE}/api/match-deadline`);
                const data = await resp.json();
                setDeadline(data.deadline ? new Date(data.deadline) : null);
            } catch (e) {}
        };
        fetchDeadline();
    }, []);

    React.useEffect(() => {
        if (!deadline) { setDeadlineRemaining(''); return; }
        const tick = () => {
            const diff = new Date(deadline) - new Date();
            if (diff <= 0) {
                setDeadlineRemaining('⏰ Время вышло!');
                return;
            }
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setDeadlineRemaining(`${m}:${s.toString().padStart(2, '0')}`);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [deadline]);

    // Smart MMR matchmaking - generate preview
    const handleSmartPreview = async () => {
        if (smartSelectedTeams.length < 2) {
            alert('Выберите минимум 2 команды');
            return;
        }

        setSmartLoading(true);
        setSmartPreview(null);

        try {
            const response = await fetch(`${API_BASE}/api/admin/team-matches/smart-generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify({
                    teamIds: smartSelectedTeams,
                    maxMmrDiff: smartMaxMmrDiff
                })
            });

            const data = await response.json();
            if (response.ok) {
                setSmartPreview(data);
            } else {
                alert(data.error || 'Ошибка при генерации матчей');
            }
        } catch (error) {
            alert('Ошибка при генерации матчей');
        }

        setSmartLoading(false);
    };

    // Smart MMR matchmaking - confirm and create matches
    const handleSmartConfirm = async () => {
        if (!smartPreview || !smartPreview.preview || smartPreview.preview.length === 0) return;

        const validMatches = smartPreview.preview.filter(m => m.withinRange);
        if (validMatches.length === 0) {
            alert('Нет матчей в пределах MMR диапазона!');
            return;
        }

        if (!confirm(`Создать ${validMatches.length} матчей по MMR (${smartPreview.outOfRange} пропущено из-за большой разницы)? Продолжить?`)) return;

        setSmartCreating(true);

        try {
            const response = await fetch(`${API_BASE}/api/admin/team-matches/smart-generate/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify({
                    matches: validMatches
                })
            });

            const data = await response.json();
            if (response.ok) {
                alert(`Успешно создано ${data.createdCount} матчей!${data.errorCount > 0 ? ` Ошибок: ${data.errorCount}` : ''}`);
                setShowSmartMatchmaking(false);
                setSmartPreview(null);
                setSmartSelectedTeams([]);
                onUpdate();
            } else {
                alert(data.error || 'Ошибка при создании матчей');
            }
        } catch (error) {
            alert('Ошибка при создании матчей');
        }

        setSmartCreating(false);
    };

    // Toggle team selection for smart matchmaking
    const toggleSmartTeam = (teamId) => {
        setSmartPreview(null); // Reset preview when teams change
        setSmartSelectedTeams(prev =>
            prev.includes(teamId)
                ? prev.filter(id => id !== teamId)
                : [...prev, teamId]
        );
    };

    // Generate match grid between two teams
    const handleGenerateGrid = async () => {
        if (!gridTeam1Id || !gridTeam2Id) {
            alert('Выберите обе команды');
            return;
        }
        if (gridTeam1Id === gridTeam2Id) {
            alert('Выберите разные команды');
            return;
        }

        const team1PlayersList = allPlayers.filter(p => p.teamId === gridTeam1Id);
        const team2PlayersList = allPlayers.filter(p => p.teamId === gridTeam2Id);

        if (team1PlayersList.length === 0 || team2PlayersList.length === 0) {
            alert('В одной из команд нет игроков');
            return;
        }

        const totalMatches = team1PlayersList.length * team2PlayersList.length;
        if (!confirm(`Будет создано ${totalMatches} матчей (${team1PlayersList.length} x ${team2PlayersList.length} игроков). Продолжить?`)) {
            return;
        }

        setGeneratingGrid(true);
        let createdCount = 0;
        let errorCount = 0;

        // Create match for each pair of players
        for (const p1 of team1PlayersList) {
            for (const p2 of team2PlayersList) {
                try {
                    const matchData = {
                        team1Id: gridTeam1Id,
                        team2Id: gridTeam2Id,
                        player1Id: p1.id || p1._id,
                        player2Id: p2.id || p2._id,
                        winnerId: null,
                        points: 0,
                        notes: '',
                        status: 'upcoming',
                        scheduledDate: ''
                    };

                    const response = await fetch(`${API_BASE}/api/admin/team-matches`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-session-id': sessionId
                        },
                        body: JSON.stringify(matchData)
                    });

                    if (response.ok) {
                        createdCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    errorCount++;
                }
            }
        }

        setGeneratingGrid(false);
        setShowGridGenerator(false);
        setGridTeam1Id(null);
        setGridTeam2Id(null);
        
        if (errorCount > 0) {
            alert(`Создано ${createdCount} матчей, ошибок: ${errorCount}`);
        } else {
            alert(`Успешно создано ${createdCount} матчей!`);
        }
        
        onUpdate();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // For completed matches, winner is required
        if (formData.status === 'completed' && !formData.winnerId) {
            alert('Для завершенного матча выберите победителя');
            return;
        }
        
        // For upcoming matches, winner and points are optional
        const matchData = {
            ...formData,
            winnerId: formData.status === 'upcoming' ? null : formData.winnerId,
            points: formData.status === 'upcoming' ? 0 : formData.points
        };

        try {
            const response = await fetch(`${API_BASE}/api/admin/team-matches`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify(matchData)
            });

            if (response.ok) {
                setShowForm(false);
                setFormData({
                    team1Id: null, team2Id: null,
                    player1Id: null, player2Id: null,
                    homePlayerId: null,
                    winnerId: null, points: 50, notes: '',
                    status: 'upcoming', scheduledDate: '',
                    w3championsMatchId: ''
                });
                onUpdate();
            }
        } catch (error) {
            alert('Ошибка при создании матча');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Удалить матч?')) return;
        
        try {
            await fetch(`${API_BASE}/api/admin/team-matches/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId }
            });
            onUpdate();
        } catch (error) {
            alert('Ошибка при удалении матча');
        }
    };

    const team1Players = formData.team1Id ? allPlayers.filter(p => p.teamId === formData.team1Id) : [];
    const team2Players = formData.team2Id ? allPlayers.filter(p => p.teamId === formData.team2Id) : [];

    // Get preview of players for grid generator
    const gridTeam1Players = gridTeam1Id ? allPlayers.filter(p => p.teamId === gridTeam1Id) : [];
    const gridTeam2Players = gridTeam2Id ? allPlayers.filter(p => p.teamId === gridTeam2Id) : [];

    return (
        <div>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => { setShowForm(!showForm); setShowGridGenerator(false); setShowSmartMatchmaking(false); }}
                    style={{
                        padding: '12px 24px', borderRadius: '8px',
                        background: '#4caf50', color: '#fff',
                        border: 'none', cursor: 'pointer', fontWeight: '600'
                    }}
                >
                    {showForm ? '❌ Отмена' : '➕ Добавить матч'}
                </button>
                <button
                    onClick={() => { setShowGridGenerator(!showGridGenerator); setShowForm(false); setShowSmartMatchmaking(false); }}
                    style={{
                        padding: '12px 24px', borderRadius: '8px',
                        background: '#9c27b0', color: '#fff',
                        border: 'none', cursor: 'pointer', fontWeight: '600'
                    }}
                >
                    {showGridGenerator ? '❌ Отмена' : '🎯 Сетка (каждый с каждым)'}
                </button>
                <button
                    onClick={() => { setShowSmartMatchmaking(!showSmartMatchmaking); setShowForm(false); setShowGridGenerator(false); setSmartPreview(null); }}
                    style={{
                        padding: '12px 24px', borderRadius: '8px',
                        background: showSmartMatchmaking ? '#666' : '#ff9800', color: '#fff',
                        border: 'none', cursor: 'pointer', fontWeight: '600'
                    }}
                >
                    {showSmartMatchmaking ? '❌ Отмена' : '🧠 Smart Matchmaking (по MMR)'}
                </button>
                <button
                    onClick={async () => {
                        if (!confirm('Запустить починку матчей? Это восстановит статус у повреждённых матчей.')) return;
                        try {
                            const resp = await fetch(`${API_BASE}/api/admin/team-matches/repair`, {
                                method: 'POST',
                                headers: { 'x-session-id': sessionId }
                            });
                            const data = await resp.json();
                            if (data.success) {
                                alert(`Починено статусов: ${data.repairedStatus}\nМатчей с пустыми ID: ${data.matchesWithMissingIds}`);
                                onUpdate();
                            } else {
                                alert('Ошибка: ' + (data.error || 'Неизвестная ошибка'));
                            }
                        } catch (e) {
                            alert('Ошибка запроса: ' + e.message);
                        }
                    }}
                    style={{
                        padding: '12px 24px', borderRadius: '8px',
                        background: '#f44336', color: '#fff',
                        border: 'none', cursor: 'pointer', fontWeight: '600'
                    }}
                >
                    🔧 Починить матчи
                </button>
            </div>

            {/* Deadline Timer Controls */}
            <div style={{
                background: deadline ? (deadlineRemaining === '⏰ Время вышло!' ? '#3a1a1a' : '#1a2a1a') : '#1a1a2a',
                padding: '15px 20px', borderRadius: '12px', marginBottom: '20px',
                border: `2px solid ${deadline ? (deadlineRemaining === '⏰ Время вышло!' ? '#f44336' : '#4caf50') : '#555'}`,
                display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap'
            }}>
                <span style={{ color: '#c9a961', fontWeight: '600', fontSize: '1em' }}>⏱️ Дедлайн матчей:</span>
                {deadline ? (
                    React.createElement(React.Fragment, null,
                        React.createElement('span', {
                            style: {
                                color: deadlineRemaining === '⏰ Время вышло!' ? '#f44336' : '#4caf50',
                                fontWeight: '700', fontSize: '1.3em', fontFamily: 'monospace'
                            }
                        }, deadlineRemaining),
                        React.createElement('button', {
                            onClick: async () => {
                                if (!confirm('Отменить дедлайн?')) return;
                                await fetch(`${API_BASE}/api/admin/match-deadline`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
                                    body: JSON.stringify({ clear: true })
                                });
                                setDeadline(null);
                            },
                            style: {
                                padding: '8px 16px', borderRadius: '8px',
                                background: '#f44336', color: '#fff',
                                border: 'none', cursor: 'pointer', fontWeight: '600'
                            }
                        }, '❌ Отменить дедлайн')
                    )
                ) : (
                    React.createElement(React.Fragment, null,
                        React.createElement('input', {
                            type: 'number', min: 1, max: 120, value: deadlineMinutes,
                            onChange: (e) => setDeadlineMinutes(parseInt(e.target.value) || 20),
                            style: {
                                width: '60px', padding: '8px', borderRadius: '8px',
                                background: '#2a2a2a', color: '#fff', border: '1px solid #555',
                                textAlign: 'center', fontSize: '1em'
                            }
                        }),
                        React.createElement('span', { style: { color: '#888' } }, 'мин'),
                        React.createElement('button', {
                            onClick: async () => {
                                if (!confirm(`Запустить дедлайн на ${deadlineMinutes} минут? После истечения нельзя будет отправлять результаты.`)) return;
                                try {
                                    const resp = await fetch(`${API_BASE}/api/admin/match-deadline`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
                                        body: JSON.stringify({ minutes: deadlineMinutes })
                                    });
                                    const data = await resp.json();
                                    if (data.success) {
                                        setDeadline(new Date(data.deadline));
                                    }
                                } catch (e) {
                                    alert('Ошибка: ' + e.message);
                                }
                            },
                            style: {
                                padding: '8px 16px', borderRadius: '8px',
                                background: '#4caf50', color: '#fff',
                                border: 'none', cursor: 'pointer', fontWeight: '600'
                            }
                        }, '▶️ Запустить таймер')
                    )
                )}
            </div>

            {/* Grid Generator Form */}
            {showGridGenerator && (
                <div style={{
                    background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                    marginBottom: '20px', border: '2px solid #9c27b0'
                }}>
                    <h3 style={{ color: '#9c27b0', marginBottom: '15px' }}>
                        🎯 Генератор сетки матчей
                    </h3>
                    <p style={{ color: '#888', marginBottom: '20px', fontSize: '0.95em' }}>
                        Выберите две команды - будут созданы все матчи "каждый с каждым" (каждый игрок команды 1 против каждого игрока команды 2)
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Команда 1</label>
                            <select
                                value={gridTeam1Id || ''}
                                onChange={(e) => setGridTeam1Id(e.target.value || null)}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                            >
                                <option value="">Выберите команду</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>{team.emoji || '👥'} {team.name}</option>
                                ))}
                            </select>
                            {gridTeam1Players.length > 0 && (
                                <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#888' }}>
                                    Игроков: {gridTeam1Players.length}
                                    <div style={{ marginTop: '5px', maxHeight: '100px', overflow: 'auto' }}>
                                        {gridTeam1Players.map(p => (
                                            <div key={p.id || p._id} style={{ padding: '2px 0' }}>• {p.name}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Команда 2</label>
                            <select
                                value={gridTeam2Id || ''}
                                onChange={(e) => setGridTeam2Id(e.target.value || null)}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                            >
                                <option value="">Выберите команду</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>{team.emoji || '👥'} {team.name}</option>
                                ))}
                            </select>
                            {gridTeam2Players.length > 0 && (
                                <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#888' }}>
                                    Игроков: {gridTeam2Players.length}
                                    <div style={{ marginTop: '5px', maxHeight: '100px', overflow: 'auto' }}>
                                        {gridTeam2Players.map(p => (
                                            <div key={p.id || p._id} style={{ padding: '2px 0' }}>• {p.name}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {gridTeam1Id && gridTeam2Id && gridTeam1Players.length > 0 && gridTeam2Players.length > 0 && (
                        <div style={{
                            background: '#2a2a2a', padding: '15px', borderRadius: '10px',
                            marginBottom: '20px', border: '1px solid #444'
                        }}>
                            <div style={{ color: '#c9a961', fontWeight: '600', marginBottom: '10px' }}>
                                📊 Предпросмотр сетки:
                            </div>
                            <div style={{ color: '#fff' }}>
                                Будет создано <strong style={{ color: '#9c27b0' }}>{gridTeam1Players.length * gridTeam2Players.length}</strong> матчей
                            </div>
                            <div style={{ color: '#888', marginTop: '5px', fontSize: '0.9em' }}>
                                ({gridTeam1Players.length} игроков × {gridTeam2Players.length} игроков)
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleGenerateGrid}
                        disabled={generatingGrid || !gridTeam1Id || !gridTeam2Id}
                        style={{
                            padding: '12px 24px', borderRadius: '8px',
                            background: generatingGrid ? '#666' : '#9c27b0', color: '#fff',
                            border: 'none', cursor: generatingGrid ? 'wait' : 'pointer', fontWeight: '600'
                        }}
                    >
                        {generatingGrid ? '⏳ Создание матчей...' : '🎯 Создать все матчи'}
                    </button>
                </div>
            )}

            {/* Smart MMR Matchmaking */}
            {showSmartMatchmaking && (
                <div style={{
                    background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                    marginBottom: '20px', border: '2px solid #ff9800'
                }}>
                    <h3 style={{ color: '#ff9800', marginBottom: '15px' }}>
                        🧠 Smart Matchmaking по MMR
                    </h3>
                    <p style={{ color: '#888', marginBottom: '20px', fontSize: '0.95em' }}>
                        Выберите команды — игроки будут распределены по соперникам на основе близости MMR.
                        Каждый игрок получит одного соперника из каждой выбранной команды с ближайшим MMR.
                    </p>

                    {/* Team selection */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', color: '#fff', fontWeight: '600' }}>
                            Выберите команды (минимум 2):
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {teams.map(team => {
                                const isSelected = smartSelectedTeams.includes(team.id);
                                const teamPlayersList = allPlayers.filter(p => p.teamId === team.id);
                                return (
                                    <button
                                        key={team.id}
                                        onClick={() => toggleSmartTeam(team.id)}
                                        style={{
                                            padding: '10px 18px', borderRadius: '10px',
                                            background: isSelected ? '#ff9800' : '#2a2a2a',
                                            color: isSelected ? '#000' : '#fff',
                                            border: isSelected ? '2px solid #ff9800' : '2px solid #444',
                                            cursor: 'pointer', fontWeight: '600',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {team.emoji || '👥'} {team.name} ({teamPlayersList.length})
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* MMR diff setting */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                            Макс. разница MMR (для подсветки): ±{smartMaxMmrDiff}
                        </label>
                        <input
                            type="range"
                            min="100"
                            max="500"
                            step="50"
                            value={smartMaxMmrDiff}
                            onChange={(e) => { setSmartMaxMmrDiff(Number(e.target.value)); setSmartPreview(null); }}
                            style={{ width: '300px', accentColor: '#ff9800' }}
                        />
                        <span style={{ color: '#888', marginLeft: '10px', fontSize: '0.9em' }}>
                            ({smartMaxMmrDiff} MMR)
                        </span>
                    </div>

                    {/* Selected teams preview */}
                    {smartSelectedTeams.length >= 2 && (
                        <div style={{
                            background: '#2a2a2a', padding: '15px', borderRadius: '10px',
                            marginBottom: '20px', border: '1px solid #444'
                        }}>
                            <div style={{ color: '#c9a961', fontWeight: '600', marginBottom: '10px' }}>
                                Выбранные команды ({smartSelectedTeams.length}):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                                {smartSelectedTeams.map(teamId => {
                                    const team = teams.find(t => t.id === teamId);
                                    const teamPlayersList = allPlayers.filter(p => p.teamId === teamId);
                                    return (
                                        <div key={teamId} style={{
                                            background: '#1a1a1a', padding: '10px 15px', borderRadius: '8px',
                                            border: '1px solid #ff9800', minWidth: '150px'
                                        }}>
                                            <div style={{ color: '#ff9800', fontWeight: '600', marginBottom: '5px' }}>
                                                {team ? `${team.emoji || '👥'} ${team.name}` : teamId}
                                            </div>
                                            <div style={{ fontSize: '0.85em', color: '#888', maxHeight: '80px', overflow: 'auto' }}>
                                                {teamPlayersList.sort((a, b) => (b.currentMmr || 0) - (a.currentMmr || 0)).map(p => (
                                                    <div key={p.id || p._id} style={{ padding: '1px 0' }}>
                                                        {p.name} — <span style={{ color: '#c9a961' }}>{p.currentMmr || 0} MMR</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Generate preview button */}
                    <button
                        onClick={handleSmartPreview}
                        disabled={smartLoading || smartSelectedTeams.length < 2}
                        style={{
                            padding: '12px 24px', borderRadius: '8px',
                            background: smartLoading || smartSelectedTeams.length < 2 ? '#666' : '#ff9800',
                            color: '#fff', border: 'none',
                            cursor: smartLoading || smartSelectedTeams.length < 2 ? 'not-allowed' : 'pointer',
                            fontWeight: '600', marginRight: '10px'
                        }}
                    >
                        {smartLoading ? '⏳ Подбор соперников...' : '🔍 Показать распределение'}
                    </button>

                    {/* Preview results */}
                    {smartPreview && (
                        <div style={{ marginTop: '20px' }}>
                            <div style={{
                                background: '#2a2a2a', padding: '15px', borderRadius: '10px',
                                marginBottom: '15px', border: '1px solid #444'
                            }}>
                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                    <div style={{ color: '#fff' }}>
                                        Всего матчей: <strong style={{ color: '#ff9800' }}>{smartPreview.totalMatches}</strong>
                                    </div>
                                    <div style={{ color: '#4caf50' }}>
                                        В пределах ±{smartPreview.maxMmrDiff}: <strong>{smartPreview.withinRange}</strong>
                                    </div>
                                    {smartPreview.outOfRange > 0 && (
                                        <div style={{ color: '#f44336' }}>
                                            Выше лимита: <strong>{smartPreview.outOfRange}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Match list grouped by team pairs */}
                            <div style={{ maxHeight: '400px', overflow: 'auto', marginBottom: '15px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #444' }}>
                                            <th style={{ padding: '8px', textAlign: 'left', color: '#888' }}>Команда 1</th>
                                            <th style={{ padding: '8px', textAlign: 'left', color: '#888' }}>Игрок 1</th>
                                            <th style={{ padding: '8px', textAlign: 'center', color: '#888' }}>MMR</th>
                                            <th style={{ padding: '8px', textAlign: 'center', color: '#888' }}>vs</th>
                                            <th style={{ padding: '8px', textAlign: 'center', color: '#888' }}>MMR</th>
                                            <th style={{ padding: '8px', textAlign: 'left', color: '#888' }}>Игрок 2</th>
                                            <th style={{ padding: '8px', textAlign: 'left', color: '#888' }}>Команда 2</th>
                                            <th style={{ padding: '8px', textAlign: 'center', color: '#888' }}>Разница</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {smartPreview.preview.map((match, idx) => {
                                            const t1 = smartPreview.teamNames[match.team1Id];
                                            const t2 = smartPreview.teamNames[match.team2Id];
                                            const diffColor = match.withinRange ? '#4caf50' : '#f44336';
                                            return (
                                                <tr key={idx} style={{
                                                    borderBottom: '1px solid #333',
                                                    background: match.withinRange ? 'rgba(76,175,80,0.05)' : 'rgba(244,67,54,0.05)'
                                                }}>
                                                    <td style={{ padding: '8px', color: '#888', fontSize: '0.85em' }}>
                                                        {t1 ? `${t1.emoji || ''} ${t1.name}` : ''}
                                                    </td>
                                                    <td style={{ padding: '8px', color: '#fff' }}>{match.player1Name}</td>
                                                    <td style={{ padding: '8px', textAlign: 'center', color: '#c9a961' }}>{match.player1Mmr}</td>
                                                    <td style={{ padding: '8px', textAlign: 'center', color: '#666' }}>vs</td>
                                                    <td style={{ padding: '8px', textAlign: 'center', color: '#c9a961' }}>{match.player2Mmr}</td>
                                                    <td style={{ padding: '8px', color: '#fff' }}>{match.player2Name}</td>
                                                    <td style={{ padding: '8px', color: '#888', fontSize: '0.85em' }}>
                                                        {t2 ? `${t2.emoji || ''} ${t2.name}` : ''}
                                                    </td>
                                                    <td style={{
                                                        padding: '8px', textAlign: 'center',
                                                        color: diffColor, fontWeight: '600'
                                                    }}>
                                                        ±{match.mmrDiff}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Confirm button */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={handleSmartConfirm}
                                    disabled={smartCreating}
                                    style={{
                                        padding: '12px 24px', borderRadius: '8px',
                                        background: smartCreating ? '#666' : '#4caf50', color: '#fff',
                                        border: 'none', cursor: smartCreating ? 'wait' : 'pointer',
                                        fontWeight: '600', fontSize: '1em'
                                    }}
                                >
                                    {smartCreating ? '⏳ Создание матчей...' : `✅ Создать ${smartPreview.withinRange} матчей`}
                                </button>
                                <button
                                    onClick={() => setSmartPreview(null)}
                                    style={{
                                        padding: '12px 24px', borderRadius: '8px',
                                        background: '#333', color: '#fff',
                                        border: '1px solid #555', cursor: 'pointer', fontWeight: '600'
                                    }}
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showForm && (
                <div style={{
                    background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                    marginBottom: '20px', border: '1px solid #c9a961'
                }}>
                    <h3 style={{ color: '#c9a961', marginBottom: '20px' }}>
                        Новый командный матч
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Команда 1</label>
                                <select
                                    value={formData.team1Id || ''}
                                    onChange={(e) => setFormData({...formData, team1Id: e.target.value || null, player1Id: null})}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                    }}
                                    required
                                >
                                    <option value="">Выберите команду</option>
                                    {teams.map(team => (
                                        <option key={team.id} value={team.id}>{team.emoji} {team.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Команда 2</label>
                                <select
                                    value={formData.team2Id || ''}
                                    onChange={(e) => setFormData({...formData, team2Id: e.target.value || null, player2Id: null})}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                    }}
                                    required
                                >
                                    <option value="">Выберите команду</option>
                                    {teams.map(team => (
                                        <option key={team.id} value={team.id}>{team.emoji} {team.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Игрок из команды 1</label>
                                <select
                                    value={formData.player1Id || ''}
                                    onChange={(e) => setFormData({...formData, player1Id: e.target.value || null})}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                    }}
                                    required
                                    disabled={!formData.team1Id}
                                >
                                    <option value="">Выберите игрока</option>
                                    {team1Players.map(player => (
                                        <option key={player.id} value={player.id}>{player.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Игрок из команды 2</label>
                                <select
                                    value={formData.player2Id || ''}
                                    onChange={(e) => setFormData({...formData, player2Id: e.target.value || null})}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                    }}
                                    required
                                    disabled={!formData.team2Id}
                                >
                                    <option value="">Выберите игрока</option>
                                    {team2Players.map(player => (
                                        <option key={player.id} value={player.id}>{player.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>🏠 Домашний игрок (организатор)</label>
                            <select
                                value={formData.homePlayerId || ''}
                                onChange={(e) => setFormData({...formData, homePlayerId: e.target.value || null})}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                disabled={!formData.player1Id || !formData.player2Id}
                            >
                                <option value="">Случайный выбор</option>
                                {formData.player1Id && (
                                    <option value={formData.player1Id}>
                                        {allPlayers.find(p => p.id === formData.player1Id)?.name || 'Игрок 1'}
                                    </option>
                                )}
                                {formData.player2Id && (
                                    <option value={formData.player2Id}>
                                        {allPlayers.find(p => p.id === formData.player2Id)?.name || 'Игрок 2'}
                                    </option>
                                )}
                            </select>
                            <div style={{ fontSize: '0.85em', color: '#888', marginTop: '5px' }}>
                                Домашний игрок создаёт лобби, назначает время и репортит результат. Если не выбран — назначится случайно.
                            </div>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Статус матча</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                required
                            >
                                <option value="upcoming">🕐 Предстоящий</option>
                                <option value="completed">✅ Завершен</option>
                            </select>
                        </div>
                        {formData.status === 'upcoming' && (
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Дата и время матча</label>
                                <input
                                    type="datetime-local"
                                    value={formData.scheduledDate}
                                    onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        border: '1px solid #444', background: '#2a2a2a', color: '#fff',
                                        colorScheme: 'dark'
                                    }}
                                />
                            </div>
                        )}
                        {formData.status === 'completed' && (
                            <>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Победитель</label>
                                    <select
                                        value={formData.winnerId || ''}
                                        onChange={(e) => setFormData({...formData, winnerId: e.target.value || null})}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: '8px',
                                            border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                        }}
                                        required
                                    >
                                        <option value="">Выберите победителя</option>
                                        {formData.player1Id && (
                                            <option value={formData.player1Id}>
                                                {players.find(p => p.id === formData.player1Id)?.name}
                                            </option>
                                        )}
                                        {formData.player2Id && (
                                            <option value={formData.player2Id}>
                                                {players.find(p => p.id === formData.player2Id)?.name}
                                            </option>
                                        )}
                                    </select>
                                </div>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Очки за победу</label>
                                    <input
                                        type="number"
                                        value={formData.points}
                                        onChange={(e) => setFormData({...formData, points: parseInt(e.target.value) || 0})}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: '8px',
                                            border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                        }}
                                        min="1"
                                        required
                                    />
                                </div>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                                        📺 W3Champions Match ID (для FlowTV, опционально)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.w3championsMatchId}
                                        onChange={(e) => setFormData({...formData, w3championsMatchId: e.target.value})}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: '8px',
                                            border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                        }}
                                        placeholder="Например: 5f9a8b7c6d5e4f3a2b1c0d9e"
                                    />
                                    <div style={{ fontSize: '0.85em', color: '#888', marginTop: '5px' }}>
                                        💡 Найдите матч на w3champions.com и скопируйте ID из URL
                                    </div>
                                </div>
                            </>
                        )}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Заметки (опционально)</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff',
                                    minHeight: '80px'
                                }}
                                placeholder="Дополнительная информация о матче..."
                            />
                        </div>
                        <button
                            type="submit"
                            style={{
                                padding: '12px 24px', borderRadius: '8px',
                                background: '#c9a961', color: '#000',
                                border: 'none', cursor: 'pointer', fontWeight: '600'
                            }}
                        >
                            Создать матч
                        </button>
                    </form>
                </div>
            )}

            {/* Filter panel */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="🔍 Поиск по игроку или команде..."
                    value={matchFilter}
                    onChange={e => setMatchFilter(e.target.value)}
                    style={{
                        flex: 1, minWidth: '200px', padding: '10px 14px',
                        background: '#1a1a1a', color: '#fff', border: '1px solid #444',
                        borderRadius: '8px', fontSize: '0.95em'
                    }}
                />
                {['all', 'upcoming', 'completed'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        style={{
                            padding: '10px 18px', borderRadius: '8px', border: 'none',
                            cursor: 'pointer', fontWeight: '600', fontSize: '0.9em',
                            background: filterStatus === s ? '#c9a961' : '#2a2a2a',
                            color: filterStatus === s ? '#000' : '#aaa'
                        }}
                    >
                        {s === 'all' ? 'Все' : s === 'upcoming' ? '🕐 Предстоящие' : '✅ Завершённые'}
                    </button>
                ))}
            </div>

            <div>
                {teamMatches.length === 0 && (
                    <div style={{
                        padding: '40px', textAlign: 'center', color: '#888',
                        background: '#1a1a1a', borderRadius: '15px'
                    }}>
                        Матчей пока нет
                    </div>
                )}
                {(() => {
                    const filterLower = matchFilter.toLowerCase();
                    const filtered = teamMatches.slice().reverse().filter(match => {
                        if (filterStatus !== 'all' && match.status !== filterStatus) return false;
                        if (!filterLower) return true;
                        const p1 = allPlayers.find(p => p.id === match.player1Id);
                        const p2 = allPlayers.find(p => p.id === match.player2Id);
                        const t1 = teams.find(t => t.id === match.team1Id);
                        const t2 = teams.find(t => t.id === match.team2Id);
                        return [p1?.name, p2?.name, t1?.name, t2?.name].some(v => v?.toLowerCase().includes(filterLower));
                    });
                    if (filtered.length === 0) return (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#888', background: '#1a1a1a', borderRadius: '15px' }}>
                            Матчей не найдено
                        </div>
                    );
                    return filtered.map(match => {
                    const team1 = teams.find(t => t.id === match.team1Id);
                    const team2 = teams.find(t => t.id === match.team2Id);
                    const player1 = allPlayers.find(p => p.id === match.player1Id);
                    const player2 = allPlayers.find(p => p.id === match.player2Id);
                    
                    return (
                        <div key={match.id} style={{
                            background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                            marginBottom: '15px', border: '1px solid #333'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div>
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '4px 12px',
                                        background: match.status === 'upcoming' ? '#2196f3' : '#4caf50',
                                        color: '#fff',
                                        borderRadius: '15px',
                                        fontSize: '0.85em',
                                        fontWeight: '600',
                                        marginBottom: '5px'
                                    }}>
                                        {match.status === 'upcoming' ? '🕐 Предстоящий' : '✅ Завершён'}
                                    </div>
                                    {match.status === 'upcoming' && match.scheduledDate && (
                                        <div style={{ color: '#c9a961', fontSize: '0.9em', marginTop: '5px' }}>
                                            📅 {new Date(match.scheduledDate).toLocaleString('ru-RU', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    )}
                                    {match.status === 'completed' && (
                                        <div style={{ color: '#888', fontSize: '0.9em', marginTop: '5px' }}>
                                            {new Date(match.createdAt).toLocaleDateString('ru-RU')}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {match.status === 'completed' && (
                                        <div style={{
                                            padding: '5px 15px', background: '#c9a961',
                                            color: '#000', borderRadius: '20px', fontWeight: '600'
                                        }}>
                                            +{match.points} pts
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleDelete(match.id)}
                                        style={{
                                            padding: '5px 10px', borderRadius: '8px',
                                            background: '#f44336', color: '#fff',
                                            border: 'none', cursor: 'pointer', fontSize: '0.9em'
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    {team1?.logo ? (
                                        <img
                                            src={team1.logo}
                                            alt={team1.name}
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '10px',
                                                objectFit: 'cover',
                                                margin: '0 auto 5px'
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextElementSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : null}
                                    <div style={{ fontSize: '1.5em', marginBottom: '5px', display: team1?.logo ? 'none' : 'block' }}>{team1?.emoji}</div>
                                    <div style={{ fontWeight: (match.winnerId === match.player1Id) ? '700' : '400', color: (match.winnerId === match.player1Id) ? '#4caf50' : '#888' }}>
                                        {team1?.name}
                                    </div>
                                    <div style={{ color: '#c9a961', fontSize: '0.9em' }}>
                                        {player1?.name}
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.5em', fontWeight: '800', color: '#c9a961', padding: '0 20px' }}>
                                    VS
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    {team2?.logo ? (
                                        <img
                                            src={team2.logo}
                                            alt={team2.name}
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '10px',
                                                objectFit: 'cover',
                                                margin: '0 auto 5px'
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextElementSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : null}
                                    <div style={{ fontSize: '1.5em', marginBottom: '5px', display: team2?.logo ? 'none' : 'block' }}>{team2?.emoji}</div>
                                    <div style={{ fontWeight: (match.winnerId === match.player2Id) ? '700' : '400', color: (match.winnerId === match.player2Id) ? '#4caf50' : '#888' }}>
                                        {team2?.name}
                                    </div>
                                    <div style={{ color: '#c9a961', fontSize: '0.9em' }}>
                                        {player2?.name}
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
                            {/* Home player indicator with change button */}
                            <div style={{
                                marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'
                            }}>
                                {match.homePlayerId && (
                                    <div style={{
                                        padding: '8px 12px', background: '#2a2a2a',
                                        borderRadius: '8px', color: '#c9a961', fontSize: '0.85em',
                                        display: 'inline-block'
                                    }}>
                                        🏠 Домашний игрок: {allPlayers.find(p => p.id === match.homePlayerId)?.name || 'Не определён'}
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        const p1Name = player1?.name || 'Игрок 1';
                                        const p2Name = player2?.name || 'Игрок 2';
                                        const currentHome = match.homePlayerId === match.player1Id ? '1' : match.homePlayerId === match.player2Id ? '2' : '?';
                                        const choice = prompt(
                                            `Сменить домашнего игрока:\n\n1 - ${p1Name}${currentHome === '1' ? ' (текущий 🏠)' : ''}\n2 - ${p2Name}${currentHome === '2' ? ' (текущий 🏠)' : ''}\n\nВведите 1 или 2:`
                                        );
                                        if (choice === '1' || choice === '2') {
                                            const newHomePlayerId = choice === '1' ? match.player1Id : match.player2Id;
                                            fetch(`${API_BASE}/api/admin/team-matches/${match.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
                                                body: JSON.stringify({ homePlayerId: newHomePlayerId })
                                            }).then(() => onUpdate());
                                        }
                                    }}
                                    style={{
                                        padding: '6px 14px', borderRadius: '8px',
                                        background: '#c9a961', color: '#000',
                                        border: 'none', cursor: 'pointer', fontSize: '0.85em',
                                        fontWeight: '600'
                                    }}
                                >
                                    🏠 Сменить домашнего
                                </button>
                            </div>
                            {/* Edit buttons for upcoming matches */}
                            {match.status === 'upcoming' && (
                                <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {match.pointsOverride != null && (
                                        <div style={{
                                            padding: '5px 12px', background: '#9c27b0', color: '#fff',
                                            borderRadius: '15px', fontSize: '0.85em', fontWeight: '600',
                                            display: 'flex', alignItems: 'center', gap: '6px'
                                        }}>
                                            🎯 Override: {match.pointsOverride} pts
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            const val = prompt(
                                                `Установить фиксированные очки за победу в этом матче.\nТекущий override: ${match.pointsOverride != null ? match.pointsOverride : 'нет (авто по ММР)'}\n\nВведите количество очков (или оставьте пустым чтобы убрать override):`,
                                                match.pointsOverride != null ? String(match.pointsOverride) : '50'
                                            );
                                            if (val === null) return;
                                            const override = val.trim() === '' ? null : parseInt(val);
                                            fetch(`${API_BASE}/api/admin/team-matches/${match.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
                                                body: JSON.stringify({ pointsOverride: override })
                                            }).then(() => onUpdate());
                                        }}
                                        style={{
                                            padding: '8px 16px', borderRadius: '8px',
                                            background: '#9c27b0', color: '#fff',
                                            border: 'none', cursor: 'pointer', fontSize: '0.9em'
                                        }}
                                    >
                                        🎯 {match.pointsOverride != null ? 'Изменить override' : 'Задать override очков'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const date = prompt('Введите дату и время (ГГГГ-ММ-ДД ЧЧ:ММ):',
                                                match.scheduledDate ? new Date(match.scheduledDate).toISOString().slice(0, 16).replace('T', ' ') : '');
                                            if (date) {
                                                fetch(`${API_BASE}/api/admin/team-matches/${match.id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
                                                    body: JSON.stringify({ scheduledDate: new Date(date.replace(' ', 'T')) })
                                                }).then(() => onUpdate());
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
                                            const winnerId = prompt(`Кто победил?\n1 - ${player1?.name}\n2 - ${player2?.name}\n\nВведите 1 или 2:`);
                                            if (winnerId === '1' || winnerId === '2') {
                                                const points = parseInt(prompt('Введите количество очков:', '50')) || 50;
                                                fetch(`${API_BASE}/api/admin/team-matches/${match.id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
                                                    body: JSON.stringify({
                                                        winnerId: winnerId === '1' ? match.player1Id : match.player2Id,
                                                        points: points,
                                                        status: 'completed'
                                                    })
                                                }).then(() => onUpdate());
                                            }
                                        }}
                                        style={{
                                            padding: '8px 16px', borderRadius: '8px',
                                            background: '#4caf50', color: '#fff',
                                            border: 'none', cursor: 'pointer', fontSize: '0.9em'
                                        }}
                                    >
                                        🏆 Указать победителя
                                    </button>
                                </div>
                            )}
                            {/* Edit buttons for completed matches */}
                            {match.status === 'completed' && (
                                <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => {
                                            if (confirm('Отменить результат матча? Матч будет возвращён в статус "Ожидание"')) {
                                                fetch(`${API_BASE}/api/admin/team-matches/${match.id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
                                                    body: JSON.stringify({
                                                        status: 'upcoming',
                                                        winnerId: null,
                                                        points: 0
                                                    })
                                                }).then(() => onUpdate());
                                            }
                                        }}
                                        style={{
                                            padding: '8px 16px', borderRadius: '8px',
                                            background: '#ff9800', color: '#fff',
                                            border: 'none', cursor: 'pointer', fontSize: '0.9em'
                                        }}
                                    >
                                        🔄 Отменить результат
                                    </button>
                                    <button
                                        onClick={() => {
                                            const winnerId = prompt(`Изменить победителя?\n1 - ${player1?.name} (победил)\n2 - ${player2?.name} (победил)\n\nВведите 1 или 2 или отмена:`);
                                            if (winnerId === '1' || winnerId === '2') {
                                                const points = parseInt(prompt('Введите количество очков:', String(match.points))) || match.points;
                                                fetch(`${API_BASE}/api/admin/team-matches/${match.id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
                                                    body: JSON.stringify({
                                                        winnerId: winnerId === '1' ? match.player1Id : match.player2Id,
                                                        points: points
                                                    })
                                                }).then(() => onUpdate());
                                            }
                                        }}
                                        style={{
                                            padding: '8px 16px', borderRadius: '8px',
                                            background: '#2196f3', color: '#fff',
                                            border: 'none', cursor: 'pointer', fontSize: '0.9em'
                                        }}
                                    >
                                        ✏️ Изменить результат
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                });
                })()}
            </div>
        </div>
    );
}

// ==================== ADMIN STREAMERS ====================
function AdminStreamers({ sessionId, onUpdate }) {
    const [streamers, setStreamers] = React.useState([]);
    const [showForm, setShowForm] = React.useState(false);
    const [formData, setFormData] = React.useState({
        name: '', twitchUsername: '', avatarUrl: ''
    });
    const [editingId, setEditingId] = React.useState(null);

    React.useEffect(() => {
        fetchStreamers();
    }, []);

    const fetchStreamers = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/streamers`);
            const data = await response.json();
            setStreamers(data);
        } catch (error) {
            console.error('Error fetching streamers:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const url = editingId
            ? `${API_BASE}/api/admin/streamers/${editingId}`
            : `${API_BASE}/api/admin/streamers`;

        const method = editingId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setShowForm(false);
                setFormData({ name: '', twitchUsername: '', avatarUrl: '' });
                setEditingId(null);
                fetchStreamers();
            } else {
                alert('Ошибка при сохранении стримера');
            }
        } catch (error) {
            console.error('Error saving streamer:', error);
            alert('Ошибка при сохранении стримера');
        }
    };

    const handleEdit = (streamer) => {
        setFormData({
            name: streamer.name,
            twitchUsername: streamer.twitchUsername,
            avatarUrl: streamer.avatarUrl || ''
        });
        setEditingId(streamer.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Удалить стримера?')) return;

        try {
            const response = await fetch(`${API_BASE}/api/admin/streamers/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId }
            });

            if (response.ok) {
                fetchStreamers();
            } else {
                alert('Ошибка при удалении стримера');
            }
        } catch (error) {
            console.error('Error deleting streamer:', error);
            alert('Ошибка при удалении стримера');
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setFormData({ name: '', twitchUsername: '', avatarUrl: '' });
        setEditingId(null);
    };

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        padding: '12px 24px', borderRadius: '8px',
                        background: '#4caf50', color: '#fff',
                        border: 'none', cursor: 'pointer', fontWeight: '600'
                    }}
                >
                    {showForm ? '❌ Отмена' : '➕ Добавить стримера'}
                </button>
            </div>

            {showForm && (
                <div style={{
                    background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                    marginBottom: '20px', border: '1px solid #c9a961'
                }}>
                    <h3 style={{ color: '#c9a961', marginBottom: '20px' }}>
                        {editingId ? 'Редактировать стримера' : 'Добавить стримера'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                                Имя стримера
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                placeholder="Имя"
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                                Twitch Username
                            </label>
                            <input
                                type="text"
                                value={formData.twitchUsername}
                                onChange={(e) => setFormData({ ...formData, twitchUsername: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                placeholder="twitchusername"
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                                URL аватара (опционально)
                            </label>
                            <input
                                type="text"
                                value={formData.avatarUrl}
                                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                placeholder="https://example.com/avatar.jpg"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="submit"
                                style={{
                                    padding: '12px 24px', borderRadius: '8px',
                                    background: '#4caf50', color: '#fff',
                                    border: 'none', cursor: 'pointer', fontWeight: '600'
                                }}
                            >
                                {editingId ? '💾 Сохранить' : '➕ Добавить'}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    style={{
                                        padding: '12px 24px', borderRadius: '8px',
                                        background: '#666', color: '#fff',
                                        border: 'none', cursor: 'pointer', fontWeight: '600'
                                    }}
                                >
                                    ❌ Отмена
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {streamers.map(streamer => (
                    <div key={streamer.id} style={{
                        background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                        border: '1px solid #444'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                            {streamer.avatarUrl ? (
                                <img
                                    src={streamer.avatarUrl}
                                    alt={streamer.name}
                                    style={{
                                        width: '60px', height: '60px', borderRadius: '50%',
                                        objectFit: 'cover', border: '2px solid #c9a961'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '50%',
                                    background: '#c9a961', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '2em'
                                }}>
                                    📺
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.2em', fontWeight: '700', color: '#fff' }}>
                                    {streamer.name}
                                </div>
                                <div style={{ color: '#9146FF', fontSize: '0.9em', marginTop: '5px' }}>
                                    twitch.tv/{streamer.twitchUsername}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => handleEdit(streamer)}
                                style={{
                                    flex: 1, padding: '8px 16px', borderRadius: '8px',
                                    background: '#2196f3', color: '#fff',
                                    border: 'none', cursor: 'pointer', fontWeight: '600'
                                }}
                            >
                                ✏️ Изменить
                            </button>
                            <button
                                onClick={() => handleDelete(streamer.id)}
                                style={{
                                    flex: 1, padding: '8px 16px', borderRadius: '8px',
                                    background: '#f44336', color: '#fff',
                                    border: 'none', cursor: 'pointer', fontWeight: '600'
                                }}
                            >
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {streamers.length === 0 && !showForm && (
                <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    color: '#666', fontSize: '1.1em'
                }}>
                    Нет стримеров. Нажмите "➕ Добавить стримера" чтобы добавить.
                </div>
            )}
        </div>
    );
}

// ==================== ADMIN PORTRAITS ====================
function AdminPortraits({ sessionId, onUpdate }) {
    const [portraits, setPortraits] = React.useState([]);
    const [showForm, setShowForm] = React.useState(false);
    const [formData, setFormData] = React.useState({
        name: '', race: 1, pointsRequired: 0, imageUrl: ''
    });
    const [editingId, setEditingId] = React.useState(null);

    const raceNames = {
        0: '🎲 Рандом',
        1: '👑 Хумы',
        2: '⚔️ Орки',
        4: '🌙 Эльфы',
        8: '💀 Андеды'
    };

    React.useEffect(() => {
        fetchPortraits();
    }, []);

    const fetchPortraits = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/portraits`);
            const data = await response.json();
            setPortraits(data);
        } catch (error) {
            console.error('Error fetching portraits:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const url = editingId
            ? `${API_BASE}/api/admin/portraits/${editingId}`
            : `${API_BASE}/api/admin/portraits`;

        const method = editingId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify({
                    ...formData,
                    race: parseInt(formData.race),
                    pointsRequired: parseInt(formData.pointsRequired)
                })
            });

            if (response.ok) {
                setShowForm(false);
                setFormData({ name: '', race: 1, pointsRequired: 0, imageUrl: '' });
                setEditingId(null);
                fetchPortraits();
            } else {
                alert('Ошибка при сохранении портрета');
            }
        } catch (error) {
            console.error('Error saving portrait:', error);
            alert('Ошибка при сохранении портрета');
        }
    };

    const handleEdit = (portrait) => {
        setFormData({
            name: portrait.name,
            race: portrait.race,
            pointsRequired: portrait.pointsRequired,
            imageUrl: portrait.imageUrl
        });
        setEditingId(portrait.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Удалить портрет?')) return;

        try {
            const response = await fetch(`${API_BASE}/api/admin/portraits/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId }
            });

            if (response.ok) {
                fetchPortraits();
            } else {
                alert('Ошибка при удалении портрета');
            }
        } catch (error) {
            console.error('Error deleting portrait:', error);
            alert('Ошибка при удалении портрета');
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setFormData({ name: '', race: 1, pointsRequired: 0, imageUrl: '' });
        setEditingId(null);
    };

    // Group portraits by race
    const portraitsByRace = portraits.reduce((acc, portrait) => {
        if (!acc[portrait.race]) {
            acc[portrait.race] = [];
        }
        acc[portrait.race].push(portrait);
        return acc;
    }, {});

    // Sort portraits within each race by pointsRequired
    Object.keys(portraitsByRace).forEach(race => {
        portraitsByRace[race].sort((a, b) => a.pointsRequired - b.pointsRequired);
    });

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        padding: '12px 24px', borderRadius: '8px',
                        background: '#4caf50', color: '#fff',
                        border: 'none', cursor: 'pointer', fontWeight: '600'
                    }}
                >
                    {showForm ? '❌ Отмена' : '➕ Добавить портрет'}
                </button>
            </div>

            <div style={{
                background: '#2a2a2a', padding: '20px', borderRadius: '12px',
                marginBottom: '20px', border: '2px solid #c9a961'
            }}>
                <h3 style={{ color: '#c9a961', marginBottom: '10px' }}>ℹ️ Требования к портретам:</h3>
                <ul style={{ color: '#e0e0e0', lineHeight: '1.8' }}>
                    <li>Рекомендуемый размер: <strong>128x128 пикселей</strong></li>
                    <li>Формат: PNG или JPG</li>
                    <li>Портреты разблокируются автоматически при достижении указанного количества очков</li>
                    <li>Каждый портрет привязан к определенной расе</li>
                </ul>
            </div>

            {showForm && (
                <div style={{
                    background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                    marginBottom: '20px', border: '1px solid #c9a961'
                }}>
                    <h3 style={{ color: '#c9a961', marginBottom: '20px' }}>
                        {editingId ? 'Редактировать портрет' : 'Добавить портрет'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                                Название портрета
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                placeholder="Например: Орочий Вождь"
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                                Раса
                            </label>
                            <select
                                value={formData.race}
                                onChange={(e) => setFormData({ ...formData, race: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                required
                            >
                                <option value={0}>🎲 Рандом</option>
                                <option value={1}>👑 Хумы</option>
                                <option value={2}>⚔️ Орки</option>
                                <option value={4}>🌙 Эльфы</option>
                                <option value={8}>💀 Андеды</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                                Очки для разблокировки
                            </label>
                            <input
                                type="number"
                                value={formData.pointsRequired}
                                onChange={(e) => setFormData({ ...formData, pointsRequired: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                placeholder="1000"
                                required
                                min="0"
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                                URL изображения
                            </label>
                            <input
                                type="text"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                placeholder="https://example.com/portrait.png"
                                required
                            />
                            {formData.imageUrl && (
                                <div style={{ marginTop: '10px' }}>
                                    <img
                                        src={formData.imageUrl}
                                        alt="Превью"
                                        style={{
                                            width: '128px', height: '128px',
                                            objectFit: 'cover', borderRadius: '8px',
                                            border: '2px solid #c9a961'
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="submit"
                                style={{
                                    padding: '12px 24px', borderRadius: '8px',
                                    background: '#4caf50', color: '#fff',
                                    border: 'none', cursor: 'pointer', fontWeight: '600'
                                }}
                            >
                                {editingId ? '💾 Сохранить' : '➕ Добавить'}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    style={{
                                        padding: '12px 24px', borderRadius: '8px',
                                        background: '#666', color: '#fff',
                                        border: 'none', cursor: 'pointer', fontWeight: '600'
                                    }}
                                >
                                    ❌ Отмена
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {Object.keys(portraitsByRace).length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    color: '#666', fontSize: '1.1em'
                }}>
                    Нет портретов. Нажмите "➕ Добавить портрет" чтобы добавить.
                </div>
            ) : (
                Object.entries(portraitsByRace).map(([race, racePortraits]) => (
                    <div key={race} style={{ marginBottom: '40px' }}>
                        <h3 style={{
                            color: '#c9a961', fontSize: '1.5em', marginBottom: '20px',
                            display: 'flex', alignItems: 'center', gap: '10px'
                        }}>
                            {raceNames[race] || `Раса ${race}`}
                            <span style={{ color: '#666', fontSize: '0.8em', fontWeight: '400' }}>
                                ({racePortraits.length} портретов)
                            </span>
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                            gap: '20px'
                        }}>
                            {racePortraits.map(portrait => (
                                <div key={portrait.id} style={{
                                    background: '#1a1a1a', padding: '15px', borderRadius: '12px',
                                    border: '1px solid #444'
                                }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '15px',
                                        marginBottom: '15px'
                                    }}>
                                        <img
                                            src={portrait.imageUrl}
                                            alt={portrait.name}
                                            style={{
                                                width: '80px', height: '80px',
                                                objectFit: 'cover', borderRadius: '8px',
                                                border: '2px solid #c9a961'
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontSize: '1.1em', fontWeight: '700', color: '#fff',
                                                marginBottom: '5px'
                                            }}>
                                                {portrait.name}
                                            </div>
                                            <div style={{
                                                color: '#c9a961', fontSize: '0.95em', fontWeight: '600'
                                            }}>
                                                {portrait.pointsRequired} очков
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => handleEdit(portrait)}
                                            style={{
                                                flex: 1, padding: '8px 12px', borderRadius: '8px',
                                                background: '#2196f3', color: '#fff',
                                                border: 'none', cursor: 'pointer', fontWeight: '600',
                                                fontSize: '0.9em'
                                            }}
                                        >
                                            ✏️ Изменить
                                        </button>
                                        <button
                                            onClick={() => handleDelete(portrait.id)}
                                            style={{
                                                flex: 1, padding: '8px 12px', borderRadius: '8px',
                                                background: '#f44336', color: '#fff',
                                                border: 'none', cursor: 'pointer', fontWeight: '600',
                                                fontSize: '0.9em'
                                            }}
                                        >
                                            🗑️ Удалить
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

// ==================== ADMIN POINTS ====================
function AdminPoints({ players, sessionId, onUpdate }) {
    const [selectedPlayer, setSelectedPlayer] = React.useState('');
    const [pointsAmount, setPointsAmount] = React.useState('');
    const [reason, setReason] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [history, setHistory] = React.useState([]);
    const [historyLoading, setHistoryLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');

    // Load all manual points history
    const loadHistory = async () => {
        try {
            setHistoryLoading(true);
            const response = await fetch(`${API_BASE}/api/admin/manual-points`, {
                headers: { 'x-session-id': sessionId }
            });
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (error) {
            console.error('Error loading points history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    React.useEffect(() => {
        loadHistory();
    }, []);

    const handleAddPoints = async (e) => {
        e.preventDefault();
        if (!selectedPlayer || !pointsAmount || !reason) {
            setMessage('Заполните все поля');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/admin/players/${selectedPlayer}/add-points`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify({
                    amount: parseInt(pointsAmount),
                    reason: reason
                })
            });

            if (response.ok) {
                const data = await response.json();
                const player = players.find(p => p.id === selectedPlayer);
                setMessage(`✅ ${pointsAmount > 0 ? '+' : ''}${pointsAmount} очков для ${player?.name || 'игрока'}${data.newPoints !== null ? ` (итого: ${data.newPoints})` : ''}`);
                setSelectedPlayer('');
                setPointsAmount('');
                setReason('');
                onUpdate();
                loadHistory();
            } else {
                const error = await response.json();
                setMessage(`❌ Ошибка: ${error.error || 'Не удалось добавить очки'}`);
            }
        } catch (error) {
            setMessage(`❌ Ошибка подключения: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAdjustment = async (adjustmentId) => {
        if (!confirm('Удалить эту запись? Очки будут отменены.')) return;

        try {
            const response = await fetch(`${API_BASE}/api/admin/manual-points/${adjustmentId}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId }
            });

            if (response.ok) {
                setMessage('✅ Запись удалена, очки отменены');
                onUpdate();
                loadHistory();
            } else {
                setMessage('❌ Не удалось удалить запись');
            }
        } catch (error) {
            setMessage(`❌ Ошибка: ${error.message}`);
        }
    };

    const getPlayerName = (battleTag) => {
        const player = players.find(p => p.battleTag === battleTag);
        return player ? player.name : battleTag;
    };

    const filteredPlayers = players ? players.filter(player => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (player.name && player.name.toLowerCase().includes(q)) ||
               (player.battleTag && player.battleTag.toLowerCase().includes(q));
    }) : [];

    const totalManualPoints = history.reduce((sum, adj) => sum + adj.amount, 0);

    return (
        <div style={{
            background: '#1a1a1a', padding: '25px', borderRadius: '15px',
            border: '2px solid #c9a961'
        }}>
            <h3 style={{ fontSize: '1.5em', color: '#c9a961', marginBottom: '20px' }}>
                💎 Добавление очков игрокам
            </h3>

            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                {/* Left: Form */}
                <form onSubmit={handleAddPoints} style={{ flex: '1', minWidth: '320px', maxWidth: '500px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#fff', fontWeight: '600' }}>
                            Поиск игрока
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Введите имя или BattleTag..."
                            style={{
                                width: '100%', padding: '10px 12px', borderRadius: '8px',
                                border: '1px solid #444', background: '#2a2a2a',
                                color: '#fff', fontSize: '14px', marginBottom: '8px'
                            }}
                        />
                        <select
                            value={selectedPlayer}
                            onChange={(e) => setSelectedPlayer(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                border: '1px solid #444', background: '#2a2a2a',
                                color: '#fff', fontSize: '16px', cursor: 'pointer'
                            }}
                        >
                            <option value="">-- Выберите игрока --</option>
                            {filteredPlayers.map(player => (
                                <option key={player.id} value={player.id}>
                                    {player.name} ({player.battleTag}) — MMR: {player.currentMmr || 0}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#fff', fontWeight: '600' }}>
                            Количество очков (отрицательное для снятия)
                        </label>
                        <input
                            type="number"
                            value={pointsAmount}
                            onChange={(e) => setPointsAmount(e.target.value)}
                            placeholder="Например: 50 или -30"
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                border: '1px solid #444', background: '#2a2a2a',
                                color: '#fff', fontSize: '16px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#fff', fontWeight: '600' }}>
                            Причина
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Например: Бонус за активность тренера"
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                border: '1px solid #444', background: '#2a2a2a',
                                color: '#fff', fontSize: '16px'
                            }}
                        />
                    </div>

                    {message && (
                        <div style={{
                            padding: '12px', background: message.includes('✅') ? '#2e7d32' : '#c62828',
                            color: '#fff', borderRadius: '8px', marginBottom: '20px',
                            textAlign: 'center', fontWeight: '600'
                        }}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px',
                            background: loading ? '#666' : '#4caf50', color: '#fff',
                            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: '600', fontSize: '16px'
                        }}
                    >
                        {loading ? '⏳ Добавляю...' : '✅ Добавить очки'}
                    </button>

                    <div style={{
                        marginTop: '20px', padding: '15px', background: '#2a2a2a',
                        borderRadius: '10px', border: '1px solid #444'
                    }}>
                        <h4 style={{ color: '#c9a961', marginBottom: '10px', fontSize: '0.95em' }}>ℹ️ Информация</h4>
                        <ul style={{ color: '#e0e0e0', lineHeight: '1.8', fontSize: '0.9em', paddingLeft: '20px' }}>
                            <li>Очки сохраняются при пересчёте статистики</li>
                            <li>Используйте отрицательные значения для снятия</li>
                            <li>Все изменения логируются с причиной</li>
                            <li>Записи можно удалить — очки будут отменены</li>
                        </ul>
                    </div>
                </form>

                {/* Right: History */}
                <div style={{ flex: '1.5', minWidth: '400px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h4 style={{ color: '#c9a961', margin: 0 }}>
                            📋 История ({history.length} записей)
                        </h4>
                        {history.length > 0 && (
                            <span style={{
                                color: totalManualPoints >= 0 ? '#4caf50' : '#f44336',
                                fontWeight: '600', fontSize: '0.95em'
                            }}>
                                Итого: {totalManualPoints > 0 ? '+' : ''}{totalManualPoints} очков
                            </span>
                        )}
                    </div>

                    {historyLoading ? (
                        <div style={{ color: '#888', textAlign: 'center', padding: '30px' }}>
                            ⏳ Загрузка истории...
                        </div>
                    ) : history.length === 0 ? (
                        <div style={{
                            color: '#888', textAlign: 'center', padding: '30px',
                            background: '#2a2a2a', borderRadius: '10px', border: '1px solid #333'
                        }}>
                            Нет записей о ручном добавлении очков
                        </div>
                    ) : (
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {history.map(adj => (
                                <div key={adj.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 15px', background: '#2a2a2a', borderRadius: '8px',
                                    marginBottom: '8px', border: '1px solid #333'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                            <span style={{ color: '#fff', fontWeight: '600' }}>
                                                {getPlayerName(adj.battleTag)}
                                            </span>
                                            <span style={{
                                                color: adj.amount >= 0 ? '#4caf50' : '#f44336',
                                                fontWeight: '700', fontSize: '1.1em'
                                            }}>
                                                {adj.amount > 0 ? '+' : ''}{adj.amount}
                                            </span>
                                        </div>
                                        <div style={{ color: '#aaa', fontSize: '0.85em' }}>
                                            {adj.reason} — {new Date(adj.createdAt).toLocaleString('ru-RU')}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteAdjustment(adj.id)}
                                        style={{
                                            padding: '6px 12px', borderRadius: '6px',
                                            background: '#f44336', color: '#fff', border: 'none',
                                            cursor: 'pointer', fontWeight: '600', fontSize: '0.85em',
                                            marginLeft: '10px', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        🗑️ Удалить
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
