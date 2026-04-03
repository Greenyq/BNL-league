// Admin — панель управления (защищена паролем)

const SESSION_KEY  = 'bnl_admin_session';
const getSession   = () => localStorage.getItem(SESSION_KEY);
const setSession   = id => localStorage.setItem(SESSION_KEY, id);
const clearSession = () => localStorage.removeItem(SESSION_KEY);

async function apiFetch(url, options = {}) {
    const sid = getSession();
    const headers = {
        'Content-Type': 'application/json',
        ...(sid ? { 'x-session-id': sid } : {}),
        ...(options.headers || {}),
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
    }
    return res.json();
}

// ── Форма логина ──────────────────────────────────────────────────────────────
function LoginForm({ onLogin }) {
    const [login,    setLogin]    = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error,    setError]    = React.useState(null);
    const [loading,  setLoading]  = React.useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const data = await apiFetch('/api/admin/login', {
                method: 'POST',
                body: JSON.stringify({ login, password }),
            });
            setSession(data.sessionId);
            onLogin();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 380, margin: '60px auto' }}>
            <div className="card-elevated" style={{ padding: 'var(--spacing-xxl)' }}>
                <h3 style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)', color: 'var(--color-accent-primary)' }}>
                    🔐 Вход в панель
                </h3>
                {error && (
                    <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-md)', color: 'var(--color-error)', marginBottom: 'var(--spacing-lg)', fontSize: '0.9em' }}>
                        {error}
                    </div>
                )}
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <input
                        type="text"
                        placeholder="Логин"
                        value={login}
                        onChange={e => setLogin(e.target.value)}
                        style={{ width: '100%' }}
                    />
                    <input
                        type="password"
                        placeholder="Пароль"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ width: '100%' }}
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ marginTop: 'var(--spacing-sm)', width: '100%' }}
                    >
                        {loading ? 'Вход...' : 'Войти'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Панель ────────────────────────────────────────────────────────────────────
function AdminPanel({ onLogout }) {
    const [tab,     setTab]     = React.useState('players');
    const [players, setPlayers] = React.useState([]);
    const [teams,   setTeams]   = React.useState([]);
    const [msg,     setMsg]     = React.useState(null);
    const [msgType, setMsgType] = React.useState('info'); // 'info' | 'error'

    const load = React.useCallback(async () => {
        const [p, t] = await Promise.all([apiFetch('/api/players'), apiFetch('/api/teams')]);
        setPlayers(p); setTeams(t);
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const showMsg = (text, type = 'info') => {
        setMsg(text); setMsgType(type);
        setTimeout(() => setMsg(null), 4000);
    };

    const logout = async () => {
        try { await apiFetch('/api/admin/logout', { method: 'POST' }); } catch {}
        clearSession(); onLogout();
    };

    const recalc = async () => {
        showMsg('⏳ Пересчёт статистики...');
        try {
            const r = await apiFetch('/api/players/admin/recalculate', { method: 'POST' });
            showMsg(`✅ Готово: обновлено ${r.updated}/${r.total} игроков`);
        } catch (err) {
            showMsg(`❌ ${err.message}`, 'error');
        }
    };

    const deletePlayer = async (id) => {
        if (!confirm('Удалить игрока?')) return;
        await apiFetch(`/api/players/${id}`, { method: 'DELETE' });
        load();
        showMsg('✅ Игрок удалён');
    };

    const deleteTeam = async (id) => {
        if (!confirm('Удалить команду?')) return;
        await apiFetch(`/api/teams/${id}`, { method: 'DELETE' });
        load();
        showMsg('✅ Команда удалена');
    };

    const TABS = [
        { id: 'players', label: '👤 Игроки' },
        { id: 'teams',   label: '🛡 Команды' },
        { id: 'tools',   label: '🔧 Инструменты' },
    ];

    return (
        <div className="animate-fade-in">
            {/* Шапка */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                <h2 style={{ margin: 0 }}>⚙ Панель управления</h2>
                <button className="btn btn-secondary" onClick={logout}>Выйти</button>
            </div>

            {/* Сообщение */}
            {msg && (
                <div style={{
                    background: msgType === 'error' ? 'rgba(244,67,54,0.1)' : 'rgba(212,175,55,0.1)',
                    border: `1px solid ${msgType === 'error' ? 'var(--color-error)' : 'var(--color-accent-primary)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    color: msgType === 'error' ? 'var(--color-error)' : 'var(--color-accent-primary)',
                    marginBottom: 'var(--spacing-lg)',
                    fontWeight: 600,
                }}>
                    {msg}
                </div>
            )}

            {/* Вкладки */}
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={`nav-btn${tab === t.id ? ' active' : ''}`}
                        style={{ padding: '10px 22px' }}
                        onClick={() => setTab(t.id)}
                    >
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Игроки */}
            {tab === 'players' && (
                <div>
                    <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>Игроки ({players.length})</h3>
                    <div className="standings-table-wrap">
                        <table className="standings-table">
                            <thead>
                                <tr>
                                    <th>BattleTag</th>
                                    <th>Имя</th>
                                    <th>MMR</th>
                                    <th>Команда</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.map(p => (
                                    <tr key={p.id}>
                                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>{p.battleTag}</td>
                                        <td className="col-name">{p.name}</td>
                                        <td style={{ color: 'var(--color-accent-secondary)' }}>{p.currentMmr || '—'}</td>
                                        <td>{teams.find(t => t.id === p.teamId)?.name || '—'}</td>
                                        <td>
                                            <button
                                                onClick={() => deletePlayer(p.id)}
                                                style={{ background: 'rgba(244,67,54,0.15)', color: 'var(--color-error)', border: '1px solid var(--color-error)', padding: '4px 10px', fontSize: '0.8em', borderRadius: 'var(--radius-sm)' }}
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Команды */}
            {tab === 'teams' && (
                <div>
                    <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>Команды ({teams.length})</h3>
                    <div className="standings-table-wrap">
                        <table className="standings-table">
                            <thead>
                                <tr>
                                    <th>Название</th>
                                    <th>Капитан</th>
                                    <th>Игроков</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.map(t => (
                                    <tr key={t.id}>
                                        <td className="col-name">{t.emoji} {t.name}</td>
                                        <td>{players.find(p => p.id === t.captainId)?.name || t.captainId || '—'}</td>
                                        <td>{players.filter(p => p.teamId === t.id).length}</td>
                                        <td>
                                            <button
                                                onClick={() => deleteTeam(t.id)}
                                                style={{ background: 'rgba(244,67,54,0.15)', color: 'var(--color-error)', border: '1px solid var(--color-error)', padding: '4px 10px', fontSize: '0.8em', borderRadius: 'var(--radius-sm)' }}
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Инструменты */}
            {tab === 'tools' && (
                <div>
                    <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>Инструменты</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', maxWidth: 400 }}>
                        <div className="card-elevated" style={{ padding: 'var(--spacing-lg)' }}>
                            <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>
                                Принудительный пересчёт очков всех игроков по данным W3Champions
                            </p>
                            <button className="btn btn-primary" onClick={recalc}>
                                🔄 Пересчитать статистику
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Точка входа ───────────────────────────────────────────────────────────────
function Admin() {
    const [authed,   setAuthed]   = React.useState(false);
    const [checking, setChecking] = React.useState(true);

    React.useEffect(() => {
        const sid = getSession();
        if (!sid) { setChecking(false); return; }
        fetch('/api/admin/verify', { headers: { 'x-session-id': sid } })
            .then(r => r.json())
            .then(d => { setAuthed(d.isAuthenticated); setChecking(false); })
            .catch(() => setChecking(false));
    }, []);

    if (checking) return (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--color-text-muted)' }}>
            <div className="skeleton" style={{ height: 40, width: 200, margin: '0 auto' }} />
        </div>
    );

    if (!authed) return <LoginForm onLogin={() => setAuthed(true)} />;
    return <AdminPanel onLogout={() => setAuthed(false)} />;
}
