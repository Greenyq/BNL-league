// Admin — полная панель управления (создание/редактирование игроков и команд)

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
    useLang();
    const [login,   setLogin]   = React.useState('');
    const [pass,    setPass]    = React.useState('');
    const [error,   setError]   = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError(null); setLoading(true);
        try {
            const data = await apiFetch('/api/admin/login', { method: 'POST', body: JSON.stringify({ login, password: pass }) });
            setSession(data.sessionId);
            onLogin();
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ maxWidth: 380, margin: '60px auto' }}>
            <div className="card-elevated" style={{ padding: 'var(--spacing-xxl)' }}>
                <h3 style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)', color: 'var(--color-accent-primary)' }}>
                    {t('admin.login')}
                </h3>
                {error && <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-md)', color: 'var(--color-error)', marginBottom: 'var(--spacing-lg)', fontSize: '0.9em' }}>{error}</div>}
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <input type="text"     placeholder={t('admin.login_label')} value={login} onChange={e => setLogin(e.target.value)} style={{ width: '100%' }} />
                    <input type="password" placeholder={t('admin.pass_label')}  value={pass}  onChange={e => setPass(e.target.value)}  style={{ width: '100%' }} />
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}>
                        {loading ? '...' : t('admin.loginBtn')}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Вкладка Игроки ────────────────────────────────────────────────────────────
function PlayersTab({ players, teams, onRefresh, showMsg }) {
    useLang();
    // Форма добавления игрока
    const [showForm,  setShowForm]  = React.useState(false);
    const [w3cTag,    setW3cTag]    = React.useState('');
    const [w3cResult, setW3cResult] = React.useState(null); // { found, name, battleTag, race, currentMmr }
    const [w3cSearch, setW3cSearch] = React.useState(false);
    const [teamId,    setTeamId]    = React.useState('');
    const [saving,    setSaving]    = React.useState(false);

    // Редактирование (присвоение команды)
    const [editId,    setEditId]    = React.useState(null);
    const [editTeam,  setEditTeam]  = React.useState('');

    const searchW3C = async () => {
        if (!w3cTag.trim()) return;
        setW3cSearch(true); setW3cResult(null);
        try {
            const res  = await fetch(`/api/players/w3c/search/${encodeURIComponent(w3cTag.trim())}`);
            const data = await res.json();
            if (res.ok && !data.error) {
                // Пытаемся извлечь имя и MMR из ответа W3C
                const solo = Array.isArray(data) ? data.find(m => m.gameMode === 1) : null;
                setW3cResult({
                    found: true,
                    battleTag: w3cTag.trim(),
                    name: w3cTag.trim().split('#')[0],
                    race: solo?.race ?? 0,
                    currentMmr: solo?.mmr ?? 0,
                });
            } else {
                setW3cResult({ found: false });
            }
        } catch {
            setW3cResult({ found: false });
        }
        setW3cSearch(false);
    };

    const addPlayer = async () => {
        if (!w3cResult?.found) return;
        setSaving(true);
        try {
            await apiFetch('/api/players', {
                method: 'POST',
                body: JSON.stringify({
                    battleTag:  w3cResult.battleTag,
                    name:       w3cResult.name,
                    race:       w3cResult.race,
                    mainRace:   w3cResult.race,
                    currentMmr: w3cResult.currentMmr,
                    teamId:     teamId || undefined,
                }),
            });
            showMsg(`✅ Игрок ${w3cResult.name} добавлен`);
            setShowForm(false); setW3cTag(''); setW3cResult(null); setTeamId('');
            onRefresh();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
        setSaving(false);
    };

    const saveTeam = async (playerId) => {
        try {
            await apiFetch(`/api/players/${playerId}`, { method: 'PUT', body: JSON.stringify({ teamId: editTeam || null }) });
            showMsg('✅ Команда обновлена');
            setEditId(null);
            onRefresh();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const deletePlayer = async (id, name) => {
        if (!confirm(`Удалить ${name}?`)) return;
        try {
            await apiFetch(`/api/players/${id}`, { method: 'DELETE' });
            showMsg('✅ Игрок удалён');
            onRefresh();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0 }}>{t('admin.tab.players')} ({players.length})</h3>
                <button className="btn btn-primary" style={{ padding: '8px 18px' }} onClick={() => setShowForm(!showForm)}>
                    + {t('admin.addPlayer')}
                </button>
            </div>

            {/* Форма добавления */}
            {showForm && (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)' }}>
                    <h4 style={{ marginBottom: 'var(--spacing-md)' }}>{t('admin.addPlayer')}</h4>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Player#1234"
                            value={w3cTag}
                            onChange={e => { setW3cTag(e.target.value); setW3cResult(null); }}
                            style={{ flex: 1, minWidth: 200 }}
                            onKeyDown={e => e.key === 'Enter' && searchW3C()}
                        />
                        <button className="btn btn-secondary" onClick={searchW3C} disabled={w3cSearch || !w3cTag.trim()}>
                            {w3cSearch ? t('admin.searching') : t('admin.search_w3c')}
                        </button>
                    </div>

                    {w3cResult && !w3cResult.found && (
                        <p style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }}>{t('admin.not_found')}</p>
                    )}

                    {w3cResult?.found && (
                        <div>
                            <div style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', color: 'var(--color-success)', fontSize: '0.9em' }}>
                                ✓ {t('admin.found')}: <strong>{w3cResult.battleTag}</strong> · MMR {w3cResult.currentMmr || '—'}
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--spacing-md)' }}>
                                <label style={{ color: 'var(--color-text-muted)', fontSize: '0.9em', whiteSpace: 'nowrap' }}>
                                    {t('admin.assign_team')}:
                                </label>
                                <select
                                    value={teamId}
                                    onChange={e => setTeamId(e.target.value)}
                                    style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '2px solid var(--color-bg-lighter)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '1em', flex: 1, minWidth: 160 }}
                                >
                                    <option value="">— {t('admin.assign_team')} —</option>
                                    {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.emoji} {tm.name}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button className="btn btn-primary" onClick={addPlayer} disabled={saving}>
                                    {saving ? '...' : t('admin.save')}
                                </button>
                                <button className="btn btn-secondary" onClick={() => { setShowForm(false); setW3cResult(null); setW3cTag(''); }}>
                                    {t('admin.cancel')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Таблица игроков */}
            <div className="standings-table-wrap">
                <table className="standings-table">
                    <thead>
                        <tr>
                            <th>BattleTag</th>
                            <th>{t('standings.player')}</th>
                            <th>MMR</th>
                            <th>{t('admin.assign_team')}</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map(p => (
                            <tr key={p.id}>
                                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.82em' }}>{p.battleTag}</td>
                                <td className="col-name">{p.name}</td>
                                <td style={{ color: 'var(--color-accent-secondary)' }}>{p.currentMmr || '—'}</td>
                                <td>
                                    {editId === p.id ? (
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <select
                                                value={editTeam}
                                                onChange={e => setEditTeam(e.target.value)}
                                                style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '1px solid var(--color-bg-lighter)', borderRadius: 6, padding: '4px 8px', fontSize: '0.9em' }}
                                            >
                                                <option value="">— без команды —</option>
                                                {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.emoji} {tm.name}</option>)}
                                            </select>
                                            <button onClick={() => saveTeam(p.id)} style={{ background: 'rgba(76,175,80,0.15)', color: 'var(--color-success)', border: '1px solid var(--color-success)', padding: '3px 8px', borderRadius: 4, fontSize: '0.82em' }}>✓</button>
                                            <button onClick={() => setEditId(null)} style={{ background: 'none', color: 'var(--color-text-muted)', border: '1px solid var(--color-bg-lighter)', padding: '3px 8px', borderRadius: 4, fontSize: '0.82em' }}>✕</button>
                                        </div>
                                    ) : (
                                        <span
                                            onClick={() => { setEditId(p.id); setEditTeam(p.teamId || ''); }}
                                            style={{ cursor: 'pointer', color: p.teamId ? 'var(--color-accent-primary)' : 'var(--color-text-muted)', fontSize: '0.9em' }}
                                        >
                                            {teamMap[p.teamId]?.name || '— назначить →'}
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <button onClick={() => deletePlayer(p.id, p.name)} style={{ background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)', border: '1px solid rgba(244,67,54,0.3)', padding: '4px 10px', fontSize: '0.8em', borderRadius: 'var(--radius-sm)' }}>
                                        {t('admin.delete')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {players.length === 0 && (
                            <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>Нет игроков</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Вкладка Команды ───────────────────────────────────────────────────────────
function TeamsTab({ teams, players, onRefresh, showMsg }) {
    useLang();
    const [showForm, setShowForm] = React.useState(false);
    const [name,     setName]     = React.useState('');
    const [emoji,    setEmoji]    = React.useState('🛡');
    const [captainId,setCaptain]  = React.useState('');
    const [saving,   setSaving]   = React.useState(false);

    const createTeam = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await apiFetch('/api/teams', { method: 'POST', body: JSON.stringify({ name: name.trim(), emoji, captainId: captainId || undefined }) });
            showMsg(`✅ Команда "${name}" создана`);
            setShowForm(false); setName(''); setEmoji('🛡'); setCaptain('');
            onRefresh();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
        setSaving(false);
    };

    const deleteTeam = async (id, name) => {
        if (!confirm(`Удалить команду "${name}"?`)) return;
        try {
            await apiFetch(`/api/teams/${id}`, { method: 'DELETE' });
            showMsg('✅ Команда удалена');
            onRefresh();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0 }}>{t('admin.tab.teams')} ({teams.length})</h3>
                <button className="btn btn-primary" style={{ padding: '8px 18px' }} onClick={() => setShowForm(!showForm)}>
                    + {t('admin.addTeam')}
                </button>
            </div>

            {showForm && (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)' }}>
                    <h4 style={{ marginBottom: 'var(--spacing-md)' }}>{t('admin.addTeam')}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', maxWidth: 400 }}>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <input type="text" placeholder="Emoji" value={emoji} onChange={e => setEmoji(e.target.value)} style={{ width: 60 }} />
                            <input type="text" placeholder="Название команды" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
                        </div>
                        <select
                            value={captainId}
                            onChange={e => setCaptain(e.target.value)}
                            style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '2px solid var(--color-bg-lighter)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '1em' }}
                        >
                            <option value="">— выбрать капитана —</option>
                            {players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.battleTag})</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button className="btn btn-primary" onClick={createTeam} disabled={saving || !name.trim()}>
                                {saving ? '...' : t('admin.save')}
                            </button>
                            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setName(''); }}>
                                {t('admin.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="standings-table-wrap">
                <table className="standings-table">
                    <thead>
                        <tr>
                            <th>Команда</th>
                            <th>Капитан</th>
                            <th>Игроков</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map(tm => (
                            <tr key={tm.id}>
                                <td className="col-name">{tm.emoji} {tm.name}</td>
                                <td>{playerMap[tm.captainId]?.name || tm.captainId || '—'}</td>
                                <td>{players.filter(p => p.teamId === tm.id).length}</td>
                                <td>
                                    <button onClick={() => deleteTeam(tm.id, tm.name)} style={{ background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)', border: '1px solid rgba(244,67,54,0.3)', padding: '4px 10px', fontSize: '0.8em', borderRadius: 'var(--radius-sm)' }}>
                                        {t('admin.delete')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {teams.length === 0 && (
                            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>Нет команд</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Панель ────────────────────────────────────────────────────────────────────
function AdminPanel({ onLogout }) {
    useLang();
    const [tab,     setTab]     = React.useState('players');
    const [players, setPlayers] = React.useState([]);
    const [teams,   setTeams]   = React.useState([]);
    const [msg,     setMsg]     = React.useState(null);
    const [msgType, setMsgType] = React.useState('info');

    const load = React.useCallback(async () => {
        const [p, tm] = await Promise.all([apiFetch('/api/players'), apiFetch('/api/teams')]);
        setPlayers(p); setTeams(tm);
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
        showMsg('⏳ ' + t('admin.recalcing'));
        try {
            const r = await apiFetch('/api/players/admin/recalculate', { method: 'POST' });
            showMsg(`✅ Обновлено ${r.updated}/${r.total} игроков`);
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const TABS_ADMIN = [
        { id: 'players', key: 'admin.tab.players' },
        { id: 'teams',   key: 'admin.tab.teams' },
        { id: 'tools',   key: 'admin.tab.tools' },
    ];

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                <h2 style={{ margin: 0 }}>{t('admin.title')}</h2>
                <button className="btn btn-secondary" onClick={logout}>{t('admin.logout')}</button>
            </div>

            {msg && (
                <div style={{
                    background: msgType === 'error' ? 'rgba(244,67,54,0.1)' : 'rgba(212,175,55,0.1)',
                    border: `1px solid ${msgType === 'error' ? 'var(--color-error)' : 'var(--color-accent-primary)'}`,
                    borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-md) var(--spacing-lg)',
                    color: msgType === 'error' ? 'var(--color-error)' : 'var(--color-accent-primary)',
                    marginBottom: 'var(--spacing-lg)', fontWeight: 600,
                }}>
                    {msg}
                </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
                {TABS_ADMIN.map(tb => (
                    <button key={tb.id} className={`nav-btn${tab === tb.id ? ' active' : ''}`} style={{ padding: '10px 22px' }} onClick={() => setTab(tb.id)}>
                        <span>{t(tb.key)}</span>
                    </button>
                ))}
            </div>

            {tab === 'players' && <PlayersTab players={players} teams={teams} onRefresh={load} showMsg={showMsg} />}
            {tab === 'teams'   && <TeamsTab   teams={teams}   players={players} onRefresh={load} showMsg={showMsg} />}
            {tab === 'tools'   && (
                <div>
                    <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>{t('admin.tab.tools')}</h3>
                    <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', maxWidth: 420 }}>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
                            Принудительный пересчёт очков всех игроков по данным W3Champions
                        </p>
                        <button className="btn btn-primary" onClick={recalc}>{t('admin.recalc')}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Точка входа ───────────────────────────────────────────────────────────────
function Admin() {
    useLang();
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
        <div style={{ textAlign: 'center', padding: 64 }}>
            <div className="skeleton" style={{ height: 40, width: 200, margin: '0 auto', borderRadius: 8 }} />
        </div>
    );
    if (!authed) return <LoginForm onLogin={() => setAuthed(true)} />;
    return <AdminPanel onLogout={() => setAuthed(false)} />;
}
