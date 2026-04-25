// Profile — вход игрока, привязка BattleTag, выбор расы и портрета

const PLAYER_SESSION_KEY = 'bnl_player_session';
const getPlayerSession   = () => localStorage.getItem(PLAYER_SESSION_KEY);
const setPlayerSession   = id => localStorage.setItem(PLAYER_SESSION_KEY, id);
const clearPlayerSession = () => localStorage.removeItem(PLAYER_SESSION_KEY);

const RACE_OPTIONS = [
    { value: 0, label: 'Random',     img: '/images/random.svg' },
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

// ── Форма входа / регистрации / восстановления пароля ─────────────────────────
function AuthForm({ onAuth }) {
    useLang();
    const [mode,     setMode]     = React.useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPw, setConfirmPw] = React.useState('');
    const [resetCode, setResetCode] = React.useState('');
    const [error,    setError]    = React.useState(null);
    const [success,  setSuccess]  = React.useState(null);
    const [loading,  setLoading]  = React.useState(false);

    const switchMode = (m) => { setMode(m); setError(null); setSuccess(null); };

    const submit = async (e) => {
        e.preventDefault();
        setError(null); setSuccess(null); setLoading(true);
        try {
            if (mode === 'login' || mode === 'register') {
                const data = await playerFetch(`/api/players/auth/${mode}`, {
                    method: 'POST',
                    body: JSON.stringify({ username, password }),
                });
                setPlayerSession(data.sessionId);
                onAuth(data.user, data.playerData || null);
            } else if (mode === 'forgot') {
                await playerFetch('/api/players/auth/request-reset', {
                    method: 'POST',
                    body: JSON.stringify({ username }),
                });
                setSuccess(t('profile.resetRequested'));
                // Auto-switch to code entry form
                setTimeout(() => switchMode('reset'), 2000);
            } else if (mode === 'reset') {
                if (password !== confirmPw) { setError(t('profile.resetMismatch')); setLoading(false); return; }
                await playerFetch('/api/players/auth/reset-password', {
                    method: 'POST',
                    body: JSON.stringify({ username, resetCode: resetCode.trim(), newPassword: password }),
                });
                setSuccess(t('profile.resetDone'));
                setPassword(''); setConfirmPw(''); setResetCode('');
                setTimeout(() => switchMode('login'), 2000);
            }
        } catch (err) { setError(err.message); }
        setLoading(false);
    };

    const modeTitle = { login: t('profile.login'), register: t('profile.register'), forgot: t('profile.forgotTitle'), reset: t('profile.resetTitle') };

    return (
        <div className="animate-fade-in wow-section-page" style={{ maxWidth: 400, margin: '0 auto' }}>
            <WoWSectionTitle>{modeTitle[mode]}</WoWSectionTitle>
            <div className="card-elevated" style={{ padding: 'var(--spacing-xxl)' }}>

                {/* Переключатель режима */}
                {(mode === 'login' || mode === 'register') && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--spacing-xl)' }}>
                        {['login', 'register'].map(m => (
                            <button key={m} className={`nav-btn${mode === m ? ' active' : ''}`} style={{ flex: 1, padding: '8px 0' }} onClick={() => switchMode(m)}>
                                <span>{m === 'login' ? t('profile.login') : t('profile.register')}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Кнопка «назад» из режима восстановления */}
                {(mode === 'forgot' || mode === 'reset') && (
                    <button
                        onClick={() => switchMode('login')}
                        style={{ background: 'none', border: 'none', color: 'var(--color-accent-primary)', cursor: 'pointer', padding: 0, marginBottom: 'var(--spacing-lg)', fontSize: '0.9em', fontWeight: 600 }}
                    >
                        ← {t('profile.backToLogin')}
                    </button>
                )}

                {error && (
                    <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-md)', color: 'var(--color-error)', marginBottom: 'var(--spacing-lg)', fontSize: '0.9em' }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-md)', color: 'var(--color-success)', marginBottom: 'var(--spacing-lg)', fontSize: '0.9em', fontWeight: 600 }}>
                        {success}
                    </div>
                )}

                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <input type="text" placeholder={t('profile.username')} value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%' }} />

                    {(mode === 'login' || mode === 'register') && (
                        <input type="password" placeholder={t('profile.password')} value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%' }} />
                    )}

                    {mode === 'forgot' && (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85em', margin: 0 }}>
                            {t('profile.forgotHint')}
                        </p>
                    )}

                    {mode === 'reset' && (
                        <React.Fragment>
                            <input type="text" placeholder={t('profile.resetCodePlaceholder')} value={resetCode} onChange={e => setResetCode(e.target.value)} style={{ width: '100%', letterSpacing: 4, textAlign: 'center', fontWeight: 700, fontSize: '1.2em' }} maxLength={6} />
                            <input type="password" placeholder={t('profile.newPassword')} value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%' }} />
                            <input type="password" placeholder={t('profile.confirmPassword')} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={{ width: '100%' }} />
                        </React.Fragment>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={loading || !username || (mode === 'login' && !password) || (mode === 'register' && !password) || (mode === 'reset' && (!resetCode || !password || !confirmPw))} style={{ width: '100%' }}>
                        {loading ? '...' : mode === 'login' ? t('profile.loginBtn') : mode === 'register' ? t('profile.registerBtn') : mode === 'forgot' ? t('profile.forgotBtn') : t('profile.resetBtn')}
                    </button>
                </form>

                {/* Ссылка «Забыли пароль?» */}
                {mode === 'login' && (
                    <div style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>
                        <button
                            onClick={() => switchMode('forgot')}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0, fontSize: '0.85em', textDecoration: 'underline' }}
                        >
                            {t('profile.forgotLink')}
                        </button>
                    </div>
                )}

                {/* Ссылка «У меня есть код» из режима forgot */}
                {mode === 'forgot' && (
                    <div style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>
                        <button
                            onClick={() => switchMode('reset')}
                            style={{ background: 'none', border: 'none', color: 'var(--color-accent-secondary)', cursor: 'pointer', padding: 0, fontSize: '0.85em', textDecoration: 'underline' }}
                        >
                            {t('profile.haveCode')}
                        </button>
                    </div>
                )}
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
    // Use ?? (not ||) so that race=0 (Random) is preserved as 0, not replaced by null
    const [selectedRace,   setSelectedRace]   = React.useState(initPlayerData?.mainRace ?? initPlayerData?.race ?? null);
    const [selectedPort,   setSelectedPort]   = React.useState(initPlayerData?.selectedPortrait ?? null);
    const [allPortraits,   setAllPortraits]   = React.useState([]);
    const [draftAvailable, setDraftAvailable] = React.useState(initPlayerData?.draftAvailable ?? false);
    const [draftLoading,   setDraftLoading]   = React.useState(false);

    // Re-fetch profile data on mount to ensure fresh state (fixes stale/missing data after re-login)
    React.useEffect(() => {
        playerFetch('/api/players/auth/me')
            .then(d => {
                if (d.playerData) {
                    setPlayerData(d.playerData);
                    setSelectedRace(d.playerData.mainRace ?? d.playerData.race ?? null);
                    setSelectedPort(d.playerData.selectedPortrait ?? null);
                    setDraftAvailable(d.playerData.draftAvailable ?? false);
                }
            })
            .catch(() => {});
    }, []);

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
            setSelectedRace(data.linkedPlayer?.mainRace ?? data.linkedPlayer?.race ?? null);
            setSelectedPort(data.linkedPlayer?.selectedPortrait ?? null);
            setDraftAvailable(data.linkedPlayer?.draftAvailable ?? false);
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

    const toggleDraft = async () => {
        setDraftLoading(true);
        try {
            const data = await playerFetch('/api/players/auth/toggle-draft', { method: 'PUT' });
            setDraftAvailable(data.draftAvailable);
            flash(t('profile.draftSaved'));
        } catch (err) { flash(err.message, 'err'); }
        setDraftLoading(false);
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
    // Portraits filtered by selected race (+ race=0 which is universal).
    // selectedRace===null means no race chosen → show all.
    // selectedRace===0 (Random) means show all as well.
    const visiblePortraits = (selectedRace !== null && selectedRace !== 0)
        ? allPortraits.filter(p => p.race === 0 || p.race === selectedRace)
        : allPortraits;
    const PORTRAIT_RACE_ORDER = [0, 1, 2, 4, 8];
    const portraitsByRace = visiblePortraits.reduce((acc, p) => {
        if (!acc[p.race]) acc[p.race] = [];
        acc[p.race].push(p);
        return acc;
    }, {});

    return (
        <div className="animate-fade-in wow-section-page" style={{ maxWidth: 600, margin: '0 auto' }}>
            <WoWSectionTitle>{t('profile.title')}</WoWSectionTitle>

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

            {/* Драфт — тогглер доступности (каждый игрок управляет сам) */}
            {linkedTag && (
                <div className="card-elevated" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)' }}>
                    <h4 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-accent-primary)' }}>
                        {t('profile.draftTitle')}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                        <button
                            onClick={toggleDraft}
                            disabled={draftLoading}
                            style={{
                                padding: '8px 22px',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: 700,
                                fontSize: '0.92em',
                                border: `2px solid ${draftAvailable ? 'var(--color-success)' : 'rgba(255,255,255,0.15)'}`,
                                background: draftAvailable ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)',
                                color: draftAvailable ? 'var(--color-success)' : 'var(--color-text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                letterSpacing: 0.5,
                            }}
                        >
                            {draftLoading ? '...' : (draftAvailable ? `✔ ${t('profile.draftOn')}` : `✗ ${t('profile.draftOff')}`)}
                        </button>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82em' }}>
                            {t('profile.draftDesc')}
                        </span>
                    </div>
                </div>
            )}

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
                        {(selectedRace !== null && selectedRace !== 0) && <span style={{ color: 'var(--color-accent-secondary)', marginLeft: 6 }}>
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
