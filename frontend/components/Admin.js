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
    const [showForm,       setShowForm]       = React.useState(false);
    const [w3cTag,         setW3cTag]         = React.useState('');
    const [w3cResult,      setW3cResult]      = React.useState(null); // { found, name, battleTag, race, currentMmr }
    const [w3cSearch,      setW3cSearch]      = React.useState(false);
    const [w3cSuggesting,  setW3cSuggesting]  = React.useState(false);
    const [w3cSuggestions, setW3cSuggestions] = React.useState([]);
    const [teamId,         setTeamId]         = React.useState('');
    const [saving,         setSaving]         = React.useState(false);

    // Редактирование (присвоение команды)
    const [editId,    setEditId]    = React.useState(null);
    const [editTeam,  setEditTeam]  = React.useState('');

    React.useEffect(() => {
        if (!showForm) return;

        const query = w3cTag.trim();
        const selectedTag = w3cResult?.found ? (w3cResult.battleTag || '').trim() : '';

        if (selectedTag && query.toLowerCase() === selectedTag.toLowerCase()) {
            setW3cSuggestions([]);
            setW3cSuggesting(false);
            return;
        }

        if (query.length < 3) {
            setW3cSuggestions([]);
            setW3cSuggesting(false);
            return;
        }

        const timer = setTimeout(async () => {
            setW3cSuggesting(true);
            try {
                const res  = await fetch(`/api/players/w3c/autocomplete/${encodeURIComponent(query)}`);
                const data = await res.json();
                if (res.ok && Array.isArray(data)) setW3cSuggestions(data);
                else setW3cSuggestions([]);
            } catch {
                setW3cSuggestions([]);
            }
            setW3cSuggesting(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [showForm, w3cTag, w3cResult]);

    const searchW3C = async (battleTag) => {
        const tag = (battleTag || w3cTag).trim();
        if (!tag) return;

        setW3cSearch(true); setW3cResult(null);
        setW3cSuggestions([]);
        try {
            const res  = await fetch(`/api/players/w3c/search/${encodeURIComponent(tag)}`);
            const data = await res.json();
            if (res.ok && !data.error) {
                // Пытаемся извлечь имя и MMR из ответа W3C
                const solo = Array.isArray(data) ? data.find(m => m.gameMode === 1) : null;
                setW3cTag(tag);
                setW3cResult({
                    found: true,
                    battleTag: tag,
                    name: tag.split('#')[0],
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

    const setTierOverride = async (p, tier) => {
        try {
            await apiFetch(`/api/players/${p.id}`, {
                method: 'PUT',
                body: JSON.stringify({ tierOverride: tier }),
            });
            const tierName = { 1: 'B', 2: 'A', 3: 'S' }[tier] || 'Авто';
            showMsg(`✅ Тир: ${p.name} → ${tierName}`);
            onRefresh();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    // Calculate auto tier from MMR
    const autoTier = (p) => {
        const mmr = p.stats?.mmr || p.currentMmr || 0;
        if (mmr >= 1700) return 3;
        if (mmr >= 1400) return 2;
        if (mmr >= 1000) return 1;
        return null;
    };
    const tierLabel = (num) => ({ 1: 'B', 2: 'A', 3: 'S' }[num] || '—');

    const toggleDraft = async (p) => {
        try {
            await apiFetch(`/api/players/${p.id}`, {
                method: 'PUT',
                body: JSON.stringify({ draftAvailable: !p.draftAvailable }),
            });
            showMsg(`✅ Драфт: ${p.name} → ${!p.draftAvailable ? 'доступен' : 'недоступен'}`);
            onRefresh();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const toggleSeasonWinner = async (p) => {
        const season = p.seasonWinner ? null : 1;
        try {
            await apiFetch(`/api/players/${p.id}`, {
                method: 'PUT',
                body: JSON.stringify({ seasonWinner: season }),
            });
            showMsg(season ? `🏆 ${p.name} — победитель сезона 1` : `✅ ${p.name} — значок победителя снят`);
            onRefresh();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

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
                    <div style={{ position: 'relative', zIndex: 20, marginBottom: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
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

                        {(w3cSuggesting || w3cSuggestions.length > 0) && (
                            <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 8px)', background: 'var(--color-bg-lighter)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
                                {w3cSuggesting && (
                                    <div style={{ padding: '10px 14px', color: 'var(--color-text-muted)', fontSize: '0.9em' }}>
                                        {t('admin.searching')}
                                    </div>
                                )}
                                {!w3cSuggesting && w3cSuggestions.map(suggestion => (
                                    <button
                                        key={suggestion.battleTag}
                                        type="button"
                                        onClick={() => searchW3C(suggestion.battleTag)}
                                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', color: 'var(--color-text-primary)', border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 14px', cursor: 'pointer' }}
                                    >
                                        <strong>{suggestion.name || suggestion.battleTag.split('#')[0]}</strong>
                                        <span style={{ color: 'var(--color-text-muted)', marginLeft: 8, fontSize: '0.9em' }}>{suggestion.battleTag}</span>
                                    </button>
                                ))}
                            </div>
                        )}
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
                                <button className="btn btn-secondary" onClick={() => { setShowForm(false); setW3cResult(null); setW3cTag(''); setW3cSuggestions([]); }}>
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
                            <th>Тир</th>
                            <th>{t('admin.assign_team')}</th>
                            <th>⚔ Драфт</th>
                            <th>🏆 Сезон</th>
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
                                    <select
                                        value={p.tierOverride || ''}
                                        onChange={e => setTierOverride(p, e.target.value ? Number(e.target.value) : null)}
                                        style={{
                                            background: p.tierOverride ? 'rgba(212,175,55,0.15)' : 'var(--color-bg-lighter)',
                                            color: p.tierOverride ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                                            border: `1px solid ${p.tierOverride ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                            borderRadius: 4, padding: '3px 6px', fontSize: '0.82em', fontWeight: 700,
                                        }}
                                    >
                                        <option value="">Авто ({tierLabel(autoTier(p))})</option>
                                        <option value="3">S (1700+)</option>
                                        <option value="2">A (1400–1700)</option>
                                        <option value="1">B (1000–1400)</option>
                                    </select>
                                </td>
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
                                {/* Колонка Драфт */}
                                <td>
                                    <button
                                        onClick={() => toggleDraft(p)}
                                        style={{
                                            padding: '3px 10px', fontSize: '0.78em', borderRadius: 4, cursor: 'pointer', fontWeight: 700,
                                            background: p.draftAvailable ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.04)',
                                            color: p.draftAvailable ? 'var(--color-success)' : 'var(--color-text-muted)',
                                            border: `1px solid ${p.draftAvailable ? 'var(--color-success)' : 'rgba(255,255,255,0.12)'}`,
                                            minWidth: 64,
                                        }}
                                    >
                                        {p.draftAvailable ? '✔ Да' : '✗ Нет'}
                                    </button>
                                </td>
                                <td>
                                    <button
                                        onClick={() => toggleSeasonWinner(p)}
                                        title={p.seasonWinner ? 'Снять значок победителя' : 'Назначить победителем сезона 1'}
                                        style={{
                                            padding: '3px 10px', fontSize: '0.78em', borderRadius: 4, cursor: 'pointer', fontWeight: 700,
                                            background: p.seasonWinner ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
                                            color: p.seasonWinner ? '#ffd700' : 'var(--color-text-muted)',
                                            border: `1px solid ${p.seasonWinner ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.12)'}`,
                                            minWidth: 48,
                                        }}
                                    >
                                        {p.seasonWinner ? `🏆 С${p.seasonWinner}` : '—'}
                                    </button>
                                </td>
                                <td>
                                    <button onClick={() => deletePlayer(p.id, p.name)} style={{ background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)', border: '1px solid rgba(244,67,54,0.3)', padding: '4px 10px', fontSize: '0.8em', borderRadius: 'var(--radius-sm)' }}>
                                        {t('admin.delete')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {players.length === 0 && (
                            <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>Нет игроков</td></tr>
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
    const [showForm,   setShowForm]   = React.useState(false);
    const [name,       setName]       = React.useState('');
    const [emoji,      setEmoji]      = React.useState('🛡');
    const [captainId,  setCaptain]    = React.useState('');
    const [saving,     setSaving]     = React.useState(false);
    const [uploading,  setUploading]  = React.useState(null); // teamId being uploaded
    // Edit state
    const [editId,     setEditId]     = React.useState(null);
    const [editName,   setEditName]   = React.useState('');
    const [editEmoji,  setEditEmoji]  = React.useState('');
    const [editCap,    setEditCap]    = React.useState('');
    const [editSaving, setEditSaving] = React.useState(false);

    const startEdit = (tm) => {
        setEditId(tm.id);
        setEditName(tm.name);
        setEditEmoji(tm.emoji || '🛡');
        setEditCap(tm.captainId || '');
    };

    const cancelEdit = () => { setEditId(null); };

    const saveEdit = async (id) => {
        setEditSaving(true);
        try {
            await apiFetch(`/api/teams/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: editName.trim(), emoji: editEmoji, captainId: editCap || null }),
            });
            showMsg('✅ Команда обновлена');
            setEditId(null);
            onRefresh();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
        setEditSaving(false);
    };

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
                        <div key={tm.id} className="card-elevated" style={{ padding: 'var(--spacing-lg)' }}>
                            {/* Основная строка */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                                {/* Логотип + загрузка */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                    {tm.logo ? (
                                        <img src={tm.logo} alt={tm.name} style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '2px solid rgba(212,175,55,0.35)' }} />
                                    ) : (
                                        <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'rgba(212,175,55,0.08)', border: '2px dashed rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6em' }}>
                                            {tm.emoji || '🛡'}
                                        </div>
                                    )}
                                    <label style={{ cursor: 'pointer', fontSize: '0.68em', color: 'var(--color-accent-primary)', whiteSpace: 'nowrap' }}>
                                        {uploading === tm.id ? '⏳...' : '🖼 Лого'}
                                        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} disabled={uploading === tm.id} onChange={e => uploadLogo(tm.id, e.target.files[0])} />
                                    </label>
                                </div>

                                {/* Инфо */}
                                <div style={{ flex: 1, minWidth: 120 }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.05em', color: 'var(--color-text-primary)', marginBottom: 3 }}>
                                        {tm.emoji} {tm.name}
                                    </div>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.83em' }}>
                                        👑 {playerMap[tm.captainId]?.name || (tm.captainId ? tm.captainId : '— капитан не назначен')}
                                        &nbsp;·&nbsp;
                                        {players.filter(p => p.teamId === tm.id).length} игроков
                                    </div>
                                </div>

                                {/* Кнопки */}
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                    <button
                                        onClick={() => editId === tm.id ? cancelEdit() : startEdit(tm)}
                                        style={{ background: editId === tm.id ? 'rgba(0,212,255,0.1)' : 'rgba(212,175,55,0.1)', color: editId === tm.id ? 'var(--color-accent-secondary)' : 'var(--color-accent-primary)', border: `1px solid ${editId === tm.id ? 'var(--color-accent-secondary)' : 'rgba(212,175,55,0.4)'}`, padding: '6px 14px', fontSize: '0.82em', borderRadius: 'var(--radius-sm)' }}
                                    >
                                        {editId === tm.id ? '✕ Отмена' : '✏ Изменить'}
                                    </button>
                                    <button onClick={() => deleteTeam(tm.id, tm.name)} style={{ background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)', border: '1px solid rgba(244,67,54,0.3)', padding: '6px 14px', fontSize: '0.82em', borderRadius: 'var(--radius-sm)' }}>
                                        {t('admin.delete')}
                                    </button>
                                </div>
                            </div>

                            {/* Форма редактирования */}
                            {editId === tm.id && (
                                <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,212,255,0.2)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                        {/* Название и эмодзи */}
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                            <input type="text" placeholder="Emoji" value={editEmoji} onChange={e => setEditEmoji(e.target.value)} style={{ width: 60 }} />
                                            <input type="text" placeholder="Название команды" value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 1 }} />
                                        </div>
                                        {/* Капитан */}
                                        <div>
                                            <div style={{ fontSize: '0.8em', color: 'var(--color-text-muted)', marginBottom: 4 }}>👑 Капитан</div>
                                            <select
                                                value={editCap}
                                                onChange={e => setEditCap(e.target.value)}
                                                style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '2px solid var(--color-bg-lighter)', borderRadius: 'var(--radius-md)', padding: '9px 12px', fontSize: '0.95em', width: '100%' }}
                                            >
                                                <option value="">— без капитана —</option>
                                                {players.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} ({p.battleTag}) {p.teamId === tm.id ? '· в команде' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Сохранить */}
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-primary" onClick={() => saveEdit(tm.id)} disabled={editSaving || !editName.trim()} style={{ padding: '7px 18px' }}>
                                                {editSaving ? '...' : '💾 Сохранить'}
                                            </button>
                                            <button className="btn btn-secondary" onClick={cancelEdit} style={{ padding: '7px 14px' }}>Отмена</button>
                                        </div>
                                    </div>
                                </div>
                            )}
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
    { order: 3, format: '1v1', label: 'Дуэль III' },
    { order: 4, format: '1v1', label: 'Тайм-брейк' },
    { order: 5, format: '3v3', label: '3 на 3' },
].map(m => ({ ...m, playerA: '', playerB: '', score: { a: 0, b: 0 }, winner: null, games: [] }));

// Round-robin (circle method): returns array of rounds, each round = array of [teamA, teamB]
function buildRoundRobin(ts) {
    if (ts.length < 2) return [];
    const arr = ts.length % 2 === 0 ? [...ts] : [...ts, null];
    const half = arr.length / 2;
    const rounds = [];
    for (let r = 0; r < arr.length - 1; r++) {
        const pairs = [];
        for (let i = 0; i < half; i++) {
            const a = arr[i], b = arr[arr.length - 1 - i];
            if (a && b) pairs.push([a, b]);
        }
        if (pairs.length) rounds.push(pairs);
        arr.splice(1, 0, arr.pop());
    }
    return rounds;
}

function ClanWarTab({ showMsg, players, teams }) {
    useLang();
    const [wars,          setWars]          = React.useState([]);
    const [selected,      setSelected]      = React.useState(null);
    const [showCreate,    setShowCreate]    = React.useState(false);
    const [showScheduler, setShowScheduler] = React.useState(false);
    const [schedForm,     setSchedForm]     = React.useState({ season: '', startDate: '', daysBetweenRounds: 7 });
    const [scheduling,    setScheduling]    = React.useState(false);
    const [form,          setForm]          = React.useState({
        season: '', date: '', teamAId: '', teamBId: '',
    });

    const load = async () => {
        try { setWars(await apiFetch('/api/clan-wars')); } catch {}
    };

    React.useEffect(() => { load(); }, []);

    // Build teamA / teamB objects from selected IDs
    const getTeamPayload = (teamId, players) => {
        const team = (teams || []).find(t => t.id === teamId);
        if (!team) return { name: '', captain: '' };
        const captain = players.find(p => p.id === team.captainId);
        return {
            name:    team.name,
            captain: captain ? captain.name : (team.captainId || ''),
            players: players.filter(p => p.teamId === team.id).map(p => p.name),
        };
    };

    const createWar = async (e) => {
        e.preventDefault();
        if (!form.teamAId || !form.teamBId) return showMsg('❌ Выберите обе команды', 'error');
        if (form.teamAId === form.teamBId) return showMsg('❌ Команды должны быть разными', 'error');
        try {
            const body = {
                season: form.season,
                date:   form.date || undefined,
                status: 'upcoming',
                teamA:  getTeamPayload(form.teamAId, players),
                teamB:  getTeamPayload(form.teamBId, players),
                matches: DEFAULT_MATCHES,
            };
            const cw = await apiFetch('/api/clan-wars', { method: 'POST', body: JSON.stringify(body) });
            showMsg('✅ Клан-вар создан');
            setShowCreate(false);
            setForm({ season: '', date: '', teamAId: '', teamBId: '' });
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
                    format:  match.format,
                }),
            });
            setSelected(cw); load();
            showMsg('✅ Матч сохранён');
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const autoAssign = async () => {
        if (!selected) return;
        try {
            const result = await apiFetch(`/api/clan-wars/${selected.id}/auto-assign`, { method: 'POST' });
            setSelected(result.clanWar); load();
            const count = result.assignments?.length || 0;
            showMsg(`✅ Авто-назначение: ${count} матчей по тирам`);
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const resetMatches = async () => {
        if (!selected) return;
        if (!confirm('Удалить все матчи и сбросить результаты?')) return;
        try {
            const result = await apiFetch(`/api/clan-wars/${selected.id}/reset-matches`, { method: 'POST' });
            setSelected(result.clanWar); load();
            showMsg('✅ Матчи сброшены');
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const generateSchedule = async () => {
        if (!schedForm.season.trim()) return showMsg('❌ Укажите название сезона', 'error');
        if ((teams || []).length < 2) return showMsg('❌ Нужно минимум 2 команды', 'error');
        setScheduling(true);
        try {
            const result = await apiFetch('/api/clan-wars/schedule', {
                method: 'POST',
                body: JSON.stringify({
                    season: schedForm.season.trim(),
                    startDate: schedForm.startDate || undefined,
                    daysBetweenRounds: parseInt(schedForm.daysBetweenRounds) || 7,
                }),
            });
            showMsg(`✅ Создано ${result.created} клан-варов в ${result.totalRounds} турах${result.skipped ? ` (пропущено ${result.skipped} — уже существуют)` : ''}`);
            setShowScheduler(false);
            load();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
        setScheduling(false);
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
                        <button
                            onClick={autoAssign}
                            style={{ padding: '6px 14px', fontSize: '0.9em', background: 'rgba(0,212,255,0.1)', color: 'var(--color-accent-secondary)', border: '1px solid rgba(0,212,255,0.4)', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}
                        >
                            🎯 Авто-назначение по тирам
                        </button>
                        <button
                            onClick={resetMatches}
                            style={{ padding: '6px 14px', fontSize: '0.9em', background: 'rgba(255,152,0,0.1)', color: '#ff9800', border: '1px solid rgba(255,152,0,0.4)', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}
                        >
                            🗑 Удалить все матчи
                        </button>
                        <button onClick={() => deleteWar(cw.id)} style={{ padding: '6px 14px', fontSize: '0.9em', background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 'var(--radius-sm)' }}>
                            🗑️ Удалить клан-вар
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
    const schedPreview = buildRoundRobin(teams || []);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0 }}>⚔ Клан-вары ({wars.length})</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '8px 18px' }}
                        onClick={() => { setShowScheduler(!showScheduler); setShowCreate(false); }}
                    >
                        🗓 Авто-расписание
                    </button>
                    <button className="btn btn-primary" style={{ padding: '8px 18px' }}
                        onClick={() => { setShowCreate(!showCreate); setShowScheduler(false); }}>
                        + Создать клан-вар
                    </button>
                </div>
            </div>

            {/* Авто-расписание (round-robin) */}
            {showScheduler && (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)' }}>
                    <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-primary)' }}>
                        🗓 Авто-расписание — круговой турнир
                    </h4>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88em', marginBottom: 'var(--spacing-lg)' }}>
                        Система автоматически создаст клан-вары между всеми командами ({(teams || []).length} команд → {schedPreview.reduce((s, r) => s + r.length, 0)} игр в {schedPreview.length} турах). Уже существующие пары в этом сезоне будут пропущены.
                    </p>

                    {(teams || []).length < 2 ? (
                        <div style={{ color: 'var(--color-error)', padding: 'var(--spacing-md)', background: 'rgba(244,67,54,0.08)', borderRadius: 'var(--radius-sm)', fontSize: '0.9em', marginBottom: 'var(--spacing-lg)' }}>
                            ⚠ Сначала создайте минимум 2 команды во вкладке «Команды»
                        </div>
                    ) : (
                        <>
                            {/* Форма параметров */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                                <div>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8em', marginBottom: 6 }}>Сезон *</div>
                                    <input
                                        type="text" placeholder="напр. 1"
                                        value={schedForm.season}
                                        onChange={e => setSchedForm({ ...schedForm, season: e.target.value })}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8em', marginBottom: 6 }}>Дата первого тура</div>
                                    <input
                                        type="date"
                                        value={schedForm.startDate}
                                        onChange={e => setSchedForm({ ...schedForm, startDate: e.target.value })}
                                        style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '2px solid var(--color-bg-lighter)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '1em', width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8em', marginBottom: 6 }}>Дней между турами</div>
                                    <input
                                        type="number" min="1" max="60"
                                        value={schedForm.daysBetweenRounds}
                                        onChange={e => setSchedForm({ ...schedForm, daysBetweenRounds: e.target.value })}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            {/* Превью туров */}
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75em', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                                    Превью расписания
                                </div>
                                {schedPreview.map((round, ri) => {
                                    const roundDate = schedForm.startDate
                                        ? new Date(new Date(schedForm.startDate).getTime() + ri * (parseInt(schedForm.daysBetweenRounds) || 7) * 86400000)
                                        : null;
                                    return (
                                        <div key={ri} style={{ marginBottom: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.78em', fontWeight: 700, color: 'var(--color-accent-primary)', minWidth: 55 }}>
                                                    Тур {ri + 1}{roundDate ? ` · ${roundDate.toLocaleDateString('ru')}` : ''}
                                                </span>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    {round.map(([a, b], pi) => (
                                                        <span key={pi} style={{ fontSize: '0.82em', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 6, padding: '2px 10px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                                                            {a.emoji || ''} {a.name} <span style={{ color: 'var(--color-text-muted)' }}>vs</span> {b.emoji || ''} {b.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className="btn btn-primary"
                            style={{ padding: '10px 24px' }}
                            onClick={generateSchedule}
                            disabled={scheduling || (teams || []).length < 2 || !schedForm.season.trim()}
                        >
                            {scheduling ? '⏳ Создаю...' : `🗓 Создать ${schedPreview.reduce((s, r) => s + r.length, 0)} клан-варов`}
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '10px 18px' }} onClick={() => setShowScheduler(false)}>
                            Отмена
                        </button>
                    </div>
                </div>
            )}

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

                        {(!teams || teams.length < 2) ? (
                            <div style={{ color: 'var(--color-error)', padding: 'var(--spacing-md)', background: 'rgba(244,67,54,0.08)', borderRadius: 'var(--radius-sm)', fontSize: '0.9em' }}>
                                ⚠ Сначала создайте минимум 2 команды во вкладке «Команды»
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                {[
                                    { key: 'teamAId', label: 'Команда A' },
                                    { key: 'teamBId', label: 'Команда B' },
                                ].map(({ key, label }) => {
                                    const selTeam = (teams || []).find(t => t.id === form[key]);
                                    const captain = selTeam && players.find(p => p.id === selTeam.captainId);
                                    return (
                                        <div key={key}>
                                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8em', marginBottom: 6 }}>{label}</div>
                                            <select
                                                value={form[key]}
                                                onChange={e => setForm({ ...form, [key]: e.target.value })}
                                                style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '2px solid var(--color-bg-lighter)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '1em', width: '100%' }}
                                                required
                                            >
                                                <option value="">— Выбрать команду —</option>
                                                {(teams || []).map(tm => (
                                                    <option key={tm.id} value={tm.id}>{tm.emoji} {tm.name}</option>
                                                ))}
                                            </select>
                                            {selTeam && (
                                                <div style={{ marginTop: 6, fontSize: '0.8em', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {selTeam.logo && <img src={selTeam.logo} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'contain' }} />}
                                                    👑 {captain ? captain.name : (selTeam.captainId || '—')}
                                                    &nbsp;·&nbsp;
                                                    {players.filter(p => p.teamId === selTeam.id).length} игроков
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82em' }}>
                            Автоматически создаются 5 матчей: Дуэль I · Дуэль II · 2 на 2 · Дуэль III · Тайм-брейк
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" className="btn btn-primary" disabled={!form.teamAId || !form.teamBId}>Создать</button>
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

// ── Вкладка Manage maps ──────────────────────────────────────────────────────
const EMPTY_MAP_FORM = { title: '', description: '', labelId: '' };
const EMPTY_LABEL_FORM = { name: '' };

function titleFromMapFile(fileName) {
    return (fileName || '').replace(/\.[^/.]+$/, '').trim();
}

function ManageMapsTab({ showMsg }) {
    useLang();
    const [labels, setLabels] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [labelForm, setLabelForm] = React.useState(EMPTY_LABEL_FORM);
    const [editingLabelId, setEditingLabelId] = React.useState(null);
    const [mapForm, setMapForm] = React.useState(EMPTY_MAP_FORM);
    const [editingMap, setEditingMap] = React.useState(null);
    const [file, setFile] = React.useState(null);
    const [savingLabel, setSavingLabel] = React.useState(false);
    const [savingMap, setSavingMap] = React.useState(false);
    const [mapsSubtab, setMapsSubtab] = React.useState('maps');
    const fileRef = React.useRef(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/api/maps');
            const list = Array.isArray(data) ? data : [];
            setLabels(list);
            setMapForm(f => ({
                ...f,
                labelId: list.some(label => label.id === f.labelId) ? f.labelId : (list[0]?.id || ''),
            }));
        } catch {
            setLabels([]);
        }
        setLoading(false);
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const resetLabelForm = () => {
        setEditingLabelId(null);
        setLabelForm(EMPTY_LABEL_FORM);
    };

    const resetMapForm = () => {
        setEditingMap(null);
        setMapForm({ ...EMPTY_MAP_FORM, labelId: labels[0]?.id || '' });
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    const saveLabel = async (e) => {
        e.preventDefault();
        if (!labelForm.name.trim()) return;
        setSavingLabel(true);
        try {
            const body = JSON.stringify({
                name: labelForm.name.trim(),
            });
            if (editingLabelId) {
                await apiFetch(`/api/maps/labels/${editingLabelId}`, { method: 'PUT', body });
                showMsg('Label updated');
            } else {
                await apiFetch('/api/maps/labels', { method: 'POST', body });
                showMsg('Label created');
            }
            resetLabelForm();
            load();
            setMapsSubtab('labels');
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
        setSavingLabel(false);
    };

    const editLabel = (label) => {
        setEditingLabelId(label.id);
        setLabelForm({ name: label.name || '' });
        setMapsSubtab('label-form');
    };

    const addLabel = () => {
        resetLabelForm();
        setMapsSubtab('label-form');
    };

    const deleteLabel = async (label) => {
        if (!confirm(`Delete label "${label.name}"?`)) return;
        try {
            await apiFetch(`/api/maps/labels/${label.id}`, { method: 'DELETE' });
            showMsg('Label deleted');
            if (mapForm.labelId === label.id) {
                setMapForm(f => ({ ...f, labelId: '' }));
            }
            load();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const saveMap = async (e) => {
        e.preventDefault();
        if (!mapForm.labelId) {
            showMsg('❌ Label is required', 'error');
            return;
        }
        if (!mapForm.title.trim()) return;
        if (!editingMap && !file) {
            showMsg('❌ Map file is required', 'error');
            return;
        }

        setSavingMap(true);
        try {
            const form = new FormData();
            form.append('title', mapForm.title.trim());
            form.append('description', mapForm.description.trim());
            form.append('labelId', mapForm.labelId);
            if (file) form.append('file', file);

            const sid = getSession();
            const res = await fetch(editingMap ? `/api/maps/${editingMap.id}` : '/api/maps', {
                method: editingMap ? 'PUT' : 'POST',
                headers: { 'x-session-id': sid },
                body: form,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Map save failed');

            showMsg(editingMap ? 'Map updated' : 'Map uploaded');
            resetMapForm();
            load();
            setMapsSubtab('maps');
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
        setSavingMap(false);
    };

    const editMap = (map) => {
        setEditingMap(map);
        setMapForm({
            title: map.title || '',
            description: map.description || '',
            labelId: map.labelId || labels.find(label => label.name === map.labelName)?.id || '',
        });
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
        setMapsSubtab('edit-map');
    };

    const deleteMap = async (map) => {
        if (!confirm(`Delete map "${map.title}"?`)) return;
        try {
            await apiFetch(`/api/maps/${map.id}`, { method: 'DELETE' });
            showMsg('Map deleted');
            if (editingMap?.id === map.id) resetMapForm();
            load();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const allMaps = labels.flatMap(label => (label.maps || []).map(map => ({ ...map, labelName: label.name })));
    const mapsSubtabs = [
        { id: 'maps', label: `Manage maps (${allMaps.length})` },
        { id: 'labels', label: `Manage labels (${labels.length})` },
    ];
    const showMapForm = mapsSubtab === 'upload' || mapsSubtab === 'edit-map';

    return (
        <div>
            <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>Manage maps</h3>

            <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
                {mapsSubtabs.map(subtab => (
                    <button
                        key={subtab.id}
                        type="button"
                        className={`nav-btn${mapsSubtab === subtab.id ? ' active' : ''}`}
                        onClick={() => setMapsSubtab(subtab.id)}
                        style={{ padding: '8px 16px', fontSize: '0.82em' }}
                    >
                        <span>{subtab.label}</span>
                    </button>
                ))}
            </div>

            {mapsSubtab === 'label-form' && (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)', maxWidth: 560 }}>
                    <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-primary)' }}>
                        {editingLabelId ? 'Edit label' : 'Add label'}
                    </h4>
                    <form onSubmit={saveLabel} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <input
                            value={labelForm.name}
                            onChange={e => setLabelForm({ ...labelForm, name: e.target.value })}
                            placeholder="Label name"
                            required
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" disabled={savingLabel || !labelForm.name.trim()}>
                                {savingLabel ? '...' : (editingLabelId ? 'Save label' : 'Add label')}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => { resetLabelForm(); setMapsSubtab('labels'); }}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {showMapForm && (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)' }}>
                    <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-primary)' }}>
                        {editingMap ? 'Edit map' : 'Upload map'}
                    </h4>
                    <form onSubmit={saveMap} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div>
                            <select
                                value={mapForm.labelId}
                                onChange={e => setMapForm({ ...mapForm, labelId: e.target.value })}
                                required
                                style={{ width: '100%', background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '2px solid var(--color-bg-lighter)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}
                            >
                                <option value="">Select label</option>
                                {labels.map(label => (
                                    <option key={label.id} value={label.id}>{label.name}</option>
                                ))}
                            </select>
                            {!labels.length && (
                                <div style={{ marginTop: 6, color: 'var(--color-text-muted)', fontSize: '0.82em' }}>
                                    Add a label before uploading maps.
                                </div>
                            )}
                        </div>
                        <input
                            value={mapForm.title}
                            onChange={e => setMapForm({ ...mapForm, title: e.target.value })}
                            placeholder="Map title"
                            required
                        />
                        <textarea
                            value={mapForm.description}
                            onChange={e => setMapForm({ ...mapForm, description: e.target.value })}
                            placeholder="Description"
                            rows="3"
                            style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '2px solid var(--color-bg-lighter)', borderRadius: 'var(--radius-md)', padding: '10px 14px', resize: 'vertical' }}
                        />
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".w3x,.w3m"
                            onChange={e => {
                                const selected = e.target.files[0] || null;
                                setFile(selected);
                                if (selected && !mapForm.title.trim()) {
                                    setMapForm({ ...mapForm, title: titleFromMapFile(selected.name) });
                                }
                            }}
                            required={!editingMap}
                            style={{ color: 'var(--color-text-secondary)' }}
                        />
                        {editingMap && (
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>
                                Current file: {editingMap.originalName} · {formatMapSize(editingMap.size)}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" disabled={savingMap || !mapForm.title.trim() || !mapForm.labelId || (!editingMap && !file)}>
                                {savingMap ? '...' : (editingMap ? 'Save map' : 'Upload map')}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => { resetMapForm(); setMapsSubtab('maps'); }}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <p style={{ color: 'var(--color-text-muted)' }}>...</p>
            ) : mapsSubtab === 'labels' ? (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                        <h4 style={{ color: 'var(--color-accent-primary)', marginBottom: 0 }}>Labels ({labels.length})</h4>
                        <button type="button" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.86em' }} onClick={addLabel}>
                            Add label
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {labels.length === 0 ? (
                            <div className="card-elevated" style={{ padding: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>No labels yet</div>
                        ) : labels.map(label => (
                            <div key={label.id} className="card-elevated" style={{ padding: 'var(--spacing-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{label.name}</div>
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>
                                            {(label.maps || []).length} maps
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => editLabel(label)} style={{ background: 'rgba(33,150,243,0.15)', color: '#2196f3', border: '1px solid rgba(33,150,243,0.3)', padding: '5px 9px', borderRadius: 'var(--radius-sm)', fontSize: '0.8em' }}>Edit</button>
                                        <button onClick={() => deleteLabel(label)} style={{ background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)', border: '1px solid rgba(244,67,54,0.3)', padding: '5px 9px', borderRadius: 'var(--radius-sm)', fontSize: '0.8em' }}>Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : mapsSubtab === 'maps' ? (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                        <h4 style={{ color: 'var(--color-accent-primary)', marginBottom: 0 }}>Maps ({allMaps.length})</h4>
                        <button type="button" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.86em' }} onClick={() => { resetMapForm(); setMapsSubtab('upload'); }}>
                            Upload map
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                        {allMaps.length === 0 ? (
                            <div className="card-elevated" style={{ padding: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>No maps yet</div>
                        ) : labels.filter(label => (label.maps || []).length > 0).map(label => (
                            <section key={label.id}>
                                <h4 style={{ color: 'var(--color-accent-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                    {label.name}
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75em', fontWeight: 400, marginLeft: 8 }}>
                                        ({(label.maps || []).length} maps)
                                    </span>
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                    {(label.maps || []).map(map => (
                                        <div key={map.id} className="card-elevated" style={{ padding: 'var(--spacing-md)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                                <div style={{ flex: 1, minWidth: 220 }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{map.title}</div>
                                                    {map.description && <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.88em', marginTop: 5 }}>{map.description}</div>}
                                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82em', marginTop: 5 }}>
                                                        {map.originalName} · {formatMapSize(map.size)}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                                    <a href={`/api/maps/${map.id}/download`} className="btn btn-secondary" style={{ textDecoration: 'none', padding: '6px 12px', fontSize: '0.82em' }}>Download</a>
                                                    <button onClick={() => editMap({ ...map, labelId: map.labelId || label.id, labelName: label.name })} style={{ background: 'rgba(33,150,243,0.15)', color: '#2196f3', border: '1px solid rgba(33,150,243,0.3)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82em' }}>Edit</button>
                                                    <button onClick={() => deleteMap(map)} style={{ background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)', border: '1px solid rgba(244,67,54,0.3)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82em' }}>Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

// ── Управление аккаунтами игроков (PlayerUser) ───────────────────────────────
function AccountsSection({ showMsg }) {
    useLang();
    const [accounts, setAccounts]           = React.useState([]);
    const [loading, setLoading]             = React.useState(true);
    const [forceUnlinkTag, setForceUnlinkTag] = React.useState('');

    const loadAccounts = React.useCallback(async () => {
        try {
            const data = await apiFetch('/api/players/admin/accounts');
            setAccounts(Array.isArray(data) ? data : []);
        } catch { setAccounts([]); }
        setLoading(false);
    }, []);

    React.useEffect(() => { loadAccounts(); }, [loadAccounts]);

    const deleteAccount = async (acc) => {
        if (!confirm(`${t('admin.accountDeleteConfirm')} "${acc.username}"?`)) return;
        try {
            await apiFetch(`/api/players/admin/accounts/${acc.id}`, { method: 'DELETE' });
            showMsg(`✅ ${t('admin.accountDeleted')}: ${acc.username}`);
            loadAccounts();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const unlinkBattleTag = async (acc) => {
        if (!confirm(`Отвязать BattleTag "${acc.linkedBattleTag}" от аккаунта "${acc.username}"?`)) return;
        try {
            await apiFetch(`/api/players/admin/force-unlink-battletag/${encodeURIComponent(acc.linkedBattleTag)}`, { method: 'DELETE' });
            showMsg(`✅ BattleTag ${acc.linkedBattleTag} отвязан`);
            loadAccounts();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const forceUnlink = async () => {
        const tag = forceUnlinkTag.trim();
        if (!tag) return;
        if (!confirm(`Принудительно отвязать BattleTag "${tag}" от всех аккаунтов?`)) return;
        try {
            const res = await apiFetch(`/api/players/admin/force-unlink-battletag/${encodeURIComponent(tag)}`, { method: 'DELETE' });
            showMsg(`✅ BattleTag ${tag} отвязан (изменено аккаунтов: ${res.modifiedCount})`);
            setForceUnlinkTag('');
            loadAccounts();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

    return (
        <div>
            <h4 style={{ color: 'var(--color-accent-primary)', marginBottom: 'var(--spacing-md)' }}>
                👤 {t('admin.accountsTitle')}
            </h4>

            {/* Force-unlink stuck BattleTag */}
            <div className="card-elevated" style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', maxWidth: 520 }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85em', marginTop: 0, marginBottom: 8 }}>
                    🔗 Принудительно отвязать BattleTag (если аккаунт удалён, но тег «завис»)
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        value={forceUnlinkTag}
                        onChange={e => setForceUnlinkTag(e.target.value)}
                        placeholder="Name#1234"
                        style={{
                            flex: 1, padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(255,255,255,0.15)', background: 'var(--color-bg-dark)',
                            color: 'var(--color-text-primary)', fontSize: '0.9em',
                        }}
                        onKeyDown={e => e.key === 'Enter' && forceUnlink()}
                    />
                    <button
                        onClick={forceUnlink}
                        style={{
                            background: 'rgba(255,152,0,0.15)', color: '#ff9800',
                            border: '1px solid rgba(255,152,0,0.4)', padding: '6px 14px',
                            borderRadius: 'var(--radius-sm)', fontSize: '0.85em', cursor: 'pointer',
                        }}
                    >
                        Отвязать
                    </button>
                </div>
            </div>

            {loading ? (
                <p style={{ color: 'var(--color-text-muted)' }}>...</p>
            ) : accounts.length === 0 ? (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', maxWidth: 500 }}>
                    <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{t('admin.accountsEmpty')}</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-bg-lighter)' }}>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-muted)' }}>{t('profile.username')}</th>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-muted)' }}>BattleTag</th>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-muted)' }}>{t('admin.accountCreated')}</th>
                                <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--color-text-muted)' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map(acc => (
                                <tr key={acc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{acc.username}</td>
                                    <td style={{ padding: '8px 12px', color: acc.linkedBattleTag ? 'var(--color-accent-secondary)' : 'var(--color-text-muted)' }}>
                                        {acc.linkedBattleTag || '—'}
                                    </td>
                                    <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>{fmtDate(acc.createdAt)}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center' }}>
                                        {acc.linkedBattleTag && (
                                            <button
                                                onClick={() => unlinkBattleTag(acc)}
                                                style={{
                                                    background: 'rgba(255,152,0,0.12)', color: '#ff9800',
                                                    border: '1px solid rgba(255,152,0,0.3)', padding: '4px 10px',
                                                    borderRadius: 'var(--radius-sm)', fontSize: '0.82em', cursor: 'pointer',
                                                }}
                                            >
                                                🔗 Отвязать
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteAccount(acc)}
                                            style={{
                                                background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)',
                                                border: '1px solid rgba(244,67,54,0.3)', padding: '4px 12px',
                                                borderRadius: 'var(--radius-sm)', fontSize: '0.82em', cursor: 'pointer',
                                            }}
                                        >
                                            🗑️ {t('admin.delete')}
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

// ── Запросы сброса пароля ─────────────────────────────────────────────────────
function PendingResetsSection({ showMsg }) {
    useLang();
    const [resets, setResets] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    const loadResets = React.useCallback(async () => {
        try {
            const data = await apiFetch('/api/players/admin/pending-resets');
            setResets(Array.isArray(data) ? data : []);
        } catch { setResets([]); }
        setLoading(false);
    }, []);

    React.useEffect(() => { loadResets(); }, [loadResets]);

    const deleteReset = async (id) => {
        try {
            await apiFetch(`/api/players/admin/pending-resets/${id}`, { method: 'DELETE' });
            showMsg(t('admin.resetDeleted'));
            loadResets();
        } catch (err) { showMsg(`❌ ${err.message}`, 'error'); }
    };

    const fmtTime = (d) => {
        const dt = new Date(d);
        return dt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const isExpired = (d) => new Date(d) < new Date();

    return (
        <div>
            <h4 style={{ color: 'var(--color-accent-primary)', marginBottom: 'var(--spacing-md)' }}>
                🔑 {t('admin.resetTitle')}
            </h4>
            {loading ? (
                <p style={{ color: 'var(--color-text-muted)' }}>...</p>
            ) : resets.length === 0 ? (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', maxWidth: 420 }}>
                    <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{t('admin.resetEmpty')}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', maxWidth: 500 }}>
                    {resets.map(r => (
                        <div key={r.id || r._id} className="card-elevated" style={{
                            padding: 'var(--spacing-lg)',
                            opacity: isExpired(r.expiresAt) ? 0.5 : 1,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '1.05em' }}>
                                    {r.username}
                                </span>
                                {isExpired(r.expiresAt) && (
                                    <span style={{ color: 'var(--color-error)', fontSize: '0.8em', fontWeight: 600 }}>
                                        {t('admin.resetExpired')}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>{t('admin.resetCode')}:</span>
                                <span style={{
                                    fontFamily: 'monospace', fontSize: '1.4em', fontWeight: 800,
                                    letterSpacing: 4, color: 'var(--color-accent-secondary)',
                                    background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                                    userSelect: 'all',
                                }}>
                                    {r.resetCode}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>
                                    {fmtTime(r.createdAt)} → {fmtTime(r.expiresAt)}
                                </span>
                                <button
                                    onClick={() => deleteReset(r.id || r._id)}
                                    style={{
                                        background: 'rgba(244,67,54,0.12)', color: 'var(--color-error)',
                                        border: '1px solid rgba(244,67,54,0.3)', padding: '4px 12px',
                                        borderRadius: 'var(--radius-sm)', fontSize: '0.82em', cursor: 'pointer',
                                    }}
                                >
                                    {t('admin.delete')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
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
    const msgTimerRef = React.useRef(null);

    const load = React.useCallback(async () => {
        const [p, tm] = await Promise.all([apiFetch('/api/players'), apiFetch('/api/teams')]);
        setPlayers(p); setTeams(tm);
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const showMsg = (text, type = 'info') => {
        if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
        setMsg(text);
        setMsgType(type);
        msgTimerRef.current = setTimeout(() => {
            setMsg(null);
            msgTimerRef.current = null;
        }, type === 'error' ? 8000 : 4000);
    };

    React.useEffect(() => () => {
        if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    }, []);

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
        { id: 'maps',     label: 'Manage maps' },
        { id: 'tools',    key: 'admin.tab.tools' },
    ];

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                <h2 style={{ margin: 0 }}>{t('admin.title')}</h2>
                <button className="btn btn-secondary" onClick={logout}>{t('admin.logout')}</button>
            </div>

            {msg && (
                <div
                    role="alert"
                    aria-live="assertive"
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 2000,
                        width: 'min(440px, calc(100vw - 32px))',
                        background: msgType === 'error' ? 'rgba(35,12,12,0.98)' : 'rgba(30,25,12,0.98)',
                        border: `2px solid ${msgType === 'error' ? 'var(--color-error)' : 'var(--color-accent-primary)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md) var(--spacing-lg)',
                        color: msgType === 'error' ? 'var(--color-error-light)' : 'var(--color-accent-primary)',
                        fontWeight: 700,
                        boxShadow: msgType === 'error'
                            ? '0 12px 40px rgba(244,67,54,0.35), 0 8px 24px rgba(0,0,0,0.5)'
                            : '0 12px 40px rgba(212,175,55,0.25), 0 8px 24px rgba(0,0,0,0.5)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, lineHeight: 1.45 }}>{msg}</div>
                        <button
                            type="button"
                            onClick={() => {
                                if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
                                msgTimerRef.current = null;
                                setMsg(null);
                            }}
                            aria-label="Close notification"
                            style={{
                                background: 'transparent',
                                color: msgType === 'error' ? 'var(--color-error-light)' : 'var(--color-accent-primary)',
                                border: 'none',
                                fontSize: 20,
                                lineHeight: 1,
                                padding: 0,
                                cursor: 'pointer',
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
                {TABS_ADMIN.map(tb => (
                    <button key={tb.id} className={`nav-btn${tab === tb.id ? ' active' : ''}`} style={{ padding: '10px 22px' }} onClick={() => setTab(tb.id)}>
                        <span>{tb.label || t(tb.key)}</span>
                    </button>
                ))}
            </div>

            {tab === 'players'   && <PlayersTab  players={players} teams={teams} onRefresh={load} showMsg={showMsg} />}
            {tab === 'teams'     && <TeamsTab    teams={teams}   players={players} onRefresh={load} showMsg={showMsg} />}
            {tab === 'clanwars'  && <ClanWarTab  players={players} teams={teams} showMsg={showMsg} />}
            {tab === 'portraits' && <PortraitsTab showMsg={showMsg} />}
            {tab === 'maps'      && <ManageMapsTab showMsg={showMsg} />}
            {tab === 'tools'   && (
                <div>
                    <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>{t('admin.tab.tools')}</h3>
                    <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', maxWidth: 420, marginBottom: 'var(--spacing-xl)' }}>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
                            Принудительный пересчёт очков всех игроков по данным W3Champions
                        </p>
                        <button className="btn btn-primary" onClick={recalc}>{t('admin.recalc')}</button>
                    </div>
                    <PendingResetsSection showMsg={showMsg} />
                    <div style={{ marginTop: 'var(--spacing-xxl)' }}>
                        <AccountsSection showMsg={showMsg} />
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
