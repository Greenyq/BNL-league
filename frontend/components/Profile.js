// Profile — вход игрока, привязка BattleTag, выбор расы и портрета

const PLAYER_SESSION_KEY = 'bnl_player_session';
const getPlayerSession   = () => localStorage.getItem(PLAYER_SESSION_KEY);
const setPlayerSession   = id => localStorage.setItem(PLAYER_SESSION_KEY, id);
const clearPlayerSession = () => localStorage.removeItem(PLAYER_SESSION_KEY);

const RACE_OPTIONS = [
    { value: 1, label: 'Human',      img: '/images/human.jpg' },
    { value: 2, label: 'Orc',        img: '/images/orc.jpg' },
    { value: 4, label: 'Night Elf',  img: '/images/nightelf.jpg' },
    { value: 8, label: 'Undead',     img: '/images/undead.jpg' },
];

// Portraits are loaded dynamically from /api/portraits
const PORTRAIT_RACE_LABELS = { 0: 'Все', 1: 'Люди', 2: 'Орки', 4: 'Эльфы', 8: 'Нежить' };

async function playerFetch(url, options = {}) {
    const sid = getPlayerSession();
    const headers = {
        'Content-Type': 'application/json',
        ...(sid ? { 'x-player-session-id': sid } : {}),
        ...(options.headers || {}),
    };
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
}

// ── Форма входа / регистрации ─────────────────────────────────────────────────
function AuthForm({ onAuth }) {
    useLang();
    const [mode,     setMode]     = React.useState('login'); // 'login' | 'register'
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error,    setError]    = React.useState(null);
    const [loading,  setLoading]  = React.useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError(null); setLoading(true);
        try {
            const data = await playerFetch(`/api/players/auth/${mode}`, {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
            setPlayerSession(data.sessionId);
            onAuth(data.user, data.playerData || null);
        } catch (err) { setError(err.message); }
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: 400, margin: '40px auto' }}>
            <div className="card-elevated" style={{ padding: 'var(--spacing-xxl)' }}>
                <h3 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)', color: 'var(--color-accent-primary)' }}>
                    {mode === 'login' ? t('profile.login') : t('profile.register')}
                </h3>

                {/* Переключатель режима */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--spacing-xl)' }}>
                    {['login', 'register'].map(m => (
                        <button key={m} className={`nav-btn${mode === m ? ' active' : ''}`} style={{ flex: 1, padding: '8px 0' }} onClick={() => { setMode(m); setError(null); }}>
                            <span>{m === 'login' ? t('profile.login') : t('profile.register')}</span>
                        </button>
                    ))}
                </div>

                {error && (
                    <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-md)', color: 'var(--color-error)', marginBottom: 'var(--spacing-lg)', fontSize: '0.9em' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <input type="text"     placeholder={t('profile.username')} value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%' }} />
                    <input type="password" placeholder={t('profile.password')} value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%' }} />
                    <button type="submit" className="btn btn-primary" disabled={loading || !username || !password} style={{ width: '100%' }}>
                        {loading ? '...' : mode === 'login' ? t('profile.loginBtn') : t('profile.registerBtn')}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Профиль залогиненного игрока ──────────────────────────────────────────────
function PlayerProfile({ user, playerData: initPlayerData, onLogout }) {
    useLang();
    const [playerData,   setPlayerData]   = React.useState(initPlayerData);
    const [linkTag,      setLinkTag]      = React.useState('');
    const [linkLoading,  setLinkLoading]  = React.useState(false);
    const [linkError,    setLinkError]    = React.useState(null);
    const [msg,          setMsg]          = React.useState(null);
    const [msgType,      setMsgType]      = React.useState('ok');
    const [selectedRace, setSelectedRace] = React.useState(initPlayerData?.race || initPlayerData?.mainRace || null);
    const [selectedPort, setSelectedPort] = React.useState(initPlayerData?.selectedPortrait || null);
    const [allPortraits, setAllPortraits] = React.useState([]);

    React.useEffect(() => {
        fetch('/api/portraits').then(r => r.json()).then(data => setAllPortraits(Array.isArray(data) ? data : [])).catch(() => {});
    }, []);

    const flash = (text, type = 'ok') => {
        setMsg(text); setMsgType(type);
        setTimeout(() => setMsg(null), 3500);
    };

    const logout = async () => {
        try { await playerFetch('/api/players/auth/logout', { method: 'POST' }); } catch {}
        clearPlayerSession(); onLogout();
    };

    const linkBattleTag = async (e) => {
        e.preventDefault();
        setLinkError(null); setLinkLoading(true);
        try {
            const data = await playerFetch('/api/players/auth/link-battletag', {
                method: 'PUT', body: JSON.stringify({ battleTag: linkTag.trim() }),
            });
            setPlayerData(data.linkedPlayer);
            setSelectedRace(data.linkedPlayer?.race || null);
            setSelectedPort(data.linkedPlayer?.selectedPortrait || null);
            setLinkTag('');
            flash(t('profile.linked'));
        } catch (err) { setLinkError(err.message); }
        setLinkLoading(false);
    };

    const unlinkBattleTag = async () => {
        if (!confirm(t('profile.unlinkConfirm'))) return;
        try {
            await playerFetch('/api/players/auth/unlink-battletag', { method: 'DELETE' });
            setPlayerData(null); setSelectedRace(null); setSelectedPort(null);
            flash(t('profile.unlinked'));
        } catch (err) { flash(err.message, 'err'); }
    };

    const saveRace = async (race) => {
        setSelectedRace(race);
        try {
            await playerFetch('/api/players/auth/select-race', { method: 'PUT', body: JSON.stringify({ race }) });
            flash(t('profile.raceSaved'));
        } catch (err) { flash(err.message, 'err'); }
    };

    const savePortrait = async (src) => {
        setSelectedPort(src);
        try {
            await playerFetch('/api/players/auth/select-portrait', { method: 'PUT', body: JSON.stringify({ portrait: src }) });
            flash(t('profile.portraitSaved'));
        } catch (err) { flash(err.message, 'err'); }
    };

    // Use linkedBattleTag from user object as fallback when playerData hasn't loaded yet
    const linkedTag = playerData?.battleTag || user?.linkedBattleTag || null;
    const currentPortrait = selectedPort || null;
    // Portraits filtered by selected race (+ race=0 which is universal)
    const visiblePortraits = selectedRace
        ? allPortraits.filter(p => p.race === 0 || p.race === selectedRace)
        : allPortraits;
    const PORTRAIT_RACE_ORDER = [0, 1, 2, 4, 8];
    const portraitsByRace = visiblePortraits.reduce((acc, p) => {
        if (!acc[p.race]) acc[p.race] = [];
        acc[p.race].push(p);
        return acc;
    }, {});

    return (
        <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>

            {/* Шапка профиля */}
            <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                {currentPortrait ? (
                    <img src={currentPortrait} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-accent-primary)', boxShadow: '0 4px 20px rgba(212,175,55,0.5)', flexShrink: 0 }} />
                ) : (
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-bg-lighter)', border: '3px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2em', flexShrink: 0 }}>👤</div>
                )}
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.3em', fontWeight: 800, color: 'var(--color-text-primary)' }}>{user.username}</div>
                    {linkedTag ? (
                        <div style={{ color: 'var(--color-accent-primary)', fontWeight: 600, fontSize: '0.95em', marginTop: 4 }}>
                            ⚔ {linkedTag}
                            {playerData?.currentMmr && <span style={{ color: 'var(--color-accent-secondary)', marginLeft: 10 }}>MMR {playerData.currentMmr}</span>}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9em', marginTop: 4 }}>{t('profile.noLink')}</div>
                    )}
                </div>
                <button className="btn btn-secondary" onClick={logout} style={{ padding: '6px 14px', flexShrink: 0 }}>{t('profile.logout')}</button>
            </div>

            {/* Уведомление */}
            {msg && (
                <div style={{ background: msgType === 'err' ? 'rgba(244,67,54,0.1)' : 'rgba(76,175,80,0.1)', border: `1px solid ${msgType === 'err' ? 'var(--color-error)' : 'var(--color-success)'}`, borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-md)', color: msgType === 'err' ? 'var(--color-error)' : 'var(--color-success)', marginBottom: 'var(--spacing-lg)', fontWeight: 600 }}>
                    {msg}
                </div>
            )}

            {/* Привязка BattleTag */}
            <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)' }}>
                <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-primary)' }}>🔗 {t('profile.linkTitle')}</h4>
                {linkedTag ? (
                    <div>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                            {t('profile.linkedAs')} <strong style={{ color: 'var(--color-text-primary)' }}>{linkedTag}</strong>
                        </p>
                        <button className="btn btn-secondary" onClick={unlinkBattleTag} style={{ padding: '8px 16px', fontSize: '0.9em', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
                            {t('profile.unlink')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={linkBattleTag}>
                        {linkError && (
                            <div style={{ color: 'var(--color-error)', fontSize: '0.9em', marginBottom: 'var(--spacing-sm)' }}>{linkError}</div>
                        )}
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                            <input
                                type="text" placeholder="Player#1234"
                                value={linkTag} onChange={e => setLinkTag(e.target.value)}
                                style={{ flex: 1, minWidth: 200 }}
                            />
                            <button type="submit" className="btn btn-primary" disabled={linkLoading || !linkTag.trim()}>
                                {linkLoading ? '...' : t('profile.link')}
                            </button>
                        </div>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82em', marginTop: 8 }}>
                            {t('profile.linkHint')}
                        </p>
                    </form>
                )}
            </div>

            {/* Выбор расы — только если BattleTag привязан */}
            {linkedTag && (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)' }}>
                    <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-primary)' }}>⚔ {t('profile.raceTitle')}</h4>
                    <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                        {RACE_OPTIONS.map(r => (
                            <div key={r.value} onClick={() => saveRace(r.value)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                                <img src={r.img} alt={r.label} style={{
                                    width: 70, height: 70, borderRadius: 'var(--radius-md)', objectFit: 'cover',
                                    border: selectedRace === r.value ? '3px solid var(--color-accent-primary)' : '3px solid rgba(255,255,255,0.08)',
                                    boxShadow: selectedRace === r.value ? '0 0 20px rgba(212,175,55,0.6)' : 'none',
                                    transform: selectedRace === r.value ? 'scale(1.07)' : 'scale(1)',
                                    transition: 'all 0.2s',
                                }} />
                                <div style={{ fontSize: '0.8em', marginTop: 5, color: selectedRace === r.value ? 'var(--color-accent-primary)' : 'var(--color-text-muted)', fontWeight: selectedRace === r.value ? 700 : 400 }}>
                                    {r.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Выбор портрета — только если BattleTag привязан */}
            {linkedTag && (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)' }}>
                    <h4 style={{ marginBottom: 8, color: 'var(--color-accent-primary)' }}>🖼 {t('profile.portraitTitle')}</h4>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85em', marginBottom: 'var(--spacing-lg)' }}>
                        {t('profile.portraitDesc')}
                        {selectedRace && <span style={{ color: 'var(--color-accent-secondary)', marginLeft: 6 }}>
                            · {t(`race.${selectedRace}`)} + {t('race.0')}
                        </span>}
                    </p>

                    {allPortraits.length === 0 && (
                        <p style={{ color: 'var(--color-text-muted)' }}>Портреты ещё не добавлены администратором</p>
                    )}

                    {/* Все портреты по расам, без замков */}
                    {PORTRAIT_RACE_ORDER.filter(r => portraitsByRace[r]?.length).map(r => (
                        <div key={r} style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78em', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 'var(--spacing-sm)' }}>
                                {PORTRAIT_RACE_LABELS[r]}
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                                {portraitsByRace[r].map(p => (
                                    <div key={p.id} onClick={() => savePortrait(p.imageUrl)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                                        <img src={p.imageUrl} alt={p.name} style={{
                                            width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                                            border: selectedPort === p.imageUrl ? '3px solid var(--color-accent-primary)' : '3px solid rgba(255,255,255,0.08)',
                                            boxShadow: selectedPort === p.imageUrl ? '0 0 24px rgba(212,175,55,0.7)' : 'none',
                                            transform: selectedPort === p.imageUrl ? 'scale(1.1)' : 'scale(1)',
                                            transition: 'all 0.2s',
                                        }} />
                                        <div style={{ fontSize: '0.78em', marginTop: 5, color: selectedPort === p.imageUrl ? 'var(--color-accent-primary)' : 'var(--color-text-muted)', fontWeight: selectedPort === p.imageUrl ? 700 : 400 }}>
                                            {p.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Точка входа ───────────────────────────────────────────────────────────────
function Profile() {
    useLang();
    const [user,       setUser]       = React.useState(null);
    const [playerData, setPlayerData] = React.useState(null);
    const [checking,   setChecking]   = React.useState(true);

    React.useEffect(() => {
        const sid = getPlayerSession();
        if (!sid) { setChecking(false); return; }
        playerFetch('/api/players/auth/me')
            .then(d => { setUser(d.user); setPlayerData(d.playerData); })
            .catch(err => {
                // Only clear session on explicit auth rejection, not network/server errors
                const msg = err.message || '';
                if (msg === 'Not authenticated' || msg === 'User not found') clearPlayerSession();
            })
            .finally(() => setChecking(false));
    }, []);

    if (checking) return (
        <div style={{ textAlign: 'center', padding: 64 }}>
            <div className="skeleton" style={{ height: 40, width: 220, margin: '0 auto', borderRadius: 8 }} />
        </div>
    );

    if (!user) return (
        <AuthForm onAuth={(u, pd) => { setUser(u); setPlayerData(pd); }} />
    );

    return (
        <PlayerProfile
            user={user}
            playerData={playerData}
            onLogout={() => { setUser(null); setPlayerData(null); }}
        />
    );
}
