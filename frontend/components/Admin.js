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
    const [uploading,setUploading]= React.useState(null); // teamId being uploaded

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

    const uploadLogo = async (teamId, file) => {
        if (!file) return;
        setUploading(teamId);
        try {
            const form = new FormData();
            form.append('logo', file);
            const sid = getSession();
            const res = await fetch(`/api/admin/teams/${teamId}/upload-logo`, {
                method: 'POST',
                headers: { 'x-session-id': sid },
                body: form,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Upload failed');
            }
            showMsg('✅ Логотип загружен');
            onRefresh();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
        setUploading(null);
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

            {/* Карточки команд с логотипом */}
            {teams.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 32 }}>Нет команд</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {teams.map(tm => (
                        <div key={tm.id} className="card-elevated" style={{ padding: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                            {/* Логотип + загрузка */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                {tm.logo ? (
                                    <img src={tm.logo} alt={tm.name} style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '2px solid rgba(212,175,55,0.35)' }} />
                                ) : (
                                    <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', background: 'rgba(212,175,55,0.08)', border: '2px dashed rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8em' }}>
                                        {tm.emoji || '🛡'}
                                    </div>
                                )}
                                <label style={{ cursor: 'pointer', fontSize: '0.72em', color: 'var(--color-accent-primary)', whiteSpace: 'nowrap' }}>
                                    {uploading === tm.id ? '⏳ Загрузка...' : '🖼 Загрузить'}
                                    <input
                                        type="file" accept="image/jpeg,image/png,image/webp"
                                        style={{ display: 'none' }}
                                        disabled={uploading === tm.id}
                                        onChange={e => uploadLogo(tm.id, e.target.files[0])}
                                    />
                                </label>
                            </div>

                            {/* Инфо */}
                            <div style={{ flex: 1, minWidth: 120 }}>
                                <div style={{ fontWeight: 700, fontSize: '1.1em', color: 'var(--color-text-primary)', marginBottom: 4 }}>
                                    {tm.emoji} {tm.name}
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>
                                    👑 {playerMap[tm.captainId]?.name || tm.captainId || '—'}
                                    &nbsp;·&nbsp;
                                    {players.filter(p => p.teamId === tm.id).length} игроков
                                </div>
                            </div>

                            {/* Удалить */}
                            <button onClick={() => deleteTeam(tm.id, tm.name)} style={{ background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)', border: '1px solid rgba(244,67,54,0.3)', padding: '6px 14px', fontSize: '0.85em', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}>
                                {t('admin.delete')}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Вкладка Клан-вары ─────────────────────────────────────────────────────────
const CW_STATUS_LABELS = { upcoming: '📅 Предстоит', ongoing: '⚔ Идёт', completed: '✅ Завершён' };
const CW_STATUS_COLORS = { upcoming: 'var(--color-accent-secondary)', ongoing: 'var(--color-success)', completed: 'var(--color-text-muted)' };

// Dropdown picker for N players (1 for 1v1, 2 for 2v2, 3 for 3v3)
function PlayerPicker({ value, onChange, count, players }) {
    // Parse "Name1 + Name2" → ['Name1', 'Name2']
    const parts = React.useMemo(() => {
        const arr = (value || '').split(' + ').map(s => s.trim());
        while (arr.length < count) arr.push('');
        return arr.slice(0, count);
    }, [value, count]);

    const update = (idx, val) => {
        const next = [...parts];
        next[idx] = val;
        onChange(next.filter(Boolean).join(' + '));
    };

    const selStyle = { background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 8px', fontSize: '0.88em', width: '100%' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from({ length: count }).map((_, i) => (
                <select key={i} value={parts[i] || ''} onChange={e => update(i, e.target.value)} style={selStyle}>
                    <option value="">— Игрок {i + 1} —</option>
                    {players.map(p => (
                        <option key={p.id} value={p.name}>{p.name} · {p.battleTag}</option>
                    ))}
                </select>
            ))}
        </div>
    );
}
const DEFAULT_MATCHES = [
    { order: 1, format: '1v1', label: 'Дуэль I' },
    { order: 2, format: '1v1', label: 'Дуэль II' },
    { order: 3, format: '2v2', label: '2 на 2' },
    { order: 4, format: '1v1', label: 'Дуэль III' },
    { order: 5, format: '1v1', label: 'Тайм-брейк' },
].map(m => ({ ...m, playerA: '', playerB: '', score: { a: 0, b: 0 }, winner: null, games: [] }));

function ClanWarTab({ showMsg, players }) {
    useLang();
    const [wars,       setWars]       = React.useState([]);
    const [selected,   setSelected]   = React.useState(null); // ClanWar object for detail view
    const [showCreate, setShowCreate] = React.useState(false);
    const [form,       setForm]       = React.useState({
        season: '', date: '', status: 'upcoming',
        teamA: { name: '', captain: '' },
        teamB: { name: '', captain: '' },
    });

    const load = async () => {
        try { setWars(await apiFetch('/api/clan-wars')); } catch {}
    };

    React.useEffect(() => { load(); }, []);

    const createWar = async (e) => {
        e.preventDefault();
        try {
            const body = {
                ...form,
                date: form.date || undefined,
                matches: DEFAULT_MATCHES,
            };
            const cw = await apiFetch('/api/clan-wars', { method: 'POST', body: JSON.stringify(body) });
            showMsg('✅ Клан-вар создан');
            setShowCreate(false);
            setForm({ season: '', date: '', status: 'upcoming', teamA: { name: '', captain: '' }, teamB: { name: '', captain: '' } });
            setSelected(cw);
            load();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const deleteWar = async (id) => {
        if (!confirm('Удалить клан-вар?')) return;
        try {
            await apiFetch(`/api/clan-wars/${id}`, { method: 'DELETE' });
            showMsg('✅ Удалено');
            if (selected?.id === id) setSelected(null);
            load();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const changeStatus = async (status) => {
        try {
            const cw = await apiFetch(`/api/clan-wars/${selected.id}`, { method: 'PUT', body: JSON.stringify({ status }) });
            setSelected(cw); load();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const updateField = (path, val) => {
        setSelected(prev => {
            const copy = JSON.parse(JSON.stringify(prev));
            const keys = path.split('.');
            let cur = copy;
            for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
            cur[keys[keys.length - 1]] = val;
            return copy;
        });
    };

    const saveMatch = async (matchIdx) => {
        const match = selected.matches[matchIdx];
        try {
            const cw = await apiFetch(`/api/clan-wars/${selected.id}/matches/${match.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    playerA: match.playerA,
                    playerB: match.playerB,
                    score:   match.score,
                    winner:  match.winner,
                    label:   match.label,
                }),
            });
            setSelected(cw); load();
            showMsg('✅ Матч сохранён');
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    // ── Detail view ────────────────────────────────────────────────────────────
    if (selected) {
        const cw = selected;
        const scoreStyle = { fontSize: '2em', fontWeight: 900, color: 'var(--color-accent-primary)', padding: '0 12px' };
        return (
            <div>
                <button className="btn btn-secondary" onClick={() => { setSelected(null); load(); }} style={{ marginBottom: 'var(--spacing-lg)', padding: '8px 16px' }}>
                    ← Назад
                </button>

                {/* Заголовок */}
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1.2em', fontWeight: 800 }}>{cw.teamA?.name || 'Команда A'}</span>
                            <span style={scoreStyle}>{cw.clanWarScore?.a ?? 0}</span>
                            <span style={{ color: 'var(--color-text-muted)' }}>:</span>
                            <span style={scoreStyle}>{cw.clanWarScore?.b ?? 0}</span>
                            <span style={{ fontSize: '1.2em', fontWeight: 800 }}>{cw.teamB?.name || 'Команда B'}</span>
                        </div>
                        <span style={{ color: CW_STATUS_COLORS[cw.status], fontWeight: 600 }}>
                            {CW_STATUS_LABELS[cw.status]}
                        </span>
                    </div>
                    {cw.season && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85em', marginTop: 6 }}>Сезон {cw.season}</div>}

                    {/* Смена статуса */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                        {cw.status === 'upcoming'  && <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.9em' }} onClick={() => changeStatus('ongoing')}>▶ Начать</button>}
                        {cw.status === 'ongoing'   && <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.9em' }} onClick={() => changeStatus('completed')}>✅ Завершить</button>}
                        {cw.status === 'completed' && <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.9em' }} onClick={() => changeStatus('ongoing')}>↩ Возобновить</button>}
                        <button onClick={() => deleteWar(cw.id)} style={{ padding: '6px 14px', fontSize: '0.9em', background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 'var(--radius-sm)' }}>
                            🗑️ Удалить
                        </button>
                    </div>
                </div>

                {/* Матчи */}
                <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-primary)' }}>Матчи</h4>
                {(cw.matches || []).map((match, idx) => {
                    const winColor = (side) => match.winner === side ? 'var(--color-success)' : 'transparent';
                    return (
                        <div key={match.id || idx} className="card-elevated" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                            {/* Заголовок матча */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Матч {match.order}: </span>
                                <input
                                    value={match.label || ''}
                                    onChange={e => updateField(`matches.${idx}.label`, e.target.value)}
                                    style={{ width: 140, padding: '4px 8px', fontSize: '0.9em' }}
                                    placeholder="Название"
                                />
                                <select
                                    value={match.format || '1v1'}
                                    onChange={e => updateField(`matches.${idx}.format`, e.target.value)}
                                    style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '1px solid var(--color-bg-lighter)', borderRadius: 6, padding: '4px 8px', fontSize: '0.9em' }}
                                >
                                    <option>1v1</option>
                                    <option>2v2</option>
                                    <option>3v3</option>
                                </select>
                            </div>

                            {/* Игроки и счёт */}
                            {(() => {
                                const fmt = match.format || '1v1';
                                const playerCount = fmt === '3v3' ? 3 : fmt === '2v2' ? 2 : 1;
                                return (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 'var(--spacing-md)', alignItems: 'start', marginBottom: 'var(--spacing-md)' }}>
                                        {/* Сторона A */}
                                        <div>
                                            <div style={{ fontSize: '0.75em', color: 'var(--color-text-muted)', marginBottom: 4 }}>{cw.teamA?.name || 'Команда A'}</div>
                                            <PlayerPicker
                                                value={match.playerA || ''}
                                                onChange={val => updateField(`matches.${idx}.playerA`, val)}
                                                count={playerCount}
                                                players={players || []}
                                            />
                                        </div>

                                        {/* Счёт */}
                                        <div style={{ textAlign: 'center', paddingTop: 18 }}>
                                            <div style={{ fontSize: '0.75em', color: 'var(--color-text-muted)', marginBottom: 4 }}>BO3</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <input
                                                    type="number" min="0" max="2"
                                                    value={match.score?.a ?? 0}
                                                    onChange={e => updateField(`matches.${idx}.score.a`, parseInt(e.target.value) || 0)}
                                                    style={{ width: 50, textAlign: 'center', padding: '6px 4px' }}
                                                />
                                                <span style={{ color: 'var(--color-text-muted)' }}>:</span>
                                                <input
                                                    type="number" min="0" max="2"
                                                    value={match.score?.b ?? 0}
                                                    onChange={e => updateField(`matches.${idx}.score.b`, parseInt(e.target.value) || 0)}
                                                    style={{ width: 50, textAlign: 'center', padding: '6px 4px' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Сторона B */}
                                        <div>
                                            <div style={{ fontSize: '0.75em', color: 'var(--color-text-muted)', marginBottom: 4 }}>{cw.teamB?.name || 'Команда B'}</div>
                                            <PlayerPicker
                                                value={match.playerB || ''}
                                                onChange={val => updateField(`matches.${idx}.playerB`, val)}
                                                count={playerCount}
                                                players={players || []}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Победитель */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>Победитель:</span>
                                {[
                                    { val: 'a', label: `✅ ${cw.teamA?.name || 'Команда A'}` },
                                    { val: 'b', label: `✅ ${cw.teamB?.name || 'Команда B'}` },
                                    { val: null, label: '⏸ Не сыграно' },
                                ].map(opt => (
                                    <button
                                        key={String(opt.val)}
                                        onClick={() => updateField(`matches.${idx}.winner`, opt.val)}
                                        style={{
                                            padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85em', cursor: 'pointer',
                                            background: match.winner === opt.val ? (opt.val ? 'rgba(76,175,80,0.2)' : 'rgba(0,0,0,0.3)') : 'rgba(255,255,255,0.05)',
                                            color: match.winner === opt.val ? (opt.val ? 'var(--color-success)' : 'var(--color-text-muted)') : 'var(--color-text-muted)',
                                            border: `1px solid ${match.winner === opt.val ? (opt.val ? 'var(--color-success)' : 'rgba(255,255,255,0.2)') : 'transparent'}`,
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                                <button
                                    className="btn btn-primary"
                                    style={{ marginLeft: 'auto', padding: '6px 16px', fontSize: '0.85em' }}
                                    onClick={() => saveMatch(idx)}
                                >
                                    💾 Сохранить
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // ── List view ──────────────────────────────────────────────────────────────
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0 }}>⚔ Клан-вары ({wars.length})</h3>
                <button className="btn btn-primary" style={{ padding: '8px 18px' }} onClick={() => setShowCreate(!showCreate)}>
                    + Создать клан-вар
                </button>
            </div>

            {/* Форма создания */}
            {showCreate && (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)' }}>
                    <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-primary)' }}>Новый клан-вар</h4>
                    <form onSubmit={createWar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <input type="text" placeholder="Сезон (напр. 24)" value={form.season}
                                onChange={e => setForm({ ...form, season: e.target.value })} />
                            <input type="date" value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '2px solid var(--color-bg-lighter)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '1em' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8em', marginBottom: 4 }}>Команда A</div>
                                <input type="text" placeholder="Название" value={form.teamA.name}
                                    onChange={e => setForm({ ...form, teamA: { ...form.teamA, name: e.target.value } })} style={{ width: '100%', marginBottom: 6 }} />
                                <input type="text" placeholder="Капитан" value={form.teamA.captain}
                                    onChange={e => setForm({ ...form, teamA: { ...form.teamA, captain: e.target.value } })} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8em', marginBottom: 4 }}>Команда B</div>
                                <input type="text" placeholder="Название" value={form.teamB.name}
                                    onChange={e => setForm({ ...form, teamB: { ...form.teamB, name: e.target.value } })} style={{ width: '100%', marginBottom: 6 }} />
                                <input type="text" placeholder="Капитан" value={form.teamB.captain}
                                    onChange={e => setForm({ ...form, teamB: { ...form.teamB, captain: e.target.value } })} style={{ width: '100%' }} />
                            </div>
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82em' }}>
                            Автоматически создаются 5 матчей: Дуэль I · Дуэль II · 2 на 2 · Дуэль III · Тайм-брейк
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" className="btn btn-primary">Создать</button>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>{t('admin.cancel')}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Список */}
            {wars.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
                    Клан-варов нет. Нажмите «+ Создать клан-вар»
                </div>
            ) : (
                <div className="standings-table-wrap">
                    <table className="standings-table">
                        <thead>
                            <tr>
                                <th>Дата</th>
                                <th>Сезон</th>
                                <th>Команды</th>
                                <th>Счёт</th>
                                <th>Статус</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {wars.map(w => (
                                <tr key={w.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(w)}>
                                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>
                                        {w.date ? new Date(w.date).toLocaleDateString('ru') : '—'}
                                    </td>
                                    <td style={{ color: 'var(--color-text-muted)' }}>{w.season || '—'}</td>
                                    <td className="col-name">{w.teamA?.name || '?'} vs {w.teamB?.name || '?'}</td>
                                    <td style={{ color: 'var(--color-accent-secondary)', fontWeight: 700 }}>
                                        {w.clanWarScore?.a ?? 0} : {w.clanWarScore?.b ?? 0}
                                    </td>
                                    <td style={{ color: CW_STATUS_COLORS[w.status] }}>{CW_STATUS_LABELS[w.status]}</td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <button onClick={() => deleteWar(w.id)}
                                            style={{ background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)', border: '1px solid rgba(244,67,54,0.3)', padding: '4px 10px', fontSize: '0.8em', borderRadius: 'var(--radius-sm)' }}>
                                            {t('admin.delete')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Вкладка Портреты ──────────────────────────────────────────────────────────
const RACE_NAMES = { 0: '🎲 Все расы', 1: '👑 Люди', 2: '⚔️ Орки', 4: '🌙 Ночные эльфы', 8: '💀 Нежить' };
const EMPTY_FORM = { name: '', race: 0, pointsRequired: 0, imageUrl: '' };

function PortraitsTab({ showMsg }) {
    useLang();
    const [portraits,  setPortraits]  = React.useState([]);
    const [showForm,   setShowForm]   = React.useState(false);
    const [form,       setForm]       = React.useState(EMPTY_FORM);
    const [editingId,  setEditingId]  = React.useState(null);
    const [saving,     setSaving]     = React.useState(false);

    const load = async () => {
        try {
            const data = await apiFetch('/api/portraits');
            setPortraits(data);
        } catch {}
    };

    React.useEffect(() => { load(); }, []);

    const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); };
    const openEdit = (p) => {
        setForm({ name: p.name, race: p.race, pointsRequired: p.pointsRequired, imageUrl: p.imageUrl });
        setEditingId(p.id);
        setShowForm(true);
    };
    const cancel = () => { setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body = { ...form, race: parseInt(form.race), pointsRequired: parseInt(form.pointsRequired) };
            if (editingId) {
                await apiFetch(`/api/portraits/${editingId}`, { method: 'PUT', body: JSON.stringify(body) });
                showMsg('✅ Портрет обновлён');
            } else {
                await apiFetch('/api/portraits', { method: 'POST', body: JSON.stringify(body) });
                showMsg('✅ Портрет добавлен');
            }
            cancel();
            load();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
        setSaving(false);
    };

    const del = async (id, name) => {
        if (!confirm(`Удалить портрет "${name}"?`)) return;
        try {
            await apiFetch(`/api/portraits/${id}`, { method: 'DELETE' });
            showMsg('✅ Портрет удалён');
            load();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    // Group by race
    const byRace = portraits.reduce((acc, p) => {
        if (!acc[p.race]) acc[p.race] = [];
        acc[p.race].push(p);
        return acc;
    }, {});
    const raceOrder = [0, 1, 2, 4, 8];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0 }}>🖼 Портреты ({portraits.length})</h3>
                <button className="btn btn-primary" style={{ padding: '8px 18px' }} onClick={openAdd}>
                    + Добавить портрет
                </button>
            </div>

            {/* Инфо-карточка */}
            <div className="card-elevated" style={{ padding: 'var(--spacing-md) var(--spacing-xl)', marginBottom: 'var(--spacing-xl)', borderColor: 'var(--color-accent-primary)' }}>
                <p style={{ color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.7, fontSize: '0.9em' }}>
                    Рекомендуемый размер: <strong>128×128 px</strong> · PNG или JPG · Портреты разблокируются при достижении указанного кол-ва очков · Раса 0 = доступен всем
                </p>
            </div>

            {/* Форма добавления/редактирования */}
            {showForm && (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)' }}>
                    <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-primary)' }}>
                        {editingId ? '✏️ Редактировать портрет' : '➕ Добавить портрет'}
                    </h4>
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', maxWidth: 480 }}>
                        <input
                            type="text" placeholder="Название портрета" required
                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                        <select
                            value={form.race} onChange={e => setForm({ ...form, race: e.target.value })}
                            style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '2px solid var(--color-bg-lighter)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '1em' }}
                        >
                            {raceOrder.map(r => <option key={r} value={r}>{RACE_NAMES[r]}</option>)}
                        </select>
                        <input
                            type="number" placeholder="Очков для разблокировки (0 = бесплатно)" min="0" required
                            value={form.pointsRequired} onChange={e => setForm({ ...form, pointsRequired: e.target.value })}
                        />
                        <input
                            type="text" placeholder="URL изображения" required
                            value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                        />
                        {form.imageUrl && (
                            <img src={form.imageUrl} alt="preview" onError={e => e.target.style.display='none'}
                                style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--color-accent-primary)' }} />
                        )}
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? '...' : (editingId ? '💾 Сохранить' : '➕ Добавить')}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={cancel}>{t('admin.cancel')}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Список по расам */}
            {portraits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
                    Нет портретов. Нажмите «+ Добавить портрет»
                </div>
            ) : (
                raceOrder.filter(r => byRace[r]?.length).map(r => (
                    <div key={r} style={{ marginBottom: 'var(--spacing-xxl)' }}>
                        <h3 style={{ color: 'var(--color-accent-primary)', marginBottom: 'var(--spacing-lg)' }}>
                            {RACE_NAMES[r]}
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75em', fontWeight: 400, marginLeft: 8 }}>
                                ({byRace[r].length} портретов)
                            </span>
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--spacing-md)' }}>
                            {byRace[r].sort((a, b) => a.pointsRequired - b.pointsRequired).map(p => (
                                <div key={p.id} className="card-elevated" style={{ padding: 'var(--spacing-md)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                        <img src={p.imageUrl} alt={p.name}
                                            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--color-accent-primary)', flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>{p.name}</div>
                                            <div style={{ color: 'var(--color-accent-secondary)', fontWeight: 600, fontSize: '0.9em' }}>
                                                {p.pointsRequired === 0 ? '🆓 Бесплатно' : `🔒 ${p.pointsRequired} очков`}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => openEdit(p)} style={{ flex: 1, background: 'rgba(33,150,243,0.15)', color: '#2196f3', border: '1px solid rgba(33,150,243,0.3)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.85em', cursor: 'pointer' }}>
                                            ✏️ Изменить
                                        </button>
                                        <button onClick={() => del(p.id, p.name)} style={{ flex: 1, background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)', border: '1px solid rgba(244,67,54,0.3)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.85em', cursor: 'pointer' }}>
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
        { id: 'players',  key: 'admin.tab.players' },
        { id: 'teams',    key: 'admin.tab.teams' },
        { id: 'clanwars', key: 'admin.tab.clanwars' },
        { id: 'portraits',key: 'admin.tab.portraits' },
        { id: 'tools',    key: 'admin.tab.tools' },
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

            {tab === 'players'   && <PlayersTab  players={players} teams={teams} onRefresh={load} showMsg={showMsg} />}
            {tab === 'teams'     && <TeamsTab    teams={teams}   players={players} onRefresh={load} showMsg={showMsg} />}
            {tab === 'clanwars'  && <ClanWarTab  players={players} showMsg={showMsg} />}
            {tab === 'portraits' && <PortraitsTab showMsg={showMsg} />}
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
