// Teams — карточки команд с портретами игроков, статистикой и клан-варами

const RACE_IMG  = { 0: '/images/random.svg', 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };
const RACE_ABBR = { 0: 'Rnд', 1: 'Люди', 2: 'Орки', 4: 'Эльфы', 8: 'Нежить' };
const RACE_COLOR = { 1: '#a8d8ea', 2: '#ff7043', 4: '#66bb6a', 8: '#b0b0b0' };

// ── Строка игрока в команде ───────────────────────────────────────────────────
function PlayerRow({ player, isCaptain }) {
    const race    = player.mainRace || player.race;
    const stats   = player.stats;
    const portrait = player.selectedPortrait;

    return (
        <div className="team-player-row">
            {/* Аватар + раса */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                {portrait ? (
                    <img src={portrait} alt={player.name} style={{
                        width: 46, height: 46, borderRadius: '50%', objectFit: 'cover',
                        border: '2px solid var(--color-accent-primary)',
                    }} />
                ) : (
                    <div style={{
                        width: 46, height: 46, borderRadius: '50%',
                        background: 'var(--color-bg-lighter)',
                        border: '2px solid rgba(212,175,55,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.3em', color: 'var(--color-text-muted)',
                    }}>
                        {race && RACE_IMG[race] ? (
                            <img src={RACE_IMG[race]} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', opacity: 0.7 }} />
                        ) : '👤'}
                    </div>
                )}
                {/* Иконка расы в углу */}
                {race && RACE_IMG[race] && portrait && (
                    <img src={RACE_IMG[race]} alt="" style={{
                        position: 'absolute', bottom: -3, right: -3,
                        width: 18, height: 18, borderRadius: '50%', objectFit: 'cover',
                        border: '1.5px solid var(--color-bg-card)',
                    }} />
                )}
            </div>

            {/* Имя + тег */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.95em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {player.name || player.battleTag.split('#')[0]}
                    </span>
                    {isCaptain && (
                        <span style={{ fontSize: '0.65em', background: 'rgba(212,175,55,0.2)', color: 'var(--color-accent-primary)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 4, padding: '1px 5px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            👑 Капитан
                        </span>
                    )}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.battleTag}
                    {race && RACE_ABBR[race] && (
                        <span style={{ marginLeft: 6, color: RACE_COLOR[race] || 'var(--color-text-muted)' }}>
                            · {RACE_ABBR[race]}
                        </span>
                    )}
                </div>
            </div>

            {/* Статистика */}
            {stats ? (
                <div className="team-player-stats">
                    <div className="team-stat-cell">
                        <span className="team-stat-label">MMR</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-accent-secondary)' }}>{stats.mmr || player.currentMmr || '—'}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">W</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-success)' }}>{stats.wins}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">L</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-error)' }}>{stats.losses}</span>
                    </div>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">Pts</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-accent-primary)', fontWeight: 800 }}>{stats.points}</span>
                    </div>
                </div>
            ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75em', whiteSpace: 'nowrap' }}>
                    MMR {player.currentMmr || '—'}
                </div>
            )}
        </div>
    );
}

// ── Карточка клан-вара внутри команды ─────────────────────────────────────────
function TeamClanWarRow({ cw, teamName }) {
    const isA   = cw.teamA?.name?.toLowerCase() === teamName.toLowerCase();
    const opp   = isA ? cw.teamB?.name : cw.teamA?.name;
    const myScore  = isA ? (cw.clanWarScore?.a ?? 0) : (cw.clanWarScore?.b ?? 0);
    const oppScore = isA ? (cw.clanWarScore?.b ?? 0) : (cw.clanWarScore?.a ?? 0);
    const won   = cw.status === 'completed' && ((isA && cw.winner === 'a') || (!isA && cw.winner === 'b'));
    const lost  = cw.status === 'completed' && !won && cw.winner;
    const result = won ? '✅' : lost ? '❌' : cw.status === 'ongoing' ? '⚔' : '📅';
    const date   = cw.date ? new Date(cw.date).toLocaleDateString('ru') : '';

    return (
        <div className="team-cw-row">
            <span style={{ fontSize: '1em' }}>{result}</span>
            <span style={{ flex: 1, color: 'var(--color-text-secondary)', fontSize: '0.85em' }}>
                vs <strong style={{ color: 'var(--color-text-primary)' }}>{opp || '?'}</strong>
            </span>
            <span style={{ fontWeight: 700, color: won ? 'var(--color-success)' : lost ? 'var(--color-error)' : 'var(--color-text-muted)', fontSize: '0.9em' }}>
                {myScore} — {oppScore}
            </span>
            {date && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75em' }}>{date}</span>}
        </div>
    );
}

// ── Полная карточка команды ───────────────────────────────────────────────────
function TeamCard({ team, players, clanWars, onOpenRecruit, onOpenDraft }) {
    useLang();
    const rosterRaw = players.filter(p => p.teamId === team.id);
    // Captain always first in roster
    const roster = [...rosterRaw].sort((a, b) => {
        if (a.id === team.captainId) return -1;
        if (b.id === team.captainId) return 1;
        return 0;
    });
    const captain  = players.find(p => p.id === team.captainId);
    const teamCWs  = clanWars.filter(cw =>
        cw.teamA?.name?.toLowerCase() === team.name.toLowerCase() ||
        cw.teamB?.name?.toLowerCase() === team.name.toLowerCase()
    ).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // Find the most relevant clan war for draft: drafting > upcoming > ongoing > latest
    const draftCw = teamCWs.find(cw => cw.draft?.status === 'drafting')
        || teamCWs.find(cw => cw.status === 'upcoming')
        || teamCWs.find(cw => cw.status === 'ongoing')
        || teamCWs[0] || null;

    const draftStatus = draftCw?.draft?.status || 'pending';
    const cwWins   = teamCWs.filter(cw => cw.status === 'completed' && (
        (cw.teamA?.name?.toLowerCase() === team.name.toLowerCase() && cw.winner === 'a') ||
        (cw.teamB?.name?.toLowerCase() === team.name.toLowerCase() && cw.winner === 'b')
    )).length;
    const cwLosses = teamCWs.filter(cw => cw.status === 'completed' && cw.winner && (
        (cw.teamA?.name?.toLowerCase() === team.name.toLowerCase() && cw.winner !== 'a') ||
        (cw.teamB?.name?.toLowerCase() === team.name.toLowerCase() && cw.winner !== 'b')
    )).length;
    const totalPts = roster.reduce((sum, p) => sum + (p.stats?.points || 0), 0);

    return (
        <div className="team-card-v2">
            {/* Шапка команды */}
            <div className="team-card-header">
                {team.logo ? (
                    <img src={team.logo} alt={team.name} className="team-logo-v2" />
                ) : (
                    <div className="team-logo-placeholder">{team.emoji || '🛡'}</div>
                )}
                <div style={{ flex: 1, minWidth: 80 }}>
                    <div className="team-name-v2">{team.emoji && !team.logo ? '' : (team.emoji || '')} {team.name}</div>
                    {captain && (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82em', marginTop: 2 }}>
                            👑 {captain.name || captain.battleTag}
                        </div>
                    )}
                </div>
                {/* Сводка */}
                <div className="team-summary">
                    <div className="team-summary-item">
                        <span className="team-summary-label">Игроков</span>
                        <span className="team-summary-val">{roster.length}</span>
                    </div>
                    <div className="team-summary-item">
                        <span className="team-summary-label">Очков</span>
                        <span className="team-summary-val" style={{ color: 'var(--color-accent-primary)' }}>{totalPts}</span>
                    </div>
                    {(cwWins + cwLosses) > 0 && (
                        <div className="team-summary-item">
                            <span className="team-summary-label">КВ</span>
                            <span className="team-summary-val">
                                <span style={{ color: 'var(--color-success)' }}>{cwWins}</span>
                                <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                                <span style={{ color: 'var(--color-error)' }}>{cwLosses}</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Кнопка набора */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    {draftStatus === 'drafting' && (
                        <button
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.82em', display: 'flex', alignItems: 'center', gap: 5 }}
                            onClick={() => onOpenDraft && onOpenDraft({ clanWarId: draftCw.id || draftCw._id })}
                        >
                            Драфт идёт
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block', flexShrink: 0 }} />
                        </button>
                    )}
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.82em' }}
                        onClick={() => onOpenRecruit && onOpenRecruit({ teamId: team.id, teamName: team.name, captainId: team.captainId || null })}
                    >
                        Набор
                    </button>
                </div>
            </div>

            {/* Разделитель */}
            <div style={{ height: 1, background: 'rgba(212,175,55,0.15)', margin: '0 var(--spacing-lg)' }} />

            {/* Состав */}
            <div className="team-roster">
                {roster.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0', fontSize: '0.85em' }}>
                        Нет игроков
                    </p>
                ) : (
                    roster.map(p => (
                        <PlayerRow key={p.id} player={p} isCaptain={p.id === team.captainId} />
                    ))
                )}
            </div>

            {/* История клан-варов */}
            {teamCWs.length > 0 && (
                <>
                    <div style={{ height: 1, background: 'rgba(212,175,55,0.15)', margin: '0 var(--spacing-lg)' }} />
                    <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72em', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                            ⚔ Клан-вары
                        </div>
                        {teamCWs.slice(0, 5).map((cw, i) => (
                            <TeamClanWarRow key={cw.id || i} cw={cw} teamName={team.name} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Модалка запуска драфта ────────────────────────────────────────────────────
function StartDraftModal({ teams, onStart, onClose }) {
    useLang();
    const [teamAId, setTeamAId] = React.useState('');
    const [teamBId, setTeamBId] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error,   setError]   = React.useState(null);
    const adminSid = localStorage.getItem('bnl_admin_session');

    const submit = async () => {
        if (!teamAId || !teamBId) return setError('Выберите обе команды');
        if (teamAId === teamBId)  return setError('Команды должны быть разными');
        setLoading(true); setError(null);
        try {
            const res  = await fetch('/api/draft/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-session-id': adminSid || '' },
                body: JSON.stringify({ teamAId, teamBId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка создания драфта');
            onStart(data.clanWarId);
        } catch (err) { setError(err.message); setLoading(false); }
    };

    const sel = { background: 'var(--color-bg-lighter)', color: 'var(--color-text-primary)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 6, padding: '8px 12px', width: '100%', fontSize: '0.9em' };
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card-elevated" style={{ padding: 'var(--spacing-xxl)', maxWidth: 420, width: '90%' }}>
                <h3 style={{ color: 'var(--color-accent-primary)', marginBottom: 'var(--spacing-xl)', textAlign: 'center' }}>
                    Начать драфт
                </h3>
                {error && (
                    <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid var(--color-error)', borderRadius: 6, padding: '8px 12px', color: 'var(--color-error)', marginBottom: 'var(--spacing-md)', fontSize: '0.9em' }}>
                        {error}
                    </div>
                )}
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8em', marginBottom: 6 }}>Команда A</div>
                    <select value={teamAId} onChange={e => setTeamAId(e.target.value)} style={sel}>
                        <option value="">— выберите команду —</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8em', marginBottom: 6 }}>Команда B</div>
                    <select value={teamBId} onChange={e => setTeamBId(e.target.value)} style={sel}>
                        <option value="">— выберите команду —</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1, padding: '10px' }} onClick={submit} disabled={loading}>
                        {loading ? '...' : 'Начать драфт'}
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={onClose} disabled={loading}>
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Точка входа ───────────────────────────────────────────────────────────────
function Teams({ onOpenRecruit, onOpenDraft }) {
    useLang();
    const [teams,         setTeams]         = React.useState([]);
    const [players,       setPlayers]       = React.useState([]);
    const [clanWars,      setClanWars]      = React.useState([]);
    const [loading,       setLoading]       = React.useState(true);
    const [error,         setError]         = React.useState(null);
    const [showDraftModal, setShowDraftModal] = React.useState(false);
    const isAdmin = !!localStorage.getItem('bnl_admin_session');

    const load = () => {
        Promise.all([
            fetch('/api/teams').then(r => r.json()),
            fetch('/api/players').then(r => r.json()),
            fetch('/api/clan-wars').then(r => r.json()),
        ])
            .then(([tm, pl, cw]) => {
                setTeams(tm);
                setPlayers(pl);
                setClanWars(Array.isArray(cw) ? cw : []);
                setLoading(false);
            })
            .catch(err => { setError(err.message); setLoading(false); });
    };

    React.useEffect(() => { load(); }, []);

    if (loading) return (
        <div className="teams-grid-v2">
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
    );
    if (error) return <div style={{ color: 'var(--color-error)', padding: 32, textAlign: 'center' }}>⚠ {error}</div>;

    return (
        <div className="animate-fade-in">
            {showDraftModal && (
                <StartDraftModal
                    teams={teams}
                    onStart={clanWarId => { setShowDraftModal(false); onOpenDraft && onOpenDraft({ clanWarId }); }}
                    onClose={() => setShowDraftModal(false)}
                />
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--spacing-lg)' }}>
                <div className="wow-section-title" style={{ margin: 0 }}>{t('teams.title')}</div>
                {isAdmin && (
                    <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.9em' }} onClick={() => setShowDraftModal(true)}>
                        Начать драфт
                    </button>
                )}
            </div>
            {teams.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>{t('teams.empty')}</p>
            ) : (
                <div className="teams-grid-v2">
                    {teams.map(team => (
                        <TeamCard key={team.id} team={team} players={players} clanWars={clanWars} onOpenRecruit={onOpenRecruit} onOpenDraft={onOpenDraft} />
                    ))}
                </div>
            )}
        </div>
    );
}
