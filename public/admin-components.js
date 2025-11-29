// ==================== LOGIN MODAL ====================
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
                        Матчей пока нет. Админ может создать матчи через админ панель.
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

// ==================== ADMIN PANEL ====================
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

// ==================== ADMIN TEAMS ====================
function AdminTeams({ teams, allPlayers, sessionId, onUpdate }) {
    const [showForm, setShowForm] = React.useState(false);
    const [formData, setFormData] = React.useState({
        name: '', emoji: '', logo: '', captainId: null, coaches: []
    });
    const [editingId, setEditingId] = React.useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingId ? `/api/admin/teams/${editingId}` : '/api/admin/teams';
            const method = editingId ? 'PUT' : 'POST';
            
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
                setFormData({ name: '', emoji: '', logo: '', captainId: null, coaches: [] });
                setEditingId(null);
                onUpdate();
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
            await fetch(`/api/admin/teams/${id}`, {
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
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Эмодзи (например: 🐼)</label>
                            <input
                                type="text"
                                value={formData.emoji}
                                onChange={(e) => setFormData({...formData, emoji: e.target.value})}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>URL логотипа (опционально)</label>
                            <input
                                type="text"
                                value={formData.logo}
                                onChange={(e) => setFormData({...formData, logo: e.target.value})}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                placeholder="https://example.com/logo.png"
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Капитан</label>
                            <select
                                value={formData.captainId || ''}
                                onChange={(e) => setFormData({...formData, captainId: e.target.value ? parseInt(e.target.value) : null})}
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
                                <span style={{ fontSize: '2em' }}>{team.emoji}</span>
                                <div>
                                    <div style={{ fontSize: '1.3em', fontWeight: '700', color: '#fff' }}>
                                        {team.name}
                                    </div>
                                    {team.captainId && (
                                        <div style={{ color: '#c9a961', fontSize: '0.9em', marginTop: '5px' }}>
                                            👑 Капитан: {allPlayers.find(p => p.id === team.captainId)?.name || 'Unknown'}
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
        </div>
    );
}

// ==================== ADMIN PLAYERS ====================
function AdminPlayers({ players, sessionId, onUpdate }) {
    const [showForm, setShowForm] = React.useState(false);
    const [battleTag, setBattleTag] = React.useState('');
    const [searchResult, setSearchResult] = React.useState(null);
    const [searching, setSearching] = React.useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        setSearching(true);
        setSearchResult(null);

        try {
            const response = await fetch('/api/admin/players/search', {
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
            const response = await fetch('/api/admin/players', {
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

    const handleDelete = async (id) => {
        if (!confirm('Удалить игрока?')) return;
        
        try {
            await fetch(`/api/admin/players/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId }
            });
            onUpdate();
        } catch (error) {
            alert('Ошибка при удалении игрока');
        }
    };

    const raceIcons = {
        0: '🎲', 1: '👑', 2: '⚔️', 4: '💀', 8: '🌙',
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
                                    <h4 style={{ color: '#fff', marginBottom: '10px' }}>❌ Игрок не найден</h4>
                                    <div style={{ color: '#fff' }}>{searchResult.message}</div>
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
                {players.map(player => (
                    <div key={player.id} style={{
                        background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                        marginBottom: '15px', border: '1px solid #333'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <span style={{ fontSize: '2em' }}>{raceIcons[player.race]}</span>
                                <div>
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
                    </div>
                ))}
            </div>
        </div>
    );
}

// ==================== ADMIN MATCHES ====================
function AdminMatches({ teams, allPlayers, teamMatches, sessionId, onUpdate }) {
    const [showForm, setShowForm] = React.useState(false);
    const [formData, setFormData] = React.useState({
        team1Id: null, team2Id: null,
        player1Id: null, player2Id: null,
        winnerId: null, points: 50, notes: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.winnerId) {
            alert('Выберите победителя');
            return;
        }

        try {
            const response = await fetch('/api/admin/team-matches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setShowForm(false);
                setFormData({
                    team1Id: null, team2Id: null,
                    player1Id: null, player2Id: null,
                    winnerId: null, points: 50, notes: ''
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
            await fetch(`/api/admin/team-matches/${id}`, {
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
                    {showForm ? '❌ Отмена' : '➕ Добавить матч'}
                </button>
            </div>

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
                                    onChange={(e) => setFormData({...formData, team1Id: parseInt(e.target.value), player1Id: null})}
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
                                    onChange={(e) => setFormData({...formData, team2Id: parseInt(e.target.value), player2Id: null})}
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
                                    onChange={(e) => setFormData({...formData, player1Id: parseInt(e.target.value)})}
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
                                    onChange={(e) => setFormData({...formData, player2Id: parseInt(e.target.value)})}
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
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Победитель</label>
                            <select
                                value={formData.winnerId || ''}
                                onChange={(e) => setFormData({...formData, winnerId: parseInt(e.target.value)})}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                required
                            >
                                <option value="">Выберите победителя</option>
                                {formData.team1Id && (
                                    <option value={formData.team1Id}>
                                        {teams.find(t => t.id === formData.team1Id)?.name}
                                    </option>
                                )}
                                {formData.team2Id && (
                                    <option value={formData.team2Id}>
                                        {teams.find(t => t.id === formData.team2Id)?.name}
                                    </option>
                                )}
                            </select>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>Очки за победу</label>
                            <input
                                type="number"
                                value={formData.points}
                                onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '8px',
                                    border: '1px solid #444', background: '#2a2a2a', color: '#fff'
                                }}
                                min="1"
                                required
                            />
                        </div>
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

            <div>
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
                    const player1 = allPlayers.find(p => p.id === match.player1Id);
                    const player2 = allPlayers.find(p => p.id === match.player2Id);
                    
                    return (
                        <div key={match.id} style={{
                            background: '#1a1a1a', padding: '20px', borderRadius: '15px',
                            marginBottom: '15px', border: '1px solid #333'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div style={{ color: '#888', fontSize: '0.9em' }}>
                                    {new Date(match.createdAt).toLocaleDateString('ru-RU')}
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{
                                        padding: '5px 15px', background: '#c9a961',
                                        color: '#000', borderRadius: '20px', fontWeight: '600'
                                    }}>
                                        +{match.points} pts
                                    </div>
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
                                    <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>{team1?.emoji}</div>
                                    <div style={{ fontWeight: match.winnerId === match.team1Id ? '700' : '400', color: match.winnerId === match.team1Id ? '#4caf50' : '#888' }}>
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
                                    <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>{team2?.emoji}</div>
                                    <div style={{ fontWeight: match.winnerId === match.team2Id ? '700' : '400', color: match.winnerId === match.team2Id ? '#4caf50' : '#888' }}>
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
