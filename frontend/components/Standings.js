// Standings — таблица рейтинга игроков + рейтинг команд по клан-варам

const RACE_KEYS   = [null, 1, 2, 4, 8];
const RACE_IMG    = { 0: '/images/random.svg', 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };

// ── Рейтинг команд по победам в клан-варах ────────────────────────────────────
function TeamStandings() {
    useLang();
    const [teams,    setTeams]    = React.useState([]);
    const [wars,     setWars]     = React.useState([]);
    const [players,  setPlayers]  = React.useState([]);
    const [loading,  setLoading]  = React.useState(true);
    const [error,    setError]    = React.useState(null);

    React.useEffect(() => {
        Promise.all([
            fetch('/api/teams').then(r => r.json()),
            fetch('/api/clan-wars').then(r => r.json()),
            fetch('/api/players').then(r => r.json()),
        ])
            .then(([tm, cw, pl]) => {
                setTeams(Array.isArray(tm) ? tm : []);
                setWars(Array.isArray(cw) ? cw : []);
                setPlayers(Array.isArray(pl) ? pl : []);
                setLoading(false);
            })
            .catch(err => { setError(err.message); setLoading(false); });
    }, []);

    if (loading) return (
        <div>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 'var(--radius-sm)' }} />)}
        </div>
    );
    if (error) return <div style={{ color: 'var(--color-error)', padding: 32 }}>⚠ {error}</div>;

    const completed = wars.filter(cw => cw.status === 'completed' && cw.winner);

    // Compute stats for each team
    const rows = teams.map(team => {
        const name = team.name.toLowerCase();
        const myWars = completed.filter(cw =>
            cw.teamA?.name?.toLowerCase() === name ||
            cw.teamB?.name?.toLowerCase() === name
        );
        const wins = myWars.filter(cw =>
            (cw.teamA?.name?.toLowerCase() === name && cw.winner === 'a') ||
            (cw.teamB?.name?.toLowerCase() === name && cw.winner === 'b')
        ).length;
        const losses = myWars.length - wins;
        // Total internal match wins across all clan wars
        const matchWins = myWars.reduce((sum, cw) => {
            const isA = cw.teamA?.name?.toLowerCase() === name;
            return sum + (isA ? (cw.clanWarScore?.a || 0) : (cw.clanWarScore?.b || 0));
        }, 0);
        const matchLosses = myWars.reduce((sum, cw) => {
            const isA = cw.teamA?.name?.toLowerCase() === name;
            return sum + (isA ? (cw.clanWarScore?.b || 0) : (cw.clanWarScore?.a || 0));
        }, 0);
        const captain = players.find(p => p.id === team.captainId);
        const roster  = players.filter(p => p.teamId === team.id).length;
        return { team, wins, losses, matchWins, matchLosses, played: myWars.length, captain, roster };
    })
    // Sort: clan war wins desc, then match wins desc
    .sort((a, b) => b.wins - a.wins || b.matchWins - a.matchWins);

    const rankIcon = i => i === 0 ? 'I' : i === 1 ? 'II' : i === 2 ? 'III' : i + 1;
    const rankClass = i => i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';

    return (
        <div className="standings-table-wrap" style={{ marginTop: 'var(--spacing-lg)' }}>
            <table className="standings-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Команда</th>
                        <th>И</th>
                        <th style={{ color: 'var(--color-success)' }}>КВ В</th>
                        <th style={{ color: 'var(--color-error)' }}>КВ П</th>
                        <th style={{ color: 'var(--color-accent-secondary)' }}>Матчи</th>
                        <th>Состав</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>Нет данных</td></tr>
                    )}
                    {rows.map((row, i) => (
                        <tr key={row.team.id}>
                            <td className={`col-rank ${rankClass(i)}`}>{rankIcon(i)}</td>
                            <td className="col-name">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {row.team.logo
                                        ? <img src={row.team.logo} alt="" style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', objectFit: 'contain', border: '1px solid rgba(212,175,55,0.3)' }} />
                                        : <span style={{ fontSize: '1.3em' }}>{row.team.emoji || '🛡'}</span>
                                    }
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{row.team.name}</div>
                                        {row.captain && (
                                            <div style={{ fontSize: '0.75em', color: 'var(--color-text-muted)' }}>
                                                👑 {row.captain.name || row.captain.battleTag}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td style={{ color: 'var(--color-text-muted)' }}>{row.played}</td>
                            <td className="col-wins">{row.wins}</td>
                            <td className="col-losses">{row.losses}</td>
                            <td style={{ color: 'var(--color-accent-secondary)', fontWeight: 600 }}>
                                {row.matchWins}<span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> : </span>{row.matchLosses}
                            </td>
                            <td style={{ color: 'var(--color-text-muted)', fontSize: '0.88em' }}>{row.roster} чел.</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78em', marginTop: 10, padding: '0 4px' }}>
                КВ В/П — победы/поражения в клан-варах. Матчи — суммарный счёт внутренних матчей.
            </div>
        </div>
    );
}

// ── Драфт-пул: игроки с draftAvailable, разбитые по тирам ─────────────────────
function DraftPoolStandings() {
    useLang();
    const [players, setPlayers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError]     = React.useState(null);

    React.useEffect(() => {
        fetch('/api/players')
            .then(r => r.json())
            .then(data => { setPlayers(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(err => { setError(err.message); setLoading(false); });
    }, []);

    if (loading) return (
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, marginBottom: 12, borderRadius: 'var(--radius-md)' }} />)}
        </div>
    );
    if (error) return <div style={{ color: 'var(--color-error)', padding: 32 }}>⚠ {error}</div>;

    // Filter only draft-available players
    const draftPlayers = players.filter(p => p.draftAvailable);

    // Tier calculation: same logic as backend
    function getEffectiveTier(p) {
        if (p.tierOverride) return p.tierOverride;
        const mmr = p.stats?.mmr || p.currentMmr || 0;
        if (mmr >= 1700) return 3;
        if (mmr >= 1400) return 2;
        if (mmr >= 1000) return 1;
        return 0;
    }

    const tierS = draftPlayers.filter(p => getEffectiveTier(p) === 3).sort((a, b) => (b.stats?.mmr || b.currentMmr || 0) - (a.stats?.mmr || a.currentMmr || 0));
    const tierA = draftPlayers.filter(p => getEffectiveTier(p) === 2).sort((a, b) => (b.stats?.mmr || b.currentMmr || 0) - (a.stats?.mmr || a.currentMmr || 0));
    const tierB = draftPlayers.filter(p => getEffectiveTier(p) === 1).sort((a, b) => (b.stats?.mmr || b.currentMmr || 0) - (a.stats?.mmr || a.currentMmr || 0));

    if (draftPlayers.length === 0) {
        return <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>{t('standings.draftpool.empty')}</p>;
    }

    const raceImg = { 0: '/images/random.svg', 1: '/images/human.jpg', 2: '/images/orc.jpg', 4: '/images/nightelf.jpg', 8: '/images/undead.jpg' };
    const raceAbbr = { 0: 'Rnd', 1: 'Люди', 2: 'Орки', 4: 'Эльфы', 8: 'Нежить' };
    const raceColor = { 1: '#a8d8ea', 2: '#ff7043', 4: '#66bb6a', 8: '#b0b0b0' };

    function renderPlayerCard(p) {
        const race = p.mainRace || p.race;
        const portrait = p.selectedPortrait;
        const mmr = p.stats?.mmr || p.currentMmr || 0;
        const stats = p.stats;
        const avatarSrc = portrait || (race && raceImg[race]) || null;

        return (
            <div key={p.id || p.battleTag} className="draft-pool-player-card">
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    {portrait ? (
                        <img src={portrait} alt="" style={{
                            width: 40, height: 40, borderRadius: '50%', objectFit: 'cover',
                            border: '2px solid var(--color-accent-primary)',
                        }} />
                    ) : (
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'var(--color-bg-lighter)',
                            border: '2px solid rgba(212,175,55,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden',
                        }}>
                            {race && raceImg[race]
                                ? <img src={raceImg[race]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
                                : <span style={{ fontSize: '1.2em', color: 'var(--color-text-muted)' }}>👤</span>
                            }
                        </div>
                    )}
                    {race && raceImg[race] && portrait && (
                        <img src={raceImg[race]} alt="" style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 14, height: 14, borderRadius: '50%', objectFit: 'cover',
                            border: '1.5px solid var(--color-bg-card, #1a1a2e)',
                        }} />
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.9em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name || p.battleTag?.split('#')[0]}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.battleTag}
                        {race && raceAbbr[race] && (
                            <span style={{ marginLeft: 5, color: raceColor[race] || 'var(--color-text-muted)' }}>
                                · {raceAbbr[race]}
                            </span>
                        )}
                    </div>
                </div>
                <div className="team-player-stats" style={{ flexShrink: 0 }}>
                    <div className="team-stat-cell">
                        <span className="team-stat-label">MMR</span>
                        <span className="team-stat-val" style={{ color: 'var(--color-accent-secondary)' }}>{mmr || '—'}</span>
                    </div>
                    {stats && <>
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
                    </>}
                </div>
            </div>
        );
    }

    function renderTierColumn(tierName, tierRange, players, tierClass) {
        return (
            <div className={`draft-pool-tier-col ${tierClass}`}>
                <div className="draft-pool-tier-header">
                    <div style={{ fontWeight: 800, fontSize: '0.95em', letterSpacing: 1, textTransform: 'uppercase' }}>
                        {tierName}
                    </div>
                    <div style={{ fontSize: '0.75em', color: 'var(--color-accent-secondary)', marginTop: 2 }}>
                        {tierRange}
                    </div>
                    <div style={{ fontSize: '0.75em', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {players.length} {t('standings.draftpool.players_count')}
                    </div>
                </div>
                <div className="draft-pool-tier-players">
                    {players.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85em', textAlign: 'center', padding: '16px 0' }}>—</p>
                    ) : (
                        players.map(renderPlayerCard)
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85em', marginBottom: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('standings.draftpool.total')}: <strong style={{ color: 'var(--color-accent-primary)' }}>{draftPlayers.length}</strong></span>
            </div>
            <div className="draft-pool-tiers-grid">
                {renderTierColumn(t('standings.draftpool.tier_s'), t('standings.draftpool.tier_s_range'), tierS, 'tier-s')}
                {renderTierColumn(t('standings.draftpool.tier_a'), t('standings.draftpool.tier_a_range'), tierA, 'tier-a')}
                {renderTierColumn(t('standings.draftpool.tier_b'), t('standings.draftpool.tier_b_range'), tierB, 'tier-b')}
            </div>
        </div>
    );
}

// ── Рейтинг игроков (оригинал) ────────────────────────────────────────────────
function Standings() {
    useLang();
    const [mode,       setMode]       = React.useState('players'); // 'players' | 'teams' | 'draftpool'
    const [players,    setPlayers]    = React.useState([]);
    const [loading,    setLoading]    = React.useState(true);
    const [error,      setError]      = React.useState(null);
    const [raceFilter, setRaceFilter] = React.useState(null);

    React.useEffect(() => {
        fetch('/api/players')
            .then(r => r.json())
            .then(data => { setPlayers(data); setLoading(false); })
            .catch(err  => { setError(err.message); setLoading(false); });
    }, []);

    if (error) return <div style={{ color: 'var(--color-error)', padding: 32, textAlign: 'center' }}>⚠ {error}</div>;

    // Строим строки таблицы
    const rows = players.flatMap(p => {
        const s = p.stats;
        if (!s) return [];
        if (raceFilter !== null) {
            const rs = (s.raceStats || []).find(r => r.race === raceFilter);
            if (!rs) return [];
            return [{ player: p, race: raceFilter, wins: rs.wins, losses: rs.losses, points: rs.points, mmr: rs.mmr }];
        }
        return [{ player: p, race: null, wins: s.wins, losses: s.losses, points: s.points, mmr: s.mmr }];
    }).sort((a, b) => b.points - a.points);

    const rankClass = i => i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
    const rankIcon  = i => i === 0 ? 'I' : i === 1 ? 'II' : i === 2 ? 'III' : i + 1;

    return (
        <div className="animate-fade-in">
            {/* WoW-style centered title */}
            <div className="wow-section-title">{t('standings.title')}</div>

            {/* Single row: race filters (left) + mode buttons (right) */}
            <div className="wow-filter-bar" style={{ justifyContent: 'space-between' }}>
                {/* Race filter — only visible in players mode */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {mode === 'players' && RACE_KEYS.map(r => (
                        <button
                            key={String(r)}
                            className={`wow-btn${raceFilter === r ? ' active' : ''}`}
                            onClick={() => setRaceFilter(r)}
                        >
                            {r === null ? t('race.all') : t(`race.${r}`)}
                        </button>
                    ))}
                </div>
                {/* Mode toggle */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                        className={`wow-btn${mode === 'players' ? ' active' : ''}`}
                        onClick={() => setMode('players')}
                    >
                        Игроки
                    </button>
                    <button
                        className={`wow-btn${mode === 'teams' ? ' active' : ''}`}
                        onClick={() => setMode('teams')}
                    >
                        Команды
                    </button>
                    <button
                        className={`wow-btn${mode === 'draftpool' ? ' active' : ''}`}
                        onClick={() => setMode('draftpool')}
                    >
                        {t('standings.mode.draftpool')}
                    </button>
                </div>
            </div>

            {mode === 'teams' ? (
                <TeamStandings />
            ) : mode === 'draftpool' ? (
                <DraftPoolStandings />
            ) : (
                <>

                    {loading ? (
                        <div>
                            {[1,2,3,4,5].map(i => (
                                <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 'var(--radius-sm)' }} />
                            ))}
                        </div>
                    ) : rows.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>{t('standings.empty')}</p>
                    ) : (
                        <div className="standings-table-wrap">
                            <table className="standings-table">
                                <thead>
                                    <tr>
                                        <th>{t('standings.rank')}</th>
                                        <th>{t('standings.player')}</th>
                                        <th>{t('standings.race')}</th>
                                        <th>{t('standings.mmr')}</th>
                                        <th>{t('standings.wins')}</th>
                                        <th>{t('standings.losses')}</th>
                                        <th>{t('standings.points')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => {
                                        const portrait = row.player.selectedPortrait;
                                        const raceImg  = RACE_IMG[row.race || row.player.mainRace || row.player.race];
                                        const avatarSrc = portrait || raceImg || null;
                                        return (
                                            <tr key={`${row.player.battleTag}-${row.race}`}>
                                                <td className={`col-rank ${rankClass(i)}`}>{rankIcon(i)}</td>
                                                <td className="col-name" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {avatarSrc && (
                                                        <img src={avatarSrc} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(212,175,55,0.4)' }} />
                                                    )}
                                                    <span>{row.player.name || row.player.battleTag}</span>
                                                </td>
                                                <td style={{ color: 'var(--color-text-muted)' }}>
                                                    {row.race !== null ? t(`race.${row.race}`) : '—'}
                                                </td>
                                                <td style={{ color: 'var(--color-accent-secondary)', fontWeight: 600 }}>
                                                    {row.mmr || '—'}
                                                </td>
                                                <td className="col-wins">{row.wins}</td>
                                                <td className="col-losses">{row.losses}</td>
                                                <td className="col-points">{row.points}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
