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
function TeamCard({ team, players, clanWars, onOpenDraft }) {
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

                {/* Кнопка набора — всегда доступна */}
                <button
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.82em', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => onOpenDraft({ teamId: team.id, teamName: team.name, clanWarId: draftCw?.id || draftCw?._id || null })}
                >
                    ⚔ Набор
                    {draftStatus === 'drafting' && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block', flexShrink: 0 }} />
                    )}
                </button>
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

// ── Точка входа ───────────────────────────────────────────────────────────────
function Teams({ onOpenDraft }) {
    useLang();
    const [teams,     setTeams]     = React.useState([]);
    const [players,   setPlayers]   = React.useState([]);
    const [clanWars,  setClanWars]  = React.useState([]);
    const [loading,   setLoading]   = React.useState(true);
    const [error,     setError]     = React.useState(null);

    React.useEffect(() => {
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
    }, []);

    if (loading) return (
        <div className="teams-grid-v2">
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
    );
    if (error) return <div style={{ color: 'var(--color-error)', padding: 32, textAlign: 'center' }}>⚠ {error}</div>;

    return (
        <div className="animate-fade-in">
            <div className="wow-section-title">{t('teams.title')}</div>
            {teams.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>{t('teams.empty')}</p>
            ) : (
                <div className="teams-grid-v2">
                    {teams.map(team => (
                        <TeamCard key={team.id} team={team} players={players} clanWars={clanWars} onOpenDraft={onOpenDraft} />
                    ))}
                </div>
            )}
        </div>
    );
}
